/* ============================================================
   Diar Abdlkarim — site interactions
   1. 3D "opening brain" (Three.js) — mouse + scroll driven
   2. Nav scroll state + mobile menu
   3. Scroll-reveal
   ============================================================ */

/* -----------------------------------------------------------
   1. THE OPENING BRAIN (WebGL)
   A real 3D brain, built as a luminous point cloud: two
   wrinkled cortical hemispheres, cerebellum and brainstem.
   Move the mouse and the whole brain turns to follow you.
   Scroll, and the hemispheres draw apart along the midline —
   opening the brain to reveal its deep structures (prefrontal
   cortex, motor & somatosensory strip, thalamus, hippocampus,
   amygdala, cerebellum), each flaring with its label before
   dissolving into the section it names.
   ----------------------------------------------------------- */
(function brain3D() {
  const canvas = document.getElementById('brainCanvas');
  if (!canvas) return;
  if (typeof THREE === 'undefined') { console.warn('[brain] three.js failed to load'); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { console.warn('[brain] WebGL unavailable', e); return; }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 0.12, 4.3);

  const root = new THREE.Group();
  scene.add(root);

  /* ---------- palette ---------- */
  const C = {
    ivory:  new THREE.Color(0.95, 0.94, 0.90),
    gold:   new THREE.Color(0.89, 0.75, 0.47),
    violet: new THREE.Color(0.66, 0.59, 0.88),
    teal:   new THREE.Color(0.55, 0.82, 0.78),
  };

  /* ---------- helpers ---------- */
  function sphereDir() {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    return new THREE.Vector3(s * Math.cos(t), u, s * Math.sin(t));
  }
  /* layered trig field ≈ gyri & sulci wrinkling */
  function wrinkle(x, y, z) {
    return 0.05 * Math.sin(x * 9 + y * 4) * Math.sin(y * 7 + z * 3) * Math.sin(z * 8 + x * 5)
         + 0.022 * Math.sin(x * 16 + 1.7) * Math.sin(y * 14 + 0.4) * Math.sin(z * 15 + 2.9);
  }
  function pickColor() {
    const r = Math.random();
    return r < 0.80 ? C.ivory : r < 0.93 ? C.gold : C.violet;
  }
  function makePoints(positions, colors, size, opacity) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const m = new THREE.PointsMaterial({
      size, vertexColors: true, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    });
    return new THREE.Points(g, m);
  }

  /* ---------- cortex hemispheres ---------- */
  const HEMI_N = 5200;
  function buildHemisphere(side /* -1 left, +1 right */) {
    const pos = [], col = [];
    const RX = 0.50, RY = 0.60, RZ = 0.92;      // hemisphere radii
    for (let i = 0; i < HEMI_N; i++) {
      const d = sphereDir();
      // keep points on this hemisphere's outer half; flatten the medial wall
      d.x = Math.abs(d.x) * side;
      let x = d.x * RX, y = d.y * RY, z = d.z * RZ;
      if (Math.abs(d.x) < 0.22) {
        // medial wall — pull to a flat inner face so the split looks anatomical
        x = side * 0.05 * Math.random();
      }
      const w = 1 + wrinkle(x + side, y, z) * 2.0;
      x *= w; y *= w; z *= w;
      // taper the underside (temporal lobe hangs lower at the front-middle)
      if (y < -0.25 && z < -0.45) y *= 0.72;
      pos.push(x, y, z);
      const c = pickColor();
      const b = 0.45 + Math.random() * 0.55;
      col.push(c.r * b, c.g * b, c.b * b);
    }
    const pts = makePoints(pos, col, 0.021, 0.9);
    const grp = new THREE.Group();
    grp.add(pts);
    grp.position.x = side * 0.30;
    grp.userData = { side, pts };
    return grp;
  }
  const hemiL = buildHemisphere(-1);
  const hemiR = buildHemisphere(1);
  root.add(hemiL, hemiR);

  /* ---------- cerebellum + brainstem ---------- */
  const core = new THREE.Group();
  {
    const pos = [], col = [];
    // cerebellum: finely striated ball at the back underside
    for (let i = 0; i < 1500; i++) {
      const d = sphereDir();
      let x = d.x * 0.44, y = d.y * 0.30, z = d.z * 0.40;
      const w = 1 + 0.05 * Math.sin(y * 42) + 0.02 * Math.sin(x * 20) * Math.sin(z * 18);
      x *= w; y *= w; z *= w;
      pos.push(x, y - 0.58, z - 0.66);
      const c = pickColor(); const b = 0.4 + Math.random() * 0.5;
      col.push(c.r * b, c.g * b, c.b * b);
    }
    // brainstem: a short tilted column
    for (let i = 0; i < 380; i++) {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const r = 0.10 * Math.sqrt(Math.random());
      pos.push(Math.cos(a) * r, -0.42 - t * 0.42, -0.28 - t * 0.16 + Math.sin(a) * r);
      const b = 0.35 + Math.random() * 0.45;
      col.push(C.ivory.r * b, C.ivory.g * b, C.ivory.b * b);
    }
    core.add(makePoints(pos, col, 0.019, 0.8));
  }
  root.add(core);

  /* ---------- deep structures (revealed by the split) ---------- */
  function makeLabel(text) {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 96;
    const cx2 = cv.getContext('2d');
    cx2.font = '600 40px Inter, system-ui, sans-serif';
    cx2.fillStyle = 'rgba(243,241,234,0.96)';
    cx2.textBaseline = 'middle';
    cx2.fillText(text.toUpperCase(), 14, 50);
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false,
    }));
    sp.center.set(0, 0.5);
    sp.scale.set(0.98, 0.184, 1);
    return sp;
  }

  function makeCluster(color, n, shape) {
    const pos = [], col = [];
    for (let i = 0; i < n; i++) {
      const p = shape();
      pos.push(p.x, p.y, p.z);
      const b = 0.6 + Math.random() * 0.4;
      col.push(color.r * b, color.g * b, color.b * b);
    }
    return makePoints(pos, col, 0.026, 0);
  }
  const ell = (rx, ry, rz) => () => {
    const d = sphereDir(); const r = Math.cbrt(Math.random());
    return new THREE.Vector3(d.x * rx * r, d.y * ry * r, d.z * rz * r);
  };
  // hippocampus: a curved little tube (its classic seahorse arc)
  const hippoShape = () => {
    const t = Math.random() * 2 - 1;
    return new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      Math.sin(t * 1.3) * 0.07 + (Math.random() - 0.5) * 0.04,
      t * 0.17 + (Math.random() - 0.5) * 0.04
    );
  };

  const STRUCTURES = [
    { label: 'Prefrontal cortex', color: C.gold,   at: 0.18, anchor: [0,  0.16,  0.92], shape: ell(0.08, 0.13, 0.10) },
    { label: 'Motor cortex',      color: C.ivory,  at: 0.30, anchor: [0,  0.60,  0.14], shape: ell(0.16, 0.06, 0.09) },
    { label: 'Somatosensory',     color: C.violet, at: 0.42, anchor: [0,  0.57, -0.16], shape: ell(0.16, 0.06, 0.09) },
    { label: 'Thalamus',          color: C.gold,   at: 0.54, anchor: [0,  0.02, -0.04], shape: ell(0.10, 0.08, 0.12) },
    { label: 'Hippocampus',       color: C.teal,   at: 0.66, anchor: [0, -0.16, -0.16], shape: hippoShape },
    { label: 'Amygdala',          color: C.violet, at: 0.78, anchor: [0, -0.20,  0.22], shape: ell(0.07, 0.06, 0.07) },
    { label: 'Cerebellum',        color: C.ivory,  at: 0.90, anchor: [0, -0.58, -0.66], shape: ell(0.001, 0.001, 0.001) },
  ];
  const structures = STRUCTURES.map((s) => {
    const grp = new THREE.Group();
    const pts = makeCluster(s.color, s.label === 'Cerebellum' ? 1 : 150, s.shape);
    const label = makeLabel(s.label);
    label.position.set(0.24, 0.10, 0);
    grp.add(pts, label);
    grp.position.set(s.anchor[0], s.anchor[1], s.anchor[2]);
    grp.userData = { ...s, pts, label, base: new THREE.Vector3(...s.anchor) };
    root.add(grp);
    return grp;
  });

  /* ---------- state ---------- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scrollP = 0, scrollTarget = 0, t = 0;

  function updateScroll() {
    const range = window.innerHeight * 1.5;   // brain fully open ~1.5 screens down
    scrollTarget = Math.max(0, Math.min(1, window.scrollY / range));
  }
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the brain fully in frame on narrow screens
    camera.fov = w < 720 ? 48 : 38;
    camera.updateProjectionMatrix();
    if (reduced) renderFrame();
  }

  const smooth = (x) => x * x * (3 - 2 * x);

  function renderFrame() {
    const open = smooth(scrollP);

    // hemispheres part along the midline and swing outward like doors
    for (const hemi of [hemiL, hemiR]) {
      const s = hemi.userData.side;
      hemi.position.x = s * (0.30 + open * 0.62);
      hemi.rotation.y = s * open * 0.45;
      hemi.rotation.z = -s * open * 0.10;
      hemi.userData.pts.material.opacity = 0.9 - open * 0.52;
    }
    core.position.y = -open * 0.16;
    core.children[0].material.opacity = 0.8 - open * 0.30;

    // deep structures flare in sequence, then drift & dissolve
    for (const grp of structures) {
      const u = grp.userData;
      const d = scrollP - u.at;
      let life;
      if (d < -0.13) life = 0;
      else if (d < 0) life = (d + 0.13) / 0.13;
      else life = Math.max(0, 1 - d / 0.22);

      const drift = Math.max(0, d) * 1.1;
      grp.position.copy(u.base).addScaledVector(
        u.base.clone().setX(0).normalize().add(new THREE.Vector3(0, 0.4, 0)), drift
      );
      const k = 1 + Math.max(0, d) * 1.6;
      grp.scale.setScalar(k);
      u.pts.material.opacity = life * 0.95;
      u.label.material.opacity = life * 0.92;
    }

    // whole-brain motion: idle sway + mouse steering + open tilt
    root.rotation.y = Math.sin(t * 0.22) * 0.14 + mouse.x * 0.50;
    root.rotation.x = mouse.y * 0.28 + open * 0.30;
    const breathe = 1 + Math.sin(t * 0.9) * 0.007;
    root.scale.setScalar(breathe);
    root.position.y = 0.05 - open * 0.05;

    camera.position.z = 4.3 - open * 0.55;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  function loop() {
    t += 0.016;
    scrollP += (scrollTarget - scrollP) * 0.07;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    renderFrame();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('mousemove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) {
      mouse.tx = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
      mouse.ty = (e.touches[0].clientY / window.innerHeight) * 2 - 1;
    }
  }, { passive: true });

  resize();
  updateScroll();
  if (reduced) {
    scrollP = 0.3;             // a hint of the opening, as a still image
    renderFrame();
    window.addEventListener('scroll', () => { scrollP = scrollTarget; renderFrame(); }, { passive: true });
  } else {
    requestAnimationFrame(loop);
  }
})();

/* -----------------------------------------------------------
   2. NAV
   ----------------------------------------------------------- */
(function nav() {
  const el = document.querySelector('.nav');
  if (el) {
    const onScroll = () => el.classList.toggle('scrolled', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open')));
  }
})();

/* -----------------------------------------------------------
   3. SCROLL REVEAL
   ----------------------------------------------------------- */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || !items.length) {
    items.forEach((i) => i.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  items.forEach((i) => io.observe(i));
})();
