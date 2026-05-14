import { AGENT_CARD_PATH } from "@a2a-js/sdk";

const baseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:4000";
const response = await fetch(`${baseUrl}/${AGENT_CARD_PATH}`);

if (!response.ok) {
  throw new Error(`Agent Card request failed: ${response.status} ${response.statusText}`);
}

console.log(JSON.stringify(await response.json(), null, 2));
