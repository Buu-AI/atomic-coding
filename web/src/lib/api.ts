import { API_BASE } from "./constants";
import type {
  GameWithBuild,
  Game,
  AtomSummary,
  InstalledExternal,
  RegistryEntry,
  BuildSummary,
  ChatSession,
  ChatMessage,
} from "./types";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json();
}

// ── Games ─────────────────────────────────────────────────────────────────────

export async function listGames(): Promise<GameWithBuild[]> {
  return apiFetch("/games");
}

export async function getGame(name: string): Promise<GameWithBuild> {
  return apiFetch(`/games/${encodeURIComponent(name)}`);
}

export async function createGame(
  name: string,
  description?: string
): Promise<Game> {
  return apiFetch("/games", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

export async function getStructure(
  gameName: string,
  typeFilter?: string
): Promise<AtomSummary[]> {
  const qs = typeFilter ? `?type=${typeFilter}` : "";
  return apiFetch(`/games/${encodeURIComponent(gameName)}/structure${qs}`);
}

// ── Externals ─────────────────────────────────────────────────────────────────

export async function listExternals(
  gameName: string
): Promise<InstalledExternal[]> {
  return apiFetch(`/games/${encodeURIComponent(gameName)}/externals`);
}

export async function installExternal(
  gameName: string,
  registryName: string
): Promise<InstalledExternal> {
  return apiFetch(`/games/${encodeURIComponent(gameName)}/externals`, {
    method: "POST",
    body: JSON.stringify({ name: registryName }),
  });
}

export async function uninstallExternal(
  gameName: string,
  extName: string
): Promise<void> {
  await apiFetch(
    `/games/${encodeURIComponent(gameName)}/externals/${encodeURIComponent(extName)}`,
    { method: "DELETE" }
  );
}

export async function listRegistry(): Promise<RegistryEntry[]> {
  return apiFetch("/registry/externals");
}

// ── Builds ────────────────────────────────────────────────────────────────────

export async function listBuilds(
  gameName: string,
  limit = 20
): Promise<BuildSummary[]> {
  return apiFetch(
    `/games/${encodeURIComponent(gameName)}/builds?limit=${limit}`
  );
}

export async function triggerBuild(
  gameName: string
): Promise<{ status: string; game_id: string }> {
  return apiFetch(`/games/${encodeURIComponent(gameName)}/builds`, {
    method: "POST",
  });
}

export async function rollbackBuild(
  gameName: string,
  buildId: string
): Promise<{ checkpointBuildId: string; restoredAtomCount: number }> {
  return apiFetch(
    `/games/${encodeURIComponent(gameName)}/builds/${buildId}/rollback`,
    { method: "POST" }
  );
}

// ── Chat Sessions ────────────────────────────────────────────────────────────

export async function listChatSessions(
  gameName: string,
  limit = 20
): Promise<ChatSession[]> {
  return apiFetch(
    `/games/${encodeURIComponent(gameName)}/chat/sessions?limit=${limit}`
  );
}

export async function createChatSession(
  gameName: string,
  model?: string,
  title?: string
): Promise<ChatSession> {
  return apiFetch(`/games/${encodeURIComponent(gameName)}/chat/sessions`, {
    method: "POST",
    body: JSON.stringify({ model, title }),
  });
}

export async function deleteChatSession(
  gameName: string,
  sessionId: string
): Promise<void> {
  await apiFetch(
    `/games/${encodeURIComponent(gameName)}/chat/sessions/${sessionId}`,
    { method: "DELETE" }
  );
}

export async function getChatMessages(
  gameName: string,
  sessionId: string
): Promise<ChatMessage[]> {
  return apiFetch(
    `/games/${encodeURIComponent(gameName)}/chat/sessions/${sessionId}/messages`
  );
}

export async function saveChatMessages(
  gameName: string,
  sessionId: string,
  messages: { message_id: string; role: string; parts: unknown[] }[]
): Promise<void> {
  await apiFetch(
    `/games/${encodeURIComponent(gameName)}/chat/sessions/${sessionId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ messages }),
    }
  );
}
