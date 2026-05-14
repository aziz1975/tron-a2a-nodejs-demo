import { createTronWeb, getConfiguredAddress } from "./client.js";
import { formatSunToTrx } from "./amount.js";

export type BalanceResult = {
  address: string;
  balanceSun: string;
  balanceTrx: string;
  networkFullHost: string;
};

export async function getBalance(address?: string): Promise<BalanceResult> {
  const tronWeb = createTronWeb();
  const resolvedAddress = address ?? getConfiguredAddress(tronWeb);

  if (!resolvedAddress) {
    throw new Error("No address provided and TRON_PRIVATE_KEY is not configured.");
  }

  if (!tronWeb.isAddress(resolvedAddress)) {
    throw new Error(`Invalid TRON address: ${resolvedAddress}`);
  }

  const balanceSun = await tronWeb.trx.getBalance(resolvedAddress);

  return {
    address: resolvedAddress,
    balanceSun: balanceSun.toString(),
    balanceTrx: formatSunToTrx(balanceSun),
    networkFullHost: tronWeb.fullNode.host
  };
}

export function validateAddress(address: string): boolean {
  return createTronWeb().isAddress(address);
}
