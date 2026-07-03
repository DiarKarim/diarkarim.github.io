/* ============================================================
   Diar Abdlkarim — site interactions
   1. 3D "opening brain" (Three.js) — mouse + scroll driven
   2. Nav scroll state + mobile menu
   3. Scroll-reveal
   ============================================================ */

/* -----------------------------------------------------------
   1. THE OPENING BRAIN (WebGL)
   A real 3D brain rendered as a dense, luminous point cloud —
   two volumetric, wrinkled cortical hemispheres plus cerebellum
   and brainstem. Move the mouse and the whole brain turns to
   follow you. Scroll, and the hemispheres draw apart along the
   midline, opening the brain to reveal glowing deep structures.
   No labels or text — purely the form itself.
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
  /* volumetric radius: a dense cortical band near the surface, plus a
     filled interior so the brain never reads as a hollow shell */
  function radialSample() {
    return Math.random() < 0.60
      ? 0.85 + Math.random() * 0.15            // outer cortex band
      : 0.18 + Math.cbrt(Math.random()) * 0.68; // interior white-matter fill
  }
  /* layered trig field ≈ gyri & sulci wrinkling */
  function wrinkle(x, y, z) {
    return 0.05 * Math.sin(x * 9 + y * 4) * Math.sin(y * 7 + z * 3) * Math.sin(z * 8 + x * 5)
         + 0.024 * Math.sin(x * 16 + 1.7) * Math.sin(y * 14 + 0.4) * Math.sin(z * 15 + 2.9);
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

  /* ---------- cortex hemispheres (volumetric) ---------- */
  const HEMI_N = 6600;
  function buildHemisphere(side /* -1 left, +1 right */) {
    const pos = [], col = [];
    const RX = 0.54, RY = 0.46, RZ = 0.80;      // brain-like: wider than tall, longer than wide
    for (let i = 0; i < HEMI_N; i++) {
      const d = sphereDir();
      const rad = radialSample();
      d.x = Math.abs(d.x) * side;               // stay on this hemisphere's half
      let x = d.x * RX * rad, y = d.y * RY * rad, z = d.z * RZ * rad;

      // cortical gyrification — applied to the outer band only
      if (rad > 0.80) {
        const w = 1 + wrinkle(x + side, y, z) * 2.1;
        x *= w; y *= w; z *= w;
      }

      // anatomical sculpting
      if (z > 0.34) x *= 0.90;                   // frontal pole narrows
      if (y < -0.04 && z > -0.5 && z < 0.5) {    // temporal lobe bulges down & out
        y -= 0.11 * (0.5 - Math.abs(z));
      }
      if (y < -0.30) y = -0.30 + (y + 0.30) * 0.55; // flatter underside

      pos.push(x, y, z);
      const c = pickColor();
      const b = 0.42 + Math.random() * 0.58;
      col.push(c.r * b, c.g * b, c.b * b);
    }
    const pts = makePoints(pos, col, 0.019, 0.92);
    const grp = new THREE.Group();
    grp.add(pts);
    grp.position.x = side * 0.05;
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
    // cerebellum: finely striated, filled ball at the back underside
    for (let i = 0; i < 1900; i++) {
      const d = sphereDir();
      const rad = 0.45 + Math.cbrt(Math.random()) * 0.55;   // volumetric fill
      let x = d.x * 0.44 * rad, y = d.y * 0.30 * rad, z = d.z * 0.40 * rad;
      const w = 1 + 0.05 * Math.sin(y * 42) + 0.02 * Math.sin(x * 20) * Math.sin(z * 18);
      x *= w; y *= w; z *= w;
      pos.push(x, y - 0.46, z - 0.56);
      const c = pickColor(); const b = 0.4 + Math.random() * 0.5;
      col.push(c.r * b, c.g * b, c.b * b);
    }
    // brainstem: a short tilted column
    for (let i = 0; i < 380; i++) {
      const t = Math.random();
      const a = Math.random() * Math.PI * 2;
      const r = 0.10 * Math.sqrt(Math.random());
      pos.push(Math.cos(a) * r, -0.34 - t * 0.40, -0.24 - t * 0.16 + Math.sin(a) * r);
      const b = 0.35 + Math.random() * 0.45;
      col.push(C.ivory.r * b, C.ivory.g * b, C.ivory.b * b);
    }
    core.add(makePoints(pos, col, 0.019, 0.8));
  }
  root.add(core);

  /* ---------- deep structures: glowing inner cores (no text) ---------- */
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
  // a curved little tube (a limbic arc)
  const arcShape = () => {
    const t = Math.random() * 2 - 1;
    return new THREE.Vector3(
      (Math.random() - 0.5) * 0.05,
      Math.sin(t * 1.3) * 0.07 + (Math.random() - 0.5) * 0.04,
      t * 0.17 + (Math.random() - 0.5) * 0.04
    );
  };

  // purely visual cores that flare as the hemispheres part — no labels
  const STRUCTURES = [
    { color: C.gold,   at: 0.24, anchor: [0,  0.02, -0.02], shape: ell(0.13, 0.10, 0.15) },
    { color: C.teal,   at: 0.42, anchor: [0, -0.12, -0.08], shape: arcShape },
    { color: C.violet, at: 0.60, anchor: [0, -0.16,  0.20], shape: ell(0.08, 0.07, 0.08) },
    { color: C.gold,   at: 0.76, anchor: [0,  0.28, -0.02], shape: ell(0.07, 0.06, 0.07) },
  ];
  const structures = STRUCTURES.map((s) => {
    const grp = new THREE.Group();
    const pts = makeCluster(s.color, 240, s.shape);
    grp.add(pts);
    grp.position.set(s.anchor[0], s.anchor[1], s.anchor[2]);
    grp.userData = { ...s, pts, base: new THREE.Vector3(...s.anchor) };
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

    // closed: hemispheres meet at a thin fissure. open: they part & swing like doors
    for (const hemi of [hemiL, hemiR]) {
      const s = hemi.userData.side;
      hemi.position.x = s * (0.05 + open * 0.82);
      hemi.rotation.y = s * open * 0.45;
      hemi.rotation.z = -s * open * 0.10;
      hemi.userData.pts.material.opacity = 0.92 - open * 0.5;
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
