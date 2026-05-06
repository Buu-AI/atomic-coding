-- =============================================================================
-- Migration 034: Raise atoms.code size limit from 2KB to 4KB
-- =============================================================================
-- The original 2048-byte cap was too tight for boilerplate `create_scene` atoms,
-- which inherently bundle Phaser scene config (init, update, input handling).
-- Six 2D boilerplates exceeded the limit, causing silent insert failures during
-- `seedGameFromBoilerplate` and downstream "unresolved atom reference" build
-- errors for every game created with those genres.

ALTER TABLE atoms DROP CONSTRAINT IF EXISTS atoms_code_check;
ALTER TABLE atoms ADD CONSTRAINT atoms_code_check
  CHECK (octet_length(code) <= 4096);
