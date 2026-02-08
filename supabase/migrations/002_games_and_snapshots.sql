-- =============================================================================
-- Migration 002: Games, game-scoped atoms/builds, and build snapshots
-- =============================================================================

-- 1. Create games table
-- =============================================================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  active_build_id UUID,  -- FK added after builds gets game_id
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_games_name ON games(name);

-- 2. Seed a "default" game for backward compatibility
-- =============================================================================
INSERT INTO games (id, name, description)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'default',
  'Default game (migrated from pre-games schema)'
);

-- 3. Add game_id to atoms
-- =============================================================================

-- 3a. Add column (nullable first for backfill)
ALTER TABLE atoms ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE CASCADE;

-- 3b. Backfill all existing atoms to the default game
UPDATE atoms SET game_id = '00000000-0000-0000-0000-000000000001';

-- 3c. Make NOT NULL
ALTER TABLE atoms ALTER COLUMN game_id SET NOT NULL;

-- 3d. Drop FKs on atom_dependencies that reference atoms(name) BEFORE dropping the constraint
ALTER TABLE atom_dependencies DROP CONSTRAINT atom_dependencies_atom_name_fkey;
ALTER TABLE atom_dependencies DROP CONSTRAINT atom_dependencies_depends_on_fkey;
ALTER TABLE atom_dependencies DROP CONSTRAINT atom_dependencies_atom_name_depends_on_key;

-- 3e. Now safe to drop old unique constraint on name, add (game_id, name)
ALTER TABLE atoms DROP CONSTRAINT atoms_name_key;
ALTER TABLE atoms ADD CONSTRAINT atoms_game_name_unique UNIQUE (game_id, name);

-- 3f. Update the name index to include game_id
DROP INDEX idx_atoms_name;
CREATE INDEX idx_atoms_game_name ON atoms(game_id, name);

-- 4. Add game_id to atom_dependencies
-- =============================================================================

-- 4b. Add game_id column
ALTER TABLE atom_dependencies ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE CASCADE;
UPDATE atom_dependencies SET game_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE atom_dependencies ALTER COLUMN game_id SET NOT NULL;

-- 4c. Add new FKs referencing the composite unique (game_id, name) on atoms
ALTER TABLE atom_dependencies
  ADD CONSTRAINT fk_dep_atom FOREIGN KEY (game_id, atom_name)
  REFERENCES atoms(game_id, name) ON DELETE CASCADE;

ALTER TABLE atom_dependencies
  ADD CONSTRAINT fk_dep_depends_on FOREIGN KEY (game_id, depends_on)
  REFERENCES atoms(game_id, name) ON DELETE RESTRICT;

-- 4d. New unique constraint
ALTER TABLE atom_dependencies
  ADD CONSTRAINT atom_dependencies_game_atom_dep_unique
  UNIQUE (game_id, atom_name, depends_on);

-- 4e. Update indexes
DROP INDEX idx_deps_atom;
DROP INDEX idx_deps_depends;
CREATE INDEX idx_deps_game_atom ON atom_dependencies(game_id, atom_name);
CREATE INDEX idx_deps_game_depends ON atom_dependencies(game_id, depends_on);

-- 5. Add game_id + atom_snapshot to builds
-- =============================================================================

ALTER TABLE builds ADD COLUMN game_id UUID REFERENCES games(id) ON DELETE CASCADE;
UPDATE builds SET game_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE builds ALTER COLUMN game_id SET NOT NULL;

ALTER TABLE builds ADD COLUMN atom_snapshot JSONB;

CREATE INDEX idx_builds_game ON builds(game_id, created_at DESC);

-- 6. Add FK from games.active_build_id -> builds.id
-- =============================================================================
ALTER TABLE games
  ADD CONSTRAINT fk_games_active_build
  FOREIGN KEY (active_build_id) REFERENCES builds(id) ON DELETE SET NULL;

-- 7. Update match_atoms function to accept game_id
-- =============================================================================
CREATE OR REPLACE FUNCTION match_atoms(
  p_game_id UUID,
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  name TEXT,
  type TEXT,
  code TEXT,
  description TEXT,
  inputs JSONB,
  outputs JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    a.name,
    a.type,
    a.code,
    a.description,
    a.inputs,
    a.outputs,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM atoms a
  WHERE a.game_id = p_game_id
    AND a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- 8. Add games to realtime
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE games;
