-- =============================================================================
-- Migration 035: Addon audit fixes
--
-- Three fixes uncovered by the 2D-addon audit:
--   1. pathfinding_js CDN URL was 404 (wrong path) — affects every 2D game
--      because pathfinding_js sits in the default 2D externals array.
--   2. gsap was pinned at 3.12.5 — bump to 3.15.0 (latest patch line).
--   3. cannon_es load_type was 'script' but the only cdn build that resolves
--      is CommonJS (`cannon-es.cjs.js`), which never attaches to window.CANNON.
--      Switch to ESM via load_type='module' so the runtime loader can merge
--      named exports into window.CANNON.
-- =============================================================================

-- 1. pathfinding_js — fix 404. Correct path is under /visual/lib/, not /lib/.
UPDATE external_registry
SET cdn_url = 'https://cdn.jsdelivr.net/npm/pathfinding@0.4.18/visual/lib/pathfinding-browser.min.js'
WHERE name = 'pathfinding_js';

-- 2. gsap — bump 3.12.5 → 3.15.0
UPDATE external_registry
SET version = '3.15.0',
    cdn_url = 'https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js'
WHERE name = 'gsap';

-- 3. cannon_es — switch to ESM module load.
-- The runtime loader (frontend/index.html) dynamic-imports module externals
-- and merges named exports into window[global_name], so window.CANNON.World etc.
-- still works. Empty module_imports because cannon-es has no peer dependency
-- (unlike three_orbit_controls which needs "three" mapped to window.THREE).
UPDATE external_registry
SET cdn_url = 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js',
    load_type = 'module',
    module_imports = '{}'::jsonb
WHERE name = 'cannon_es';
