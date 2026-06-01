/* =====================================================================
   "Our customers" globe — a dark neon-green wireframe Earth with glowing
   markers at each verified partner's location. Drag to rotate, scroll to
   zoom, click a marker for the customer's details (website + general info).

   Data: GET /api/customers/map  (public, opt-in approved customers only).
   ===================================================================== */
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const GREEN_GLOW = 0x33ff00;
const GREEN_NEON = 0x00ff66;
const R = 2;

// lat/lon (degrees) -> point on a sphere of radius r.
function latLonToVec3(lat, lon, r = R) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

export async function initGlobe(canvas) {
  if (!canvas) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 1.4, 5.5);

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const light = new THREE.PointLight(GREEN_NEON, 2, 50);
  light.position.set(5, 5, 5);
  scene.add(light);

  const globe = new THREE.Group();
  scene.add(globe);

  // Solid dark core (occludes markers on the far side via depth testing).
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.99, 48, 48),
    new THREE.MeshStandardMaterial({ color: 0x0d130f, metalness: 0.2, roughness: 0.9 })
  );
  globe.add(core);

  // Neon wireframe shell.
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 36, 24),
    new THREE.MeshBasicMaterial({ color: GREEN_GLOW, wireframe: true, transparent: true, opacity: 0.18 })
  ));

  // Soft atmosphere glow.
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 48, 48),
    new THREE.MeshBasicMaterial({ color: GREEN_NEON, transparent: true, opacity: 0.06, side: THREE.BackSide })
  ));

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.minDistance = 3.2;
  controls.maxDistance = 9;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.5;

  // --- Markers -------------------------------------------------------------
  const markers = [];
  const markerGeo = new THREE.SphereGeometry(0.04, 12, 12);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function addMarker(customer) {
    const pos = latLonToVec3(customer.latitude, customer.longitude, R * 1.01);
    const mat = new THREE.MeshBasicMaterial({ color: GREEN_NEON });
    const m = new THREE.Mesh(markerGeo, mat);
    m.position.copy(pos);
    m.userData.customer = customer;
    m.userData.base = pos.clone();
    globe.add(m);

    // Glow halo sprite.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      color: GREEN_GLOW, transparent: true, opacity: 0.55, depthWrite: false,
    }));
    halo.scale.setScalar(0.22);
    halo.position.copy(pos);
    globe.add(halo);
    m.userData.halo = halo;

    markers.push(m);
  }

  // --- Info panel ----------------------------------------------------------
  const panel = document.getElementById("globe-info");
  const fields = {
    name: document.getElementById("gi-name"),
    loc: document.getElementById("gi-loc"),
    info: document.getElementById("gi-info"),
    website: document.getElementById("gi-website"),
  };
  document.getElementById("globe-close")?.addEventListener("click", () => panel.classList.remove("show"));

  function showCustomer(c) {
    fields.name.textContent = c.business_name;
    fields.loc.textContent = [c.city, c.state].filter(Boolean).join(", ") || "—";
    fields.info.textContent = c.info || "Verified wholesale partner.";
    if (c.website) {
      let href = c.website;
      if (!/^https?:\/\//i.test(href)) href = "https://" + href;
      fields.website.href = href;
      fields.website.style.display = "inline-flex";
      fields.website.textContent = c.website.replace(/^https?:\/\//i, "") + " ↗";
    } else {
      fields.website.style.display = "none";
    }
    panel.classList.add("show");
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    // Include the core so markers behind the globe are not pickable.
    const hits = raycaster.intersectObjects([core, ...markers], false);
    const first = hits[0];
    if (first && first.object.userData.customer) {
      showCustomer(first.object.userData.customer);
    }
  }
  canvas.addEventListener("click", onClick);

  // --- Load data -----------------------------------------------------------
  try {
    const customers = await (await fetch("/api/customers/map", { credentials: "same-origin" })).json();
    if (!Array.isArray(customers) || customers.length === 0) {
      const empty = document.getElementById("globe-empty");
      if (empty) empty.style.display = "block";
    } else {
      customers.forEach(addMarker);
    }
  } catch (_) { /* leave the globe spinning empty on failure */ }

  // --- Loop / resize -------------------------------------------------------
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    // Pulse marker halos.
    for (const m of markers) {
      const s = 0.2 + Math.sin(t * 2.5 + m.position.x * 3) * 0.06;
      m.userData.halo.scale.setScalar(s);
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }

  resize();
  window.addEventListener("resize", resize);
  tick();
}
