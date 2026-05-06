-- =============================================================================
-- Migration 036: Fix api_surface docs for ESM-loaded externals
--
-- Two `module` load_type externals shipped with api_surface comments showing
-- ESM `import` syntax. Atoms run in window scope (classic script context) and
-- the runtime loader merges named exports into window[global_name], so the
-- only working call style is via the window global. The previous docs led the
-- LLM to emit `import { ... } from "..."` statements inside atoms, which throw
-- "Cannot use import statement outside a module" at runtime.
--
-- Fix: rewrite api_surface for simplex_noise and three_orbit_controls to use
-- the window-global call style. cannon_es is already correct (CANNON.* style).
-- =============================================================================

-- 1. simplex_noise — exports merged into window.SimplexNoise.
UPDATE external_registry
SET api_surface = '// Simplex Noise v4.0.3 - Available API (window.SimplexNoise)
//
// Loaded as ESM module; named exports merged into window.SimplexNoise.
// In atoms, call via the global — do NOT use `import` statements.
//
// === 2D Noise ===
// const noise2D = SimplexNoise.createNoise2D()        // optional: createNoise2D(randomFn)
// noise2D(x, y)                                       // returns -1 to 1
//
// === 3D Noise ===
// const noise3D = SimplexNoise.createNoise3D()
// noise3D(x, y, z)                                    // returns -1 to 1
//
// === 4D Noise ===
// const noise4D = SimplexNoise.createNoise4D()
// noise4D(x, y, z, w)                                 // returns -1 to 1
//
// === Common Patterns ===
// // Terrain heightmap:
// const noise2D = SimplexNoise.createNoise2D();
// const height = noise2D(x * 0.01, z * 0.01) * amplitude;
//
// // Octave noise (fractal Brownian motion):
// let value = 0, freq = 1, amp = 1;
// for (let i = 0; i < octaves; i++) {
//   value += noise2D(x * freq, y * freq) * amp;
//   freq *= lacunarity; amp *= persistence;
// }
//
// // Animated noise:
// const noise3D = SimplexNoise.createNoise3D();
// noise3D(x * scale, y * scale, time * speed)
//
// // Seeded (deterministic) noise — pair with seedrandom_js:
// const rng = new Math.seedrandom("level-1");
// const noise2D = SimplexNoise.createNoise2D(rng);'
WHERE name = 'simplex_noise';

-- 2. three_orbit_controls — OrbitControls export merged into window.THREE.
UPDATE external_registry
SET api_surface = '// OrbitControls (Three.js addon) - Available API (window.THREE.OrbitControls)
//
// Loaded as ESM module; the OrbitControls export is merged into window.THREE
// alongside the core three classes. In atoms, instantiate via THREE.* — do
// NOT use `import` statements. The runtime importmap maps the bare specifier
// "three" so OrbitControls.js itself can resolve its peer at load time.
//
// === Setup ===
// const controls = new THREE.OrbitControls(camera, renderer.domElement)
//
// === Properties ===
// controls.enableDamping = true      // smooth camera movement
// controls.dampingFactor = 0.05
// controls.enableZoom = true
// controls.enableRotate = true
// controls.enablePan = true
// controls.autoRotate = false
// controls.autoRotateSpeed = 2.0
// controls.minDistance = 1            // zoom limits
// controls.maxDistance = 100
// controls.minPolarAngle = 0          // vertical rotation limits
// controls.maxPolarAngle = Math.PI
// controls.target                     // THREE.Vector3 — orbit center point
//
// === Methods ===
// controls.update()                   // call in animation loop (required with damping)
// controls.dispose()                  // clean up event listeners
// controls.reset()                    // reset to initial state
//
// === Events ===
// controls.addEventListener("change", callback)
// controls.addEventListener("start", callback)
// controls.addEventListener("end", callback)
//
// === Notes ===
// - Requires three_js to be installed first (it is, on every 3D boilerplate).
// - Call controls.update() once per frame inside the render loop.'
WHERE name = 'three_orbit_controls';
