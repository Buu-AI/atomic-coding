-- =============================================================================
-- Migration 009: Add Gaussian Splats 3D + update buu-assets API for SPZ support
--
-- 1. Registers @mkkellogg/gaussian-splats-3d (v0.4.7) in the external registry.
--    Provides Three.js-based Gaussian splat rendering for .spz, .ply, .splat,
--    .ksplat files. Used by buu-assets to render worlds as 3D splat scenes.
--
-- 2. Updates buu-assets API surface to include the new splat-loading methods:
--    loadSplat, loadWorldSplat, disposeSplat, setGaussianSplats3D, etc.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Register gaussian_splats_3d
-- -----------------------------------------------------------------------------

INSERT INTO external_registry (
  name, display_name, package_name, version,
  cdn_url, global_name, description,
  load_type, module_imports, api_surface
)
VALUES (
  'gaussian_splats_3d',
  'Gaussian Splats 3D',
  '@mkkellogg/gaussian-splats-3d',
  '0.4.7',
  'https://cdn.jsdelivr.net/npm/@mkkellogg/gaussian-splats-3d@0.4.7/build/gaussian-splats-3d.module.js',
  'GaussianSplats3D',
  'Three.js-based 3D Gaussian splat viewer. Renders .spz, .ply, .splat, and .ksplat files with automatic sorting and WebXR support. Required by buu-assets for world splat loading.',
  'module',
  '{"three": "THREE"}',
  '// GaussianSplats3D v0.4.7 - Available API (window.GaussianSplats3D)
// Requires: THREE.js loaded (window.THREE)
//
// === DropInViewer (primary usage with buu-assets) ===
// new GaussianSplats3D.DropInViewer(options?)  → THREE.Object3D subclass, scene.add()-able
//   Options:
//     gpuAcceleratedSort: boolean   (default true on desktop, false on mobile)
//     sharedMemoryForWorkers: bool  (default true)
//     integerBasedSort: boolean     (default true)
//     sceneRevealMode: SceneRevealMode  (default Default)
//     logLevel: LogLevel            (default None)
//     sphericalHarmonicsDegree: 0|1|2  (default 0)
//     splatRenderMode: SplatRenderMode  (default ThreeD)
//
// viewer.addSplatScene(path, options?)  → Promise<void>
//   path: string                     URL to .ply, .splat, .ksplat, or .spz file
//   Options:
//     splatAlphaRemovalThreshold: number  (0-255, default 1)
//     showLoadingUI: boolean         (default true)
//     position: [x,y,z]             Scene position offset
//     rotation: [x,y,z,w]           Quaternion rotation
//     scale: [x,y,z]               Scene scale
//     progressiveLoad: boolean      (default false)
//     format: string                Force format (Ply, Splat, KSplat)
//
// viewer.addSplatScenes(scenes[])    → Promise<void>
//   Each scene: { path, splatAlphaRemovalThreshold, position, rotation, scale }
//
// viewer.start()                     Begins rendering (only for standalone Viewer)
// viewer.update()                    Manual update (selfDrivenMode: false)
// viewer.render()                    Manual render (selfDrivenMode: false)
//
// === Standalone Viewer ===
// new GaussianSplats3D.Viewer(options?)
//   All DropInViewer options plus:
//     selfDrivenMode: boolean       (default true)
//     renderer: THREE.WebGLRenderer (optional, creates own if omitted)
//     camera: THREE.Camera          (optional, creates own if omitted)
//     cameraUp: [x,y,z]            Camera up vector
//     initialCameraPosition: [x,y,z]
//     initialCameraLookAt: [x,y,z]
//     useBuiltInControls: boolean   (default true)
//     threeScene: THREE.Scene       (optional, for integrating existing scenes)
//     dynamicScene: boolean         (default false)
//     webXRMode: WebXRMode          (default None)
//     renderMode: RenderMode        (default Always)
//     antialiased: boolean          (default false)
//     focalAdjustment: number       (default 1.0)
//
// === Enums ===
// GaussianSplats3D.WebXRMode: { None, VR, AR }
// GaussianSplats3D.RenderMode: { Always, OnChange, Never }
// GaussianSplats3D.SceneRevealMode: { Default, Gradual, Instant }
// GaussianSplats3D.LogLevel: { None, Info, Debug }
// GaussianSplats3D.SplatRenderMode: { ThreeD, TwoD }
//
// === Supported file formats ===
// .ply    - Point cloud format (original Gaussian splatting output)
// .splat  - Standard splat format
// .ksplat - Compressed splat format (fastest loading)
// .spz   - Compressed splat format (used by buu.fun worlds)
//
// === Notes ===
// - DropInViewer extends THREE.Object3D — add to scene with scene.add(viewer)
// - Standalone Viewer manages its own render loop and controls
// - For atomic-coding: BUU.loadSplat() wraps DropInViewer — prefer using BUU
// - Peer dependency: three >= 0.160.0
// - SharedArrayBuffer requires COOP/COEP headers for shared memory workers
// - Max splat counts: ~16M (SH0), ~11M (SH1), ~8M (SH2)
// - Install three_js before this external (module addon)'
)
ON CONFLICT (name) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  version = EXCLUDED.version,
  cdn_url = EXCLUDED.cdn_url,
  load_type = EXCLUDED.load_type,
  module_imports = EXCLUDED.module_imports,
  api_surface = EXCLUDED.api_surface,
  description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
-- 2. Update buu_assets API surface to include splat methods
-- -----------------------------------------------------------------------------

UPDATE external_registry
SET
  api_surface = '// Buu Assets v1.0.4 - Available API (window.BUU)
// Requires: THREE.js loaded (window.THREE) + THREE.GLTFLoader available
// Optional: GaussianSplats3D for splat loading (.spz worlds)
//
// === Configuration ===
// BUU.setApiUrl(url)              → void     Set API base (default: https://dev.api.buu.fun)
// BUU.getApiUrl()                 → string   Get current API base URL
// BUU.setGLTFLoader(LoaderClass)  → void     Register GLTFLoader (ES module setups)
// BUU.setGaussianSplats3D(module) → void     Register GaussianSplats3D module
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
//   Low-level fetch from /v1/models/public/:modelId. Returns raw API response.
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
//   Low-level fetch from /v1/worlds/public/:worldId.
//
// === Gaussian Splat Loading ===
// BUU.loadSplat(url, options?)      → Promise<DropInViewer|null>
//   Load a Gaussian Splat file (.spz, .ply, .splat, .ksplat) into a DropInViewer.
//   Returns a scene.add()-able viewer. Requires GaussianSplats3D to be available.
//   Returns null if GaussianSplats3D is not loaded.
//
//   Options:
//     position: [x,y,z]              Scene position offset
//     rotation: [x,y,z,w]            Quaternion rotation
//     scale: [x,y,z]                Scene scale
//     splatAlphaRemovalThreshold: number  (default 5, range 0-255)
//     showLoadingUI: boolean         (default false)
//     progressiveLoad: boolean       (default false)
//     format: string                 Force format: ply, splat, ksplat, spz
//     viewer: object                 Override DropInViewer constructor options
//     onLoad: function(viewer)       Called when splat is loaded
//     onError: function(error)       Called on failure
//
// BUU.loadWorldSplat(worldId, options?) → Promise<{ world, viewer }>
//   Convenience: fetches world data + loads best available splat into DropInViewer.
//   Returns { world: <loadWorld result>, viewer: <DropInViewer|null> }
//
//   Options:
//     splatResolution: string        "high", "medium", "low", or "auto" (default)
//     world: object                  Options passed to loadWorld()
//     splat: object                  Options passed to loadSplat()
//     onLoad: function({ world, viewer })  Called when ready
//     onError: function(error)       Called on failure
//
// BUU.disposeSplat(viewer)          → void
//   Dispose a DropInViewer: removes from parent scene, cleans up GPU resources.
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
// BUU.isGaussianSplats3DAvailable() → boolean  Check if GaussianSplats3D is loaded
// BUU.getCachedModel(id)            → object|null  { group, loaded }
// BUU.getCachedWorld(id)            → object|null  Cached world data
// BUU.clearCache()                  → void   Clear cache and cancel all polls
//
// === Notes ===
// - Zero dependencies. Detects THREE.js + GLTFLoader + GaussianSplats3D at runtime.
// - Without GLTFLoader, models stay as placeholder boxes.
// - Without THREE.js, loadModel returns null.
// - Without GaussianSplats3D, loadSplat returns null (console warning).
// - All placeholder meshes have ._isPlaceholder = true for detection.
// - Install three_js AND three_gltf_loader before this external.
// - Install gaussian_splats_3d for splat/world loading support.'
WHERE name = 'buu_assets';
