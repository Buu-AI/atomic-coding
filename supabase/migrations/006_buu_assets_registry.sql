-- =============================================================================
-- Migration 006: Add buu-assets to external registry
--
-- Registers the buu-assets library (victormer/buu-assets 1.0.4) in the
-- curated external registry. Provides lazy 3D model loading by ID from
-- buu.fun API with automatic placeholder fallbacks and polling.
-- =============================================================================

INSERT INTO external_registry (
  name, display_name, package_name, version,
  cdn_url, global_name, description,
  load_type, api_surface
)
VALUES (
  'buu_assets',
  'Buu Assets',
  '@victormer/buu-assets',
  'latest',
  'https://cdn.jsdelivr.net/gh/victormer/buu-assets/dist/buu-assets.min.js',
  'BUU',
  'Lazy asset loader for buu.fun 3D models and worlds. Load models by ID with automatic placeholder fallbacks — the game is always playable, even while assets are generating. Requires THREE.js + GLTFLoader.',
  'script',
  '// Buu Assets v1.0.4 - Available API (window.BUU)
// Requires: THREE.js loaded (window.THREE) + THREE.GLTFLoader available
//
// === Configuration ===
// BUU.setApiUrl(url)              → void     Set API base (default: https://dev.api.buu.fun)
// BUU.getApiUrl()                 → string   Get current API base URL
//
// === 3D Models ===
// BUU.loadModel(modelId, options?) → Promise<THREE.Group>
//   Loads a 3D model by ID. Returns immediately with a gray box placeholder.
//   Background: fetches model data, loads real GLB when available, swaps placeholder.
//   Mesh priority: texturedMesh.url > optimizedMesh.url > mesh.url
//
//   Options:
//     width: number        (default 1)     Placeholder box width
//     height: number       (default 1)     Placeholder box height
//     depth: number        (default 1)     Placeholder box depth
//     color: string        (default "#888888") Placeholder box color
//     poll: boolean        (default true)  Keep polling if mesh not ready
//     pollInterval: number (default 5000)  Ms between polls
//     maxPollTime: number  (default 300000) Max poll duration (5 min)
//     onSwap: function(mesh, modelData)    Called when real mesh loads
//     onError: function(error)             Called on failures
//     onProgress: function(modelData)      Called on each poll
//
// BUU.fetchModel(modelId)          → Promise<object>
//   Low-level fetch from /api/v1/models/public/:modelId. Returns raw API response.
//
// === Worlds ===
// BUU.loadWorld(worldId, options?)  → Promise<object>
//   Fetch world data and resolve asset URLs.
//   Splat priority: highRes > mediumRes > lowRes
//
//   Options:
//     poll: boolean        (default true)
//     pollInterval: number (default 5000)
//     maxPollTime: number  (default 300000)
//     onReady: function()                  Called when splat/panorama ready
//     onError: function(error)
//     onProgress: function(worldData)
//
//   Returns: { worldId, splatUrl, splats: { lowRes, mediumRes, highRes },
//              panoramaUrl, thumbnailUrl, colliderMeshUrl, inputImages,
//              caption, displayName, status, raw }
//
// BUU.fetchWorld(worldId)           → Promise<object>
//   Low-level fetch from /api/v1/worlds/public/:worldId.
//
// === Placeholders ===
// BUU.createPlaceholderBox(options?) → THREE.Mesh
//   Options: { width: 1, height: 1, depth: 1, color: "#888888" }
//   Returned mesh has ._isPlaceholder = true
//
// === URL Resolvers ===
// BUU.resolveMeshUrl(modelData)       → string|null   Best mesh URL
// BUU.resolveAllFormats(modelData)    → { glb, obj, fbx }
// BUU.resolveSplatUrl(worldData)      → string|null   Best splat URL
// BUU.resolveAllSplatUrls(worldData)  → { lowRes, mediumRes, highRes }
//
// === Polling Control ===
// BUU.cancelPoll(modelId)           → void   Cancel polling for a model
// BUU.cancelAllPolls()              → void   Cancel all active polls
//
// === Utilities ===
// BUU.isThreeAvailable()            → boolean  Check if THREE.js is loaded
// BUU.isGLTFLoaderAvailable()       → boolean  Check if GLTFLoader is available
// BUU.getCachedModel(id)            → object|null  { group, loaded }
// BUU.getCachedWorld(id)            → object|null  Cached world data
// BUU.clearCache()                  → void   Clear cache and cancel all polls
//
// === Notes ===
// - Zero dependencies. Detects THREE.js + GLTFLoader at runtime.
// - Without GLTFLoader, models stay as placeholder boxes.
// - Without THREE.js, loadModel returns null.
// - All placeholder meshes have ._isPlaceholder = true for detection.
// - Install three_js AND three_gltf_loader before this external.'
)
ON CONFLICT (name) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  version = EXCLUDED.version,
  cdn_url = EXCLUDED.cdn_url,
  load_type = EXCLUDED.load_type,
  api_surface = EXCLUDED.api_surface,
  description = EXCLUDED.description;
