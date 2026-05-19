import { config } from "../config.js";
import { getAgentWalletAddress, resolveTronWallet } from "./agent-wallet.js";
import { assertSafeSunNumber, formatSunToTrx, parseTrxToSun } from "./amount.js";
import { createTronWeb } from "./client.js";

export type TransferProposal = {
  type: "trx_transfer_proposal";
  network: string;
  fullHost: string;
  from: string;
  to: string;
  amountTrx: string;
  amountSun: string;
  unsignedTransaction: unknown;
};

export type BroadcastResult = Omit<TransferProposal, "type"> & {
  type: "trx_transfer_broadcast";
  txId: string;
  broadcastResult: unknown;
};

export type TransactionVerification = {
  txId: string;
  transaction?: unknown;
  transactionInfo?: unknown;
  found: boolean;
};

export async function prepareTrxTransfer(to: string, amountTrx: string): Promise<TransferProposal> {
  const from = await getAgentWalletAddress();

  return buildTrxTransfer(to, amountTrx, from);
}

export async function broadcastTrxTransfer(to: string, amountTrx: string): Promise<BroadcastResult> {
  const wallet = await resolveTronWallet();
  const from = await wallet.getAddress();
  const proposal = await buildTrxTransfer(to, amountTrx, from);
  const tronWeb = createTronWeb();
  const signedTransactionJson = await wallet.signTransaction(
    proposal.unsignedTransaction as Record<string, unknown>
  );
  const signedTransaction = JSON.parse(signedTransactionJson) as Record<string, unknown>;
  const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTransaction as never);
  const txId = extractTransactionId(signedTransaction, broadcastResult);

  return {
    ...proposal,
    type: "trx_transfer_broadcast",
    txId,
    broadcastResult
  };
}

async function buildTrxTransfer(
  to: string,
  amountTrx: string,
  from: string
): Promise<TransferProposal> {
  const tronWeb = createTronWeb();

  if (!tronWeb.isAddress(to)) {
    throw new Error(`Invalid recipient TRON address: ${to}`);
  }

  const amountSun = parseTrxToSun(amountTrx);
  const transaction = await tronWeb.transactionBuilder.sendTrx(
    to,
    assertSafeSunNumber(amountSun),
    from
  );

  return {
    type: "trx_transfer_proposal",
    network: config.tronNetwork,
    fullHost: config.tronFullHost,
    from,
    to,
    amountTrx: formatSunToTrx(amountSun),
    amountSun: amountSun.toString(),
    unsignedTransaction: transaction
  };
}

export async function verifyTransaction(txId: string): Promise<TransactionVerification> {
  const tronWeb = createTronWeb();
  const [transaction, transactionInfo] = await Promise.allSettled([
    tronWeb.trx.getTransaction(txId),
    tronWeb.trx.getTransactionInfo(txId)
  ]);

  const transactionValue = transaction.status === "fulfilled" ? transaction.value : undefined;
  const infoValue = transactionInfo.status === "fulfilled" ? transactionInfo.value : undefined;

  return {
    txId,
    transaction: isEmptyObject(transactionValue) ? undefined : transactionValue,
    transactionInfo: isEmptyObject(infoValue) ? undefined : infoValue,
    found: !isEmptyObject(transactionValue) || !isEmptyObject(infoValue)
  };
}

function extractTransactionId(signedTransaction: unknown, broadcastResult: unknown): string {
  const signed = signedTransaction as { txID?: unknown };
  const broadcast = broadcastResult as { txid?: unknown; transaction?: { txID?: unknown } };

  if (typeof signed.txID === "string") {
    return signed.txID;
  }

  if (typeof broadcast.txid === "string") {
    return broadcast.txid;
  }

  if (typeof broadcast.transaction?.txID === "string") {
    return broadcast.transaction.txID;
  }

  return "unknown";
}

function isEmptyObject(value: unknown): boolean {
  return (
    value == null ||
    (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0)
  );
}
