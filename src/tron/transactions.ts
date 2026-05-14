import { config } from "../config.js";
import { assertSafeSunNumber, formatSunToTrx, parseTrxToSun } from "./amount.js";
import { createTronWeb, getConfiguredAddress } from "./client.js";

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
  const tronWeb = createTronWeb();
  const from = getConfiguredAddress(tronWeb);

  if (!from) {
    throw new Error("TRON_PRIVATE_KEY is required to prepare a transfer from the demo wallet.");
  }

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

export async function broadcastTrxTransfer(to: string, amountTrx: string): Promise<BroadcastResult> {
  if (!config.tronPrivateKey) {
    throw new Error("TRON_PRIVATE_KEY is required to broadcast a transfer.");
  }

  const proposal = await prepareTrxTransfer(to, amountTrx);
  const tronWeb = createTronWeb();
  const signedTransaction = await tronWeb.trx.sign(proposal.unsignedTransaction as never);
  const broadcastResult = await tronWeb.trx.sendRawTransaction(signedTransaction as never);
  const txId = extractTransactionId(signedTransaction, broadcastResult);

  return {
    ...proposal,
    type: "trx_transfer_broadcast",
    txId,
    broadcastResult
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
