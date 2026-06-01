/* =====================================================================
   Rotatable 3D product viewer. Loads a .glb/.gltf model when available;
   otherwise renders a textured, slowly-rotating package from the PNG.
   Drag to orbit.
   ===================================================================== */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

export function initProductViewer(canvas, { modelUrl, imageUrl } = {}) {
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0.5, 4);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const p1 = new THREE.PointLight(0x00ff66, 2, 50); p1.position.set(3, 4, 5); scene.add(p1);
  const p2 = new THREE.PointLight(0x33ff00, 1.4, 50); p2.position.set(-4, -2, 3); scene.add(p2);

  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.4;
  controls.enableDamping = true;

  let obj;
  if (modelUrl) {
    new GLTFLoader().load(modelUrl, (gltf) => {
      obj = gltf.scene;
      obj.scale.setScalar(1.6);
      scene.add(obj);
    });
  } else {
    const geo = new THREE.BoxGeometry(1.1, 1.6, 0.4);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a, emissive: 0x33ff00, emissiveIntensity: 0.12,
      metalness: 0.35, roughness: 0.4,
    });
    if (imageUrl) {
      new THREE.TextureLoader().load(imageUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex; mat.emissiveIntensity = 0.05; mat.needsUpdate = true;
      });
    }
    obj = new THREE.Mesh(geo, mat);
    scene.add(obj);
  }

  function resize() {
    const { clientWidth: w, clientHeight: h } = canvas;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function tick() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  tick();
}
