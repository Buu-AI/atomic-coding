import { getSupabaseClient } from "../supabase-client.ts";

// =============================================================================
// Types
// =============================================================================

export interface ChatSession {
  id: string;
  game_id: string;
  title: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  message_id: string;
  role: "user" | "assistant";
  parts: unknown[];
  created_at: string;
}

// =============================================================================
// Sessions
// =============================================================================

/** List chat sessions for a game, most recent first. */
export async function listSessions(
  gameId: string,
  limit = 20,
): Promise<ChatSession[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("chat_sessions")
    .select("*")
    .eq("game_id", gameId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`listSessions: ${error.message}`);
  return data ?? [];
}

/** Create a new chat session. */
export async function createSession(
  gameId: string,
  model?: string,
  title?: string,
): Promise<ChatSession> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("chat_sessions")
    .insert({ game_id: gameId, model, title })
    .select()
    .single();

  if (error) throw new Error(`createSession: ${error.message}`);
  return data;
}

/** Get a single session by ID. */
export async function getSession(sessionId: string): Promise<ChatSession> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("chat_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) throw new Error(`getSession: ${error.message}`);
  return data;
}

/** Update session title. */
export async function updateSessionTitle(
  sessionId: string,
  title: string,
): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from("chat_sessions")
    .update({ title })
    .eq("id", sessionId);

  if (error) throw new Error(`updateSessionTitle: ${error.message}`);
}

/** Delete a session and all its messages. */
export async function deleteSession(sessionId: string): Promise<void> {
  const sb = getSupabaseClient();
  const { error } = await sb
    .from("chat_sessions")
    .delete()
    .eq("id", sessionId);

  if (error) throw new Error(`deleteSession: ${error.message}`);
}

// =============================================================================
// Messages
// =============================================================================

/** Get all messages for a session, ordered chronologically. */
export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  const sb = getSupabaseClient();
  const { data, error } = await sb
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getMessages: ${error.message}`);
  return data ?? [];
}

/** Save messages in batch (upsert by message_id to avoid duplicates). */
export async function saveMessages(
  sessionId: string,
  messages: { message_id: string; role: string; parts: unknown[] }[],
): Promise<void> {
  if (messages.length === 0) return;

  const sb = getSupabaseClient();
  const rows = messages.map((m) => ({
    session_id: sessionId,
    message_id: m.message_id,
    role: m.role,
    parts: m.parts,
  }));

  const { error } = await sb
    .from("chat_messages")
    .upsert(rows, { onConflict: "session_id,message_id" });

  if (error) throw new Error(`saveMessages: ${error.message}`);
}
