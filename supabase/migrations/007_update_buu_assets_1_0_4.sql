-- =============================================================================
-- Migration 007: Update buu-assets to use latest (unversioned CDN URL)
-- =============================================================================

UPDATE external_registry
SET
  version   = 'latest',
  cdn_url   = 'https://cdn.jsdelivr.net/gh/victormer/buu-assets/dist/buu-assets.min.js'
WHERE name = 'buu_assets';
