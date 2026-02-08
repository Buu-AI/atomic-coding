-- =============================================================================
-- Migration 005: Module external support + GLTFLoader
--
-- Adds load_type and module_imports columns to external_registry so that
-- ES-module addons (like Three.js GLTFLoader) can be loaded alongside
-- traditional UMD/IIFE script externals.
--
-- load_type:       'script' (default, loaded via <script>) or
--                  'module' (loaded via dynamic import() with import-map shim)
-- module_imports:  JSON mapping of bare import specifiers to the global_name
--                  of already-loaded script externals. Example for GLTFLoader:
--                  {"three": "THREE"} means `import {...} from 'three'`
--                  resolves to window.THREE via a generated shim module.
-- =============================================================================

-- 1. Add new columns
ALTER TABLE external_registry
  ADD COLUMN load_type TEXT NOT NULL DEFAULT 'script',
  ADD COLUMN module_imports JSONB;

-- 2. Register GLTFLoader
INSERT INTO external_registry (
  name, display_name, package_name, version,
  cdn_url, global_name, description,
  load_type, module_imports, api_surface
)
VALUES (
  'three_gltf_loader',
  'Three.js GLTFLoader',
  'three',
  '0.160.0',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js',
  'THREE',
  'GLTF/GLB 3D model loader addon for Three.js. Loads .gltf and .glb files with meshes, materials, animations, and more.',
  'module',
  '{"three": "THREE"}',
  '// THREE.GLTFLoader - Available API (addon, merged into THREE namespace)
//
// === Constructor ===
// new THREE.GLTFLoader(manager?)        Create a loader. Optional THREE.LoadingManager.
//
// === Loading ===
// loader.load(url, onLoad, onProgress?, onError?)
//   url: string                          URL to .gltf or .glb file
//   onLoad: (gltf) => void              Called when loading completes
//     gltf.scene    : THREE.Group        Root scene of the model
//     gltf.scenes   : THREE.Group[]      All scenes in the file
//     gltf.cameras  : THREE.Camera[]     Cameras defined in the file
//     gltf.animations: THREE.AnimationClip[]  Animation clips
//     gltf.asset    : object             GLTF metadata
//   onProgress?: (event) => void         Loading progress callback
//   onError?: (error) => void            Error callback
//
// loader.loadAsync(url, onProgress?)     Promise-based version of load()
//   Returns: Promise<{scene, scenes, cameras, animations, asset}>
//
// === Optional decoders (NOT available unless installed separately) ===
// loader.setDRACOLoader(dracoLoader)     For Draco-compressed meshes
// loader.setMeshoptDecoder(decoder)      For meshopt-compressed meshes
// loader.setKTX2Loader(ktx2Loader)       For KTX2 compressed textures
//
// === Usage ===
// const loader = new THREE.GLTFLoader();
// loader.load(''model.glb'', (gltf) => {
//   scene.add(gltf.scene);
//   // Play animations:
//   // const mixer = new THREE.AnimationMixer(gltf.scene);
//   // mixer.clipAction(gltf.animations[0]).play();
// });
//
// === Async usage ===
// const gltf = await new THREE.GLTFLoader().loadAsync(''model.glb'');
// scene.add(gltf.scene);
//
// === Supported formats ===
// .gltf  - JSON format with separate binary/texture files
// .glb   - Binary format, single file (recommended for web)
//
// === Notes ===
// - Meshes use MeshStandardMaterial by default
// - Animations are THREE.AnimationClip[], playable with THREE.AnimationMixer
// - Requires three_js to be installed first (module addon)
// - DRACO/meshopt/KTX2 decoders require additional externals'
)
ON CONFLICT (name) DO UPDATE SET
  package_name = EXCLUDED.package_name,
  version = EXCLUDED.version,
  cdn_url = EXCLUDED.cdn_url,
  load_type = EXCLUDED.load_type,
  module_imports = EXCLUDED.module_imports,
  api_surface = EXCLUDED.api_surface,
  description = EXCLUDED.description;
