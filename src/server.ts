import express from "express";
import { AGENT_CARD_PATH } from "@a2a-js/sdk";
import { DefaultRequestHandler, InMemoryTaskStore } from "@a2a-js/sdk/server";
import { agentCardHandler, jsonRpcHandler, restHandler, UserBuilder } from "@a2a-js/sdk/server/express";
import { tronAgentCard } from "./a2a/agent-card.js";
import { TronAgentExecutor } from "./a2a/tron-agent.js";
import { config } from "./config.js";

const requestHandler = new DefaultRequestHandler(
  tronAgentCard,
  new InMemoryTaskStore(),
  new TronAgentExecutor()
);

const app = express();

app.get("/", (_req, res) => {
  res.json({
    name: tronAgentCard.name,
    agentCard: `/${AGENT_CARD_PATH}`,
    jsonRpc: "/a2a/jsonrpc",
    rest: "/a2a/rest"
  });
});

app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({ agentCardProvider: requestHandler }));
app.use("/a2a/jsonrpc", jsonRpcHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));
app.use("/a2a/rest", restHandler({ requestHandler, userBuilder: UserBuilder.noAuthentication }));

app.listen(config.port, () => {
  console.log(`TRON A2A agent listening on ${config.agentBaseUrl}`);
  console.log(`Agent Card: ${config.agentBaseUrl}/${AGENT_CARD_PATH}`);
});
