import { randomUUID } from "node:crypto";
import type {
  Artifact,
  Message,
  MessageSendParams,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent
} from "@a2a-js/sdk";
import { ClientFactory } from "@a2a-js/sdk/client";

const args = process.argv.slice(2);
const stream = args.includes("--stream");
const messageText = args.filter((arg) => arg !== "--stream").join(" ").trim() || "balance";
const baseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:4000";

const factory = new ClientFactory();
const client = await factory.createFromUrl(baseUrl);

const params: MessageSendParams = {
  message: {
    kind: "message",
    messageId: randomUUID(),
    role: "user",
    parts: [{ kind: "text", text: messageText }]
  }
};

if (stream) {
  for await (const event of client.sendMessageStream(params)) {
    printEvent(event);
  }
} else {
  const result = await client.sendMessage(params);
  printEvent(result);
}

function printEvent(event: Message | Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent): void {
  switch (event.kind) {
    case "message":
      printMessage(event);
      return;
    case "task":
      printTask(event);
      return;
    case "status-update":
      console.log(`[${event.status.state}] ${extractText(event.status.message)}`);
      return;
    case "artifact-update":
      printArtifact(event.artifact);
      return;
  }
}

function printTask(task: Task): void {
  console.log(`[${task.status.state}] ${extractText(task.status.message)}`);

  for (const artifact of task.artifacts ?? []) {
    printArtifact(artifact);
  }
}

function printMessage(message: Message): void {
  console.log(extractText(message));

  for (const part of message.parts) {
    if (part.kind === "data") {
      console.log(JSON.stringify(part.data, null, 2));
    }
  }
}

function printArtifact(artifact: Artifact): void {
  console.log(`\nArtifact: ${artifact.name ?? artifact.artifactId}`);

  for (const part of artifact.parts) {
    if (part.kind === "text") {
      console.log(part.text);
    }

    if (part.kind === "data") {
      console.log(JSON.stringify(part.data, null, 2));
    }
  }
}

function extractText(message: Message | undefined): string {
  if (!message) {
    return "";
  }

  return message.parts
    .filter((part) => part.kind === "text")
    .map((part) => part.text)
    .join("\n");
}
