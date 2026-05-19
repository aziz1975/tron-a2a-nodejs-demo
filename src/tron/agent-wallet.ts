import { resolveWalletProvider, type Wallet } from "@bankofai/agent-wallet";
import { config } from "../config.js";

export function getAgentWalletNetwork(): string {
  const network = config.tronNetwork.trim().toLowerCase();

  return network.startsWith("tron") ? network : `tron:${network}`;
}

export async function resolveTronWallet(): Promise<Wallet> {
  const network = getAgentWalletNetwork();
  const provider = resolveWalletProvider({ network });

  return provider.getActiveWallet(network);
}

export async function getAgentWalletAddress(): Promise<string> {
  const wallet = await resolveTronWallet();

  return wallet.getAddress();
}
