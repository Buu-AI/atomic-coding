-- =============================================================================
-- Migration 008: Switch buu-assets to unversioned CDN URL (always latest)
-- =============================================================================

UPDATE external_registry
SET
  version   = 'latest',
  cdn_url   = 'https://cdn.jsdelivr.net/gh/victormer/buu-assets/dist/buu-assets.min.js'
WHERE name = 'buu_assets';
