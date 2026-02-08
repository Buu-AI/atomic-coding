// ── Game ──────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  name: string;
  description: string | null;
  active_build_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameWithBuild extends Game {
  active_build?: BuildSummary | null;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

export interface Port {
  name: string;
  type:
    | "number"
    | "string"
    | "boolean"
    | "number[]"
    | "string[]"
    | "boolean[]"
    | "void";
  description?: string;
  optional?: boolean;
}

export type AtomType = "core" | "feature" | "util";

export interface AtomSummary {
  name: string;
  type: AtomType;
  inputs: Port[];
  outputs: Port[];
  depends_on: string[];
}

export interface AtomFull extends AtomSummary {
  code: string;
  description: string | null;
  version: number;
}

// ── Externals ─────────────────────────────────────────────────────────────────

export interface RegistryEntry {
  id: string;
  name: string;
  display_name: string;
  package_name: string;
  version: string;
  cdn_url: string;
  global_name: string;
  description: string | null;
}

export interface InstalledExternal extends RegistryEntry {
  load_type: string;
  module_imports: Record<string, string> | null;
  installed_at: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────

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

// ── Builds ────────────────────────────────────────────────────────────────────

export type BuildStatus = "building" | "success" | "error";

export interface BuildSummary {
  id: string;
  status: BuildStatus;
  bundle_url: string | null;
  atom_count: number | null;
  error_message: string | null;
  created_at: string;
}
