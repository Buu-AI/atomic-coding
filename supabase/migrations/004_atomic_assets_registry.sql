-- =============================================================================
-- Migration 004: Add atomic_assets to external registry
--
-- Registers the atomic-assets library (victormer/atomic-assets v1.0.1) in the
-- curated external registry. Provides asset loading with automatic fallbacks
-- for 2D images, 3D textures, audio, and placeholder meshes.
-- =============================================================================

INSERT INTO external_registry (name, display_name, package_name, version, cdn_url, global_name, description, api_surface)
VALUES (
  'atomic_assets',
  'Atomic Assets',
  '@victormer/atomic-assets',
  '1.0.1',
  'https://cdn.jsdelivr.net/gh/victormer/atomic-assets@1.0.1/dist/atomic-assets.min.js',
  'ASSETS',
  'Asset loader with automatic fallbacks for 2D and 3D games — images, textures, audio. Never crashes on missing assets.',
  '// Atomic Assets v1.0.1 - Available API (window.ASSETS)
//
// === Configuration ===
// ASSETS.setBaseUrl(url)            → void    Set base URL for relative paths
// ASSETS.getBaseUrl()               → string  Get current base URL
//
// === 2D: Images ===
// ASSETS.loadImage(src, options?)    → Promise<HTMLImageElement|HTMLCanvasElement>
//   Options: { width: 64, height: 64, color: "#ff00ff" }
//   Fallback: magenta checkerboard canvas with "IMG" label (._isPlaceholder = true)
//
// ASSETS.createPlaceholder(w, h, options?) → HTMLCanvasElement
//   Options: { color: "#ff00ff", label: "" }
//   Creates a canvas placeholder with checkerboard pattern and optional label
//
// === 3D: Textures (requires THREE.js) ===
// ASSETS.loadTexture(src, options?)  → Promise<THREE.Texture>
//   Options: { color: "#ff00ff", pattern: "checker"|"solid" }
//   Fallback: THREE.CanvasTexture with checker or solid pattern (._isPlaceholder = true)
//
// === 3D: Placeholder Mesh (requires THREE.js) ===
// ASSETS.createPlaceholderMesh(options?) → THREE.Mesh
//   Options: { width: 1, height: 1, depth: 1, color: "#ff00ff" }
//   Creates a wireframe BoxGeometry mesh
//
// === Audio ===
// ASSETS.loadAudio(src, audioContext) → Promise<AudioBuffer>
//   Fallback: 0.5s silent AudioBuffer (._isPlaceholder = true)
//
// === Utilities ===
// ASSETS.isThreeAvailable()          → boolean  Check if THREE.js is loaded
// ASSETS.preload(urls)               → Promise  Preload and cache multiple images
// ASSETS.clearCache()                → void     Clear internal cache
//
// === Fallback Detection ===
// All fallback objects have ._isPlaceholder = true
//
// === Notes ===
// - Zero dependencies. Detects THREE.js at runtime for 3D features.
// - All loaders cache results internally.
// - If using 3D features (loadTexture, createPlaceholderMesh), also install three_js.'
)
ON CONFLICT (name) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  version = EXCLUDED.version,
  cdn_url = EXCLUDED.cdn_url,
  api_surface = EXCLUDED.api_surface,
  description = EXCLUDED.description;
