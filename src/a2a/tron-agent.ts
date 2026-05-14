import { randomUUID } from "node:crypto";
import type {
  Artifact,
  DataPart,
  Message,
  Part,
  Task,
  TaskArtifactUpdateEvent,
  TaskState,
  TaskStatusUpdateEvent,
  TextPart
} from "@a2a-js/sdk";
import type { AgentExecutor, ExecutionEventBus, RequestContext } from "@a2a-js/sdk/server";
import { broadcastTrxTransfer, prepareTrxTransfer, verifyTransaction } from "../tron/transactions.js";
import { getBalance } from "../tron/wallet.js";

type TronAction =
  | { action: "get_tron_balance"; address?: string }
  | { action: "prepare_trx_transfer"; to: string; amountTrx: string }
  | { action: "broadcast_trx_transfer"; to: string; amountTrx: string }
  | { action: "verify_transaction"; txId: string }
  | { action: "help" };

type ActionResult = {
  summary: string;
  artifactName: string;
  artifactDescription: string;
  data: Record<string, unknown>;
};

const tronAddressPattern = /\bT[1-9A-HJ-NP-Za-km-z]{33}\b/;
const txIdPattern = /\b[0-9a-fA-F]{64}\b/;

export class TronAgentExecutor implements AgentExecutor {
  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const { taskId, contextId } = requestContext;

    try {
      if (!requestContext.task) {
        const initialTask: Task = {
          kind: "task",
          id: taskId,
          contextId,
          status: {
            state: "submitted",
            timestamp: new Date().toISOString(),
            message: createMessage("TRON request submitted.", taskId, contextId)
          },
          history: [requestContext.userMessage]
        };

        eventBus.publish(initialTask);
      }

      publishStatus(eventBus, taskId, contextId, "working", "Handling TRON request.", false);

      const action = parseAction(requestContext.userMessage);
      const result = await runAction(action);

      publishArtifact(eventBus, taskId, contextId, {
        artifactId: randomUUID(),
        name: result.artifactName,
        description: result.artifactDescription,
        parts: [
          { kind: "text", text: result.summary },
          { kind: "data", data: result.data }
        ]
      });

      publishStatus(eventBus, taskId, contextId, "completed", result.summary, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown TRON agent error.";
      publishStatus(eventBus, taskId, contextId, "failed", message, true);
    } finally {
      eventBus.finished();
    }
  }

  async cancelTask(taskId: string, eventBus: ExecutionEventBus): Promise<void> {
    eventBus.publish({
      kind: "status-update",
      taskId,
      contextId: taskId,
      final: true,
      status: {
        state: "canceled",
        timestamp: new Date().toISOString(),
        message: createMessage("Task canceled.", taskId, taskId)
      }
    });
    eventBus.finished();
  }
}

function parseAction(message: Message): TronAction {
  const dataAction = parseDataAction(message.parts);

  if (dataAction) {
    return dataAction;
  }

  const text = message.parts
    .filter((part): part is TextPart => part.kind === "text")
    .map((part) => part.text)
    .join(" ")
    .trim();

  if (!text) {
    return { action: "help" };
  }

  const lower = text.toLowerCase();

  if (lower.includes("balance")) {
    return { action: "get_tron_balance", address: text.match(tronAddressPattern)?.[0] };
  }

  if (lower.startsWith("verify") || lower.includes("transaction")) {
    const txId = text.match(txIdPattern)?.[0];

    if (!txId) {
      throw new Error("Provide a 64-character transaction id to verify.");
    }

    return { action: "verify_transaction", txId };
  }

  const transferMatch = /(?:prepare\s+)?(?:transfer|send)\s+([0-9]+(?:\.[0-9]{1,6})?)\s*(?:trx)?\s+(?:to\s+)?(T[1-9A-HJ-NP-Za-km-z]{33})/i.exec(
    text
  );

  if (transferMatch) {
    const amountTrx = transferMatch[1];
    const to = transferMatch[2];

    if (!amountTrx || !to) {
      throw new Error("Transfer requests require an amount and recipient address.");
    }

    return {
      action: "prepare_trx_transfer",
      amountTrx,
      to
    };
  }

  const broadcastMatch = /broadcast\s+([0-9]+(?:\.[0-9]{1,6})?)\s*(?:trx)?\s+(?:to\s+)?(T[1-9A-HJ-NP-Za-km-z]{33})/i.exec(
    text
  );

  if (broadcastMatch) {
    const amountTrx = broadcastMatch[1];
    const to = broadcastMatch[2];

    if (!amountTrx || !to) {
      throw new Error("Broadcast requests require an amount and recipient address.");
    }

    return {
      action: "broadcast_trx_transfer",
      amountTrx,
      to
    };
  }

  return { action: "help" };
}

function parseDataAction(parts: Part[]): TronAction | undefined {
  const dataPart = parts.find((part): part is DataPart => part.kind === "data");
  const data = dataPart?.data;

  if (!data || typeof data.action !== "string") {
    return undefined;
  }

  switch (data.action) {
    case "get_tron_balance":
      return {
        action: "get_tron_balance",
        address: typeof data.address === "string" ? data.address : undefined
      };
    case "prepare_trx_transfer":
    case "broadcast_trx_transfer":
      if (typeof data.to !== "string" || typeof data.amountTrx !== "string") {
        throw new Error(`${data.action} requires string fields: to, amountTrx.`);
      }

      return {
        action: data.action,
        to: data.to,
        amountTrx: data.amountTrx
      };
    case "verify_transaction":
      if (typeof data.txId !== "string") {
        throw new Error("verify_transaction requires a string txId field.");
      }

      return { action: "verify_transaction", txId: data.txId };
    default:
      throw new Error(`Unsupported action: ${data.action}`);
  }
}

async function runAction(action: TronAction): Promise<ActionResult> {
  switch (action.action) {
    case "get_tron_balance": {
      const balance = await getBalance(action.address);
      return {
        summary: `${balance.address} has ${balance.balanceTrx} TRX.`,
        artifactName: "TRON balance",
        artifactDescription: "TRX balance for the requested address.",
        data: balance
      };
    }
    case "prepare_trx_transfer": {
      const proposal = await prepareTrxTransfer(action.to, action.amountTrx);
      return {
        summary: `Prepared ${proposal.amountTrx} TRX transfer from ${proposal.from} to ${proposal.to}. Nothing was broadcast.`,
        artifactName: "TRX transfer proposal",
        artifactDescription: "Unsigned TRX transfer proposal.",
        data: proposal as unknown as Record<string, unknown>
      };
    }
    case "broadcast_trx_transfer": {
      const broadcast = await broadcastTrxTransfer(action.to, action.amountTrx);
      return {
        summary: `Broadcast ${broadcast.amountTrx} TRX transfer. Transaction id: ${broadcast.txId}.`,
        artifactName: "TRX broadcast result",
        artifactDescription: "Signed and broadcast TRX transfer result.",
        data: broadcast as unknown as Record<string, unknown>
      };
    }
    case "verify_transaction": {
      const verification = await verifyTransaction(action.txId);
      return {
        summary: verification.found
          ? `Found transaction ${verification.txId}.`
          : `Transaction ${verification.txId} was not found on the configured node.`,
        artifactName: "TRON transaction verification",
        artifactDescription: "Transaction and receipt lookup result.",
        data: verification as unknown as Record<string, unknown>
      };
    }
    case "help":
      return {
        summary:
          "Try: balance, balance <address>, prepare transfer 1 TRX to <address>, broadcast 1 TRX to <address>, or verify <txid>.",
        artifactName: "TRON agent help",
        artifactDescription: "Supported TRON A2A demo commands.",
        data: {
          examples: [
            "balance",
            "balance TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "prepare transfer 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "broadcast 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
            "verify 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
          ]
        }
      };
  }
}

function publishStatus(
  eventBus: ExecutionEventBus,
  taskId: string,
  contextId: string,
  state: TaskState,
  text: string,
  final: boolean
): void {
  const event: TaskStatusUpdateEvent = {
    kind: "status-update",
    taskId,
    contextId,
    final,
    status: {
      state,
      timestamp: new Date().toISOString(),
      message: createMessage(text, taskId, contextId)
    }
  };

  eventBus.publish(event);
}

function publishArtifact(
  eventBus: ExecutionEventBus,
  taskId: string,
  contextId: string,
  artifact: Artifact
): void {
  const event: TaskArtifactUpdateEvent = {
    kind: "artifact-update",
    taskId,
    contextId,
    artifact,
    lastChunk: true
  };

  eventBus.publish(event);
}

function createMessage(text: string, taskId: string, contextId: string): Message {
  return {
    kind: "message",
    messageId: randomUUID(),
    role: "agent",
    taskId,
    contextId,
    parts: [{ kind: "text", text }]
  };
}
