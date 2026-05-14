import { TronWeb } from "tronweb";
import { config } from "../config.js";

export function createTronWeb(): TronWeb {
  const headers = config.tronProApiKey
    ? { "TRON-PRO-API-KEY": config.tronProApiKey }
    : undefined;

  return new TronWeb({
    fullHost: config.tronFullHost,
    headers,
    privateKey: config.tronPrivateKey
  });
}

export function getConfiguredAddress(tronWeb: TronWeb): string | undefined {
  return tronWeb.defaultAddress.base58 || undefined;
}
