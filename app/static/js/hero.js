/* =====================================================================
   Hero "particle burst into bulk" — scroll-driven Three.js animation.

   A single rotating product package bursts into hundreds of instanced
   copies that tile into a grid as the user scrolls, communicating scale.

   Uses InstancedMesh (one draw call for N copies) for web performance.
   Source asset: a .glb model if provided, else a textured plane from a PNG
   (fake depth via lighting + slight extrusion), else a neon placeholder box.
   ===================================================================== */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const GREEN_GLOW = 0x33ff00;
const GREEN_NEON = 0x00ff66;
const GRID = 12;                 // 12 x 12 = 144 copies
const COUNT = GRID * GRID;

export function initHero(canvas, opts = {}) {
  if (!canvas) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Lighting gives the package dimensionality even from a flat PNG.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.PointLight(GREEN_NEON, 2.2, 50);
  key.position.set(4, 5, 6);
  scene.add(key);
  const rim = new THREE.PointLight(GREEN_GLOW, 1.6, 50);
  rim.position.set(-5, -3, 4);
  scene.add(rim);

  // --- Geometry + material -------------------------------------------------
  const geometry = new THREE.BoxGeometry(1, 1.4, 0.35);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a, emissive: GREEN_GLOW, emissiveIntensity: 0.18,
    metalness: 0.3, roughness: 0.45,
  });

  if (opts.imageUrl) {
    new THREE.TextureLoader().load(opts.imageUrl, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      material.map = tex;
      material.emissiveIntensity = 0.08;
      material.needsUpdate = true;
    });
  }

  const mesh = new THREE.InstancedMesh(geometry, material, COUNT);
  scene.add(mesh);

  // Pre-compute, for each instance, a target grid slot it flies out to.
  const dummy = new THREE.Object3D();
  const targets = [];
  const spacing = 1.55;
  for (let i = 0; i < COUNT; i++) {
    const col = i % GRID;
    const row = Math.floor(i / GRID);
    targets.push(
      new THREE.Vector3(
        (col - (GRID - 1) / 2) * spacing,
        (row - (GRID - 1) / 2) * spacing,
        (Math.random() - 0.5) * 1.2
      )
    );
  }

  // progress 0 -> all instances collapsed at origin (single package)
  // progress 1 -> spread to the tiled grid
  let progress = 0;
  let targetProgress = 0;

  function layout(p, time) {
    const eased = p * p * (3 - 2 * p); // smoothstep
    for (let i = 0; i < COUNT; i++) {
      const t = targets[i];
      dummy.position.set(t.x * eased, t.y * eased, t.z * eased);
      const scale = 1.4 - eased * 0.85;        // shrink as they multiply
      dummy.scale.setScalar(i === 0 ? 1.4 - eased * 0.6 : scale);
      dummy.rotation.y = time * 0.4 + i * 0.05;
      dummy.rotation.x = Math.sin(time * 0.3 + i) * 0.15 * (1 - eased);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // Pull the camera back as the grid grows so it all stays in frame.
    camera.position.z = 9 + eased * 7;
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  // Map scroll within the hero section to burst progress.
  function onScroll() {
    const hero = canvas.closest(".hero") || canvas.parentElement;
    const rect = hero.getBoundingClientRect();
    const total = rect.height + window.innerHeight;
    targetProgress = Math.min(1, Math.max(0, -rect.top / (total * 0.55)));
  }

  const clock = new THREE.Clock();
  function tick() {
    const time = clock.getElapsedTime();
    progress += (targetProgress - progress) * 0.08; // smooth follow
    layout(reduceMotion ? targetProgress : progress, reduceMotion ? 0 : time);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  resize();
  onScroll();
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", onScroll, { passive: true });
  tick();
}
