import { getSupabaseClient } from "../supabase-client.ts";
import { log } from "../logger.ts";

// =============================================================================
// Types
// =============================================================================

export interface Game {
  id: string;
  name: string;
  description: string | null;
  active_build_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameWithBuild extends Game {
  active_build?: {
    id: string;
    status: string;
    atom_count: number | null;
    created_at: string;
  } | null;
}

// =============================================================================
// Service functions
// =============================================================================

/** Create a new game */
export async function createGame(
  name: string,
  description?: string,
): Promise<Game> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .insert({ name, description: description || null })
    .select("*")
    .single();

  if (error) throw new Error(`Failed to create game: ${error.message}`);
  log("info", "game created", { name, id: data.id });
  return data as Game;
}

/** List all games with optional active build info */
export async function listGames(): Promise<GameWithBuild[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .select("*, builds!fk_games_active_build(id, status, atom_count, created_at)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to list games: ${error.message}`);

  return (data || []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    active_build_id: g.active_build_id,
    created_at: g.created_at,
    updated_at: g.updated_at,
    active_build: g.builds || null,
  }));
}

/** Get a single game by name */
export async function getGame(name: string): Promise<GameWithBuild | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .select("*, builds!fk_games_active_build(id, status, atom_count, created_at)")
    .eq("name", name)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Failed to get game: ${error.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    active_build_id: data.active_build_id,
    created_at: data.created_at,
    updated_at: data.updated_at,
    active_build: data.builds || null,
  };
}

/**
 * Resolve a game name to its UUID.
 * Used by transport layers (REST middleware, MCP tools) -- NOT by other services.
 */
export async function resolveGameId(name: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .select("id")
    .eq("name", name)
    .single();

  if (error || !data) {
    throw new Error(`Game not found: "${name}"`);
  }

  return data.id;
}

/**
 * Validate that a game_id exists. Returns the game or throws.
 * Used by MCP server to validate the x-game-id header.
 */
export async function validateGameId(gameId: string): Promise<Game> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !data) {
    throw new Error(`Game not found for id: "${gameId}"`);
  }

  return data as Game;
}
