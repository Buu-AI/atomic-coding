import { createAgentUIStreamResponse } from "ai";
import type { UIMessage } from "ai";
import { createAtomicAgent } from "@/lib/agent";
import { DEFAULT_MODEL } from "@/lib/constants";
import { getChatMessages, saveChatMessages } from "@/lib/api";

export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, model, gameId, sessionId } = body;

  const selectedModel = model ?? DEFAULT_MODEL;

  console.log("[chat] POST request", {
    model: selectedModel,
    gameId,
    sessionId,
    clientMessageCount: messages?.length ?? 0,
  });

  // Build the full conversation from DB + new client messages
  let uiMessages: UIMessage[] = messages ?? [];

  if (sessionId) {
    try {
      const dbMessages = await getChatMessages(
        // We need the game name, but we have gameId. The client sends messages
        // with the full history, so we merge: DB history is the base,
        // then append any messages the client has that aren't in the DB.
        // For now, use the game name from the first message's context.
        // Actually, we need gameName for the API call. Let's get it from body.
        body.gameName ?? "",
        sessionId
      );

      if (dbMessages.length > 0) {
        const dbUIMessages: UIMessage[] = dbMessages.map((m) => ({
          id: m.message_id,
          role: m.role as "user" | "assistant",
          parts: m.parts as UIMessage["parts"],
        }));

        // Use DB as base, then append any new messages from client
        // (the latest user message that hasn't been saved yet)
        const dbIds = new Set(dbMessages.map((m) => m.message_id));
        const newFromClient = (messages ?? []).filter(
          (m: UIMessage) => !dbIds.has(m.id)
        );

        uiMessages = [...dbUIMessages, ...newFromClient];
        console.log("[chat] Loaded history from DB", {
          dbCount: dbMessages.length,
          newFromClient: newFromClient.length,
          total: uiMessages.length,
        });
      }
    } catch (err) {
      console.warn("[chat] Failed to load session history, using client messages:", err);
    }
  }

  const { agent, cleanup } = await createAtomicAgent(selectedModel, gameId);
  console.log("[chat] Agent created, starting stream");

  const response = await createAgentUIStreamResponse({
    agent,
    uiMessages,
  });

  // Pipe through a pass-through so we can clean up MCP clients
  // only AFTER the stream is fully consumed by the client.
  const originalBody = response.body!;
  const transform = new TransformStream();

  originalBody.pipeTo(transform.writable).then(
    () => {
      console.log("[chat] Stream finished, closing MCP clients...");
      cleanup().then(() => console.log("[chat] MCP clients closed"));
    },
    (err: unknown) => {
      console.error("[chat] Stream error:", err);
      cleanup().then(() =>
        console.log("[chat] MCP clients closed after error")
      );
    }
  );

  return new Response(transform.readable, {
    headers: response.headers,
    status: response.status,
  });
}
