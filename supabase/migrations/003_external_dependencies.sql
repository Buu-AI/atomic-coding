-- =============================================================================
-- Migration 003: External Dependencies
--
-- Adds a curated registry of external libraries and per-game installation.
-- Externals are NOT atoms -- they are managed by humans via the REST API.
-- The agent can only read installed externals via MCP tools.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Table: external_registry (global, curated list of available libraries)
-- -----------------------------------------------------------------------------

CREATE TABLE external_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,                -- internal name, e.g. "three_js"
  display_name TEXT NOT NULL,               -- human-friendly, e.g. "Three.js"
  package_name TEXT NOT NULL,               -- npm package, e.g. "three"
  version TEXT NOT NULL,                    -- e.g. "0.170.0"
  cdn_url TEXT NOT NULL,                    -- full CDN URL to the UMD/global build
  global_name TEXT NOT NULL,                -- window global, e.g. "THREE"
  api_surface TEXT NOT NULL,                -- API docs the agent reads
  description TEXT,                         -- short description for listing
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Table: game_externals (per-game installs, references the registry)
-- -----------------------------------------------------------------------------

CREATE TABLE game_externals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  registry_id UUID NOT NULL REFERENCES external_registry(id),
  installed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(game_id, registry_id)
);

-- Index for fast lookup by game
CREATE INDEX idx_game_externals_game_id ON game_externals(game_id);

-- -----------------------------------------------------------------------------
-- Seed: Three.js r170
-- -----------------------------------------------------------------------------

INSERT INTO external_registry (name, display_name, package_name, version, cdn_url, global_name, description, api_surface)
VALUES (
  'three_js',
  'Three.js',
  'three',
  '0.160.0',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js',
  'THREE',
  '3D rendering library - scenes, cameras, geometry, materials, lights, and more',
  '// THREE.js r170 - Available API
//
// === Core ===
// Scene, PerspectiveCamera, OrthographicCamera, WebGLRenderer, WebGLRenderTarget
// Object3D, Group, LOD, Sprite
//
// === Geometry ===
// BoxGeometry, SphereGeometry, PlaneGeometry, CylinderGeometry, ConeGeometry
// TorusGeometry, TorusKnotGeometry, RingGeometry, CircleGeometry
// BufferGeometry, BufferAttribute, Float32BufferAttribute
// EdgesGeometry, WireframeGeometry, ExtrudeGeometry, ShapeGeometry
//
// === Materials ===
// MeshBasicMaterial, MeshStandardMaterial, MeshPhongMaterial, MeshLambertMaterial
// MeshNormalMaterial, MeshDepthMaterial, MeshToonMaterial, MeshPhysicalMaterial
// ShaderMaterial, RawShaderMaterial, LineBasicMaterial, LineDashedMaterial
// PointsMaterial, SpriteMaterial, ShadowMaterial
//
// === Objects ===
// Mesh, InstancedMesh, SkinnedMesh, Line, LineSegments, LineLoop, Points
//
// === Lights ===
// AmbientLight, DirectionalLight, PointLight, SpotLight, HemisphereLight
// RectAreaLight, LightProbe
// DirectionalLightHelper, PointLightHelper, SpotLightHelper, HemisphereLightHelper
//
// === Math ===
// Vector2, Vector3, Vector4, Quaternion, Euler, Matrix3, Matrix4
// Box2, Box3, Sphere, Ray, Plane, Frustum, Triangle
// Color, MathUtils (clamp, lerp, degToRad, radToDeg, randFloat, randInt, mapLinear)
//
// === Textures & Loaders ===
// TextureLoader, CubeTextureLoader, ObjectLoader, ImageLoader, FileLoader
// LoadingManager, Cache
// Texture, CanvasTexture, CubeTexture, DataTexture, VideoTexture
// RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping
// NearestFilter, LinearFilter, LinearMipmapLinearFilter
//
// === Animation ===
// AnimationMixer, AnimationClip, AnimationAction, KeyframeTrack
// NumberKeyframeTrack, VectorKeyframeTrack, QuaternionKeyframeTrack
// Clock
//
// === Helpers ===
// GridHelper, AxesHelper, ArrowHelper, BoxHelper, Box3Helper, CameraHelper
//
// === Raycasting & Interaction ===
// Raycaster
//
// === Fog ===
// Fog, FogExp2
//
// === Constants ===
// DoubleSide, FrontSide, BackSide, NormalBlending, AdditiveBlending, MultiplyBlending
// NoBlending, SubtractiveBlending, CustomBlending
// FlatShading, SmoothShading
// SRGBColorSpace, LinearSRGBColorSpace, NoColorSpace
// PCFShadowMap, PCFSoftShadowMap, VSMShadowMap, BasicShadowMap
// UVMapping, EquirectangularReflectionMapping
//
// === Post-processing (NOT included - requires separate import) ===
// EffectComposer, RenderPass, UnrealBloomPass, etc. are in addons, not in core.
//
// === Controls (NOT included - requires separate import) ===
// OrbitControls, FlyControls, PointerLockControls, etc. are in addons, not in core.
//
// === Loaders (NOT included - requires separate import) ===
// GLTFLoader, FBXLoader, OBJLoader, etc. are in addons, not in core.'
);
