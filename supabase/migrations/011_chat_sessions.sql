-- =============================================================================
-- Migration 011: Chat Sessions & Messages
-- Persistent memory for AI agent conversations per game.
-- =============================================================================

-- 1. Chat Sessions
-- =============================================================================

CREATE TABLE chat_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  title       TEXT,                                      -- auto-set from first user message
  model       TEXT,                                      -- LLM model used
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_sessions_game_id ON chat_sessions(game_id);
CREATE INDEX idx_chat_sessions_updated_at ON chat_sessions(updated_at DESC);

-- 2. Chat Messages
-- =============================================================================
-- Stores each UIMessage with its parts as JSONB (text, tool calls, etc.)

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  message_id  TEXT NOT NULL,                             -- client-generated UIMessage.id
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  parts       JSONB NOT NULL DEFAULT '[]'::jsonb,        -- UIMessage.parts array
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_chat_messages_unique ON chat_messages(session_id, message_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(session_id, created_at);

-- 3. Auto-update updated_at on session when messages change
-- =============================================================================

CREATE OR REPLACE FUNCTION update_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chat_sessions SET updated_at = now() WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chat_message_update_session
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_session_timestamp();
