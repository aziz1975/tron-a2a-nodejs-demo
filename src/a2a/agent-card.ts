import type { AgentCard } from "@a2a-js/sdk";
import { config } from "../config.js";

const jsonRpcUrl = `${config.agentBaseUrl}/a2a/jsonrpc`;
const restUrl = `${config.agentBaseUrl}/a2a/rest`;

export const tronAgentCard: AgentCard = {
  name: "TRON Testnet Operations Agent",
  description:
    "Prepares, broadcasts, and verifies TRON Nile/Shasta testnet TRX transfers for A2A clients.",
  protocolVersion: "0.3.0",
  version: "0.1.0",
  url: jsonRpcUrl,
  preferredTransport: "JSONRPC",
  provider: {
    organization: "Local Demo",
    url: config.agentBaseUrl
  },
  capabilities: {
    pushNotifications: false,
    stateTransitionHistory: true,
    streaming: true
  },
  defaultInputModes: ["text/plain", "application/json"],
  defaultOutputModes: ["text/plain", "application/json"],
  additionalInterfaces: [
    { url: jsonRpcUrl, transport: "JSONRPC" },
    { url: restUrl, transport: "HTTP+JSON" }
  ],
  skills: [
    {
      id: "get_tron_balance",
      name: "Get TRON Balance",
      description: "Returns the TRX balance for a supplied TRON address or the configured demo wallet.",
      tags: ["tron", "wallet", "balance"],
      examples: ["balance", "balance TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"]
    },
    {
      id: "prepare_trx_transfer",
      name: "Prepare TRX Transfer",
      description: "Builds an unsigned TRX transfer proposal and returns it as a structured artifact.",
      tags: ["tron", "transfer", "proposal"],
      examples: ["prepare transfer 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"]
    },
    {
      id: "broadcast_trx_transfer",
      name: "Broadcast TRX Transfer",
      description:
        "Signs and broadcasts a TRX transfer from the configured testnet wallet when explicitly requested.",
      tags: ["tron", "transfer", "broadcast"],
      examples: ["broadcast 1 TRX to TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"]
    },
    {
      id: "verify_transaction",
      name: "Verify Transaction",
      description: "Looks up a TRON transaction and receipt by transaction id.",
      tags: ["tron", "transaction", "receipt"],
      examples: ["verify 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"]
    }
  ]
};
