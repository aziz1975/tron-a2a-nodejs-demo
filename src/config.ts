import dotenv from "dotenv";

dotenv.config();

export type AppConfig = {
  agentBaseUrl: string;
  port: number;
  tronFullHost: string;
  tronNetwork: string;
  tronPrivateKey?: string;
  tronProApiKey?: string;
};

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("PORT must be a positive integer.");
}

export const config: AppConfig = {
  agentBaseUrl: process.env.AGENT_BASE_URL ?? `http://localhost:${port}`,
  port,
  tronFullHost: process.env.TRON_FULL_HOST ?? "https://nile.trongrid.io",
  tronNetwork: process.env.TRON_NETWORK ?? "nile",
  tronPrivateKey: emptyToUndefined(process.env.TRON_PRIVATE_KEY),
  tronProApiKey: emptyToUndefined(process.env.TRON_PRO_API_KEY)
};

function emptyToUndefined(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
}
