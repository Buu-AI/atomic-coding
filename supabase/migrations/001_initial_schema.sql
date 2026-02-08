-- =============================================================================
-- Atomic Coding: Initial Schema
-- =============================================================================

-- 1. Extensions
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS vector SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Type System (JS primitives only)
-- =============================================================================
CREATE TYPE atom_value_type AS ENUM (
  'number',       -- 42, 3.14
  'string',       -- "hello"
  'boolean',      -- true/false
  'number[]',     -- [1, 2, 3] (coordinates, RGB, etc.)
  'string[]',     -- ["tag1", "tag2"]
  'boolean[]',    -- [true, false]
  'void'          -- no return value
);

-- 3. Validation function for inputs/outputs JSONB
-- =============================================================================
CREATE OR REPLACE FUNCTION validate_atom_ports(ports JSONB)
RETURNS BOOLEAN AS $$
DECLARE
  port JSONB;
  valid_types TEXT[] := ARRAY[
    'number','string','boolean',
    'number[]','string[]','boolean[]',
    'void'
  ];
BEGIN
  IF jsonb_typeof(ports) != 'array' THEN RETURN FALSE; END IF;
  FOR port IN SELECT * FROM jsonb_array_elements(ports) LOOP
    IF NOT (port->>'type' = ANY(valid_types)) THEN RETURN FALSE; END IF;
    IF port->>'name' IS NULL THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Table: atoms
-- =============================================================================
CREATE TABLE atoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('core', 'feature', 'util')),
  code TEXT NOT NULL CHECK (octet_length(code) <= 2048),  -- 2KB max per atom
  description TEXT,
  inputs JSONB NOT NULL DEFAULT '[]',
  outputs JSONB NOT NULL DEFAULT '[]',
  embedding vector(1536),
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_inputs_valid CHECK (validate_atom_ports(inputs)),
  CONSTRAINT chk_outputs_valid CHECK (validate_atom_ports(outputs))
);

CREATE INDEX idx_atoms_name ON atoms(name);
CREATE INDEX idx_atoms_type ON atoms(type);
CREATE INDEX idx_atoms_embedding ON atoms USING hnsw (embedding vector_cosine_ops);

-- 5. Table: atom_dependencies
-- =============================================================================
CREATE TABLE atom_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_name TEXT NOT NULL REFERENCES atoms(name) ON DELETE CASCADE,
  depends_on TEXT NOT NULL REFERENCES atoms(name) ON DELETE RESTRICT,
  UNIQUE(atom_name, depends_on),
  CHECK (atom_name != depends_on)
);

CREATE INDEX idx_deps_atom ON atom_dependencies(atom_name);
CREATE INDEX idx_deps_depends ON atom_dependencies(depends_on);

-- 6. Table: builds
-- =============================================================================
CREATE TABLE builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL CHECK (status IN ('building', 'success', 'error')),
  bundle_url TEXT,
  atom_count INT,
  error_message TEXT,
  build_log JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Semantic search function (pgvector cosine similarity)
-- =============================================================================
CREATE OR REPLACE FUNCTION match_atoms(
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
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding ASC
  LIMIT match_count;
$$;

-- 8. Auto-update trigger (version + updated_at)
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER atoms_updated_at
  BEFORE UPDATE ON atoms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Storage bucket for bundles
-- =============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('bundles', 'bundles', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to bundles
CREATE POLICY "Public read access on bundles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bundles');

-- Allow service role to upload bundles
CREATE POLICY "Service role upload on bundles"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bundles');

CREATE POLICY "Service role update on bundles"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bundles');

-- 10. Enable Realtime on builds table (for frontend auto-reload)
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE builds;
