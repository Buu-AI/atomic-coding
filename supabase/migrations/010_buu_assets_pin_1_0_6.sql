-- =============================================================================
-- Migration 010: Pin buu-assets CDN to v1.0.6
--
-- The unversioned CDN URL was serving a cached v1.0.5 build that was missing
-- splat methods (loadSplat, loadWorldSplat, disposeSplat, etc.).
-- Pin to the v1.0.6 tag which includes the full Gaussian Splat support.
-- =============================================================================

UPDATE external_registry
SET
  version = '1.0.6',
  cdn_url = 'https://cdn.jsdelivr.net/gh/victormer/buu-assets@1.0.6/dist/buu-assets.min.js'
WHERE name = 'buu_assets';
