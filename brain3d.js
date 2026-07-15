/* ============================================================
   brain3d.js — the hero centrepiece.
   A real, shaded 3D brain (WebGL / three.js): a folded cortex with
   two hemispheres, a cerebellum and a brainstem, sculpted from an
   icosphere by ridged noise. EEG electrodes sit on the scalp and
   fire in sequence; neural signals travel down to a decoder at the
   base, whose screen position is published so the 2D hand layer can
   stream the decoded signal on into the fingertips.

   Self-contained: three.js is vendored locally (see the import map in
   index.html). If WebGL is unavailable the stage simply stays empty
   and the rest of the page is unaffected.
   ============================================================ */
import * as THREE from 'three';

const stage = document.getElementById('brainStage');
if (stage) init(stage);

function init(stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  if (!renderer.getContext()) return;

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.1);
  camera.lookAt(0, -0.05, 0);

  /* ---------- lighting: warm key, cool fill, blue neural rim ---------- */
  scene.add(new THREE.HemisphereLight(0x99b8ff, 0x140a12, 0.55));
  const key = new THREE.DirectionalLight(0xfff2ec, 1.5); key.position.set(2.4, 3.2, 3.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0x88a0ff, 0.5); fill.position.set(-3, 0.5, 1.5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0x2f7bff, 2.2); rim.position.set(-1.5, 1.2, -3.5); scene.add(rim);
  const rim2 = new THREE.PointLight(0x35a0ff, 6, 12, 2); rim2.position.set(0, -1.6, -1.2); scene.add(rim2);

  /* ---------- 3D noise (compact simplex, public-domain) ---------- */
  const simplex = makeSimplex();

  /* ---------- the cortex: an icosphere sculpted by ridged noise ---------- */
  const brain = new THREE.Group();
  scene.add(brain);

  const cortexGeo = new THREE.IcosahedronGeometry(1, 7);
  cortexGeo.deleteAttribute('uv');
  sculpt(cortexGeo, {
    gyri: 0.19, freq: 3.6, oct: 6, fissure: 0.16, fissureW: 0.07,
    sylvian: 0.06, scale: new THREE.Vector3(0.94, 0.82, 1.2), flatten: 0.86,
  });
  const tissue = new THREE.MeshStandardMaterial({
    color: 0xc9a6ad, roughness: 0.62, metalness: 0.0,
    emissive: 0x2a0f1c, emissiveIntensity: 0.35, flatShading: false,
  });
  const cortex = new THREE.Mesh(cortexGeo, tissue);
  brain.add(cortex);

  // cerebellum — smaller, finely folded, tucked low and to the back
  const cbGeo = new THREE.IcosahedronGeometry(1, 5);
  cbGeo.deleteAttribute('uv');
  sculpt(cbGeo, { gyri: 0.1, freq: 9, oct: 4, fissure: 0, fissureW: 1, sylvian: 0, scale: new THREE.Vector3(0.62, 0.4, 0.5), flatten: 1 });
  const cerebellum = new THREE.Mesh(cbGeo, tissue.clone());
  cerebellum.position.set(0, -0.62, -0.66);
  brain.add(cerebellum);

  // brainstem — a short taper dropping from the underside
  const stemGeo = new THREE.CylinderGeometry(0.09, 0.16, 0.5, 16, 1, true);
  const stem = new THREE.Mesh(stemGeo, tissue.clone());
  stem.position.set(0, -0.85, -0.34);
  stem.rotation.x = 0.5;
  brain.add(stem);

  /* ---------- EEG electrodes on the scalp ---------- */
  const halo = makeHaloTexture();
  const rayc = new THREE.Raycaster();
  const seeds = [
    [0, 1, 0.12], [0, 0.95, 0.7], [0, 0.9, -0.62],
    [0.55, 0.85, 0.35], [-0.55, 0.85, 0.35], [0.5, 0.85, -0.4], [-0.5, 0.85, -0.4],
    [0.9, 0.42, 0.15], [-0.9, 0.42, 0.15], [0.7, 0.55, 0.7], [-0.7, 0.55, 0.7],
    [0.34, 1, 0.02], [-0.34, 1, 0.02], [0.62, 0.7, -0.15], [-0.62, 0.7, -0.15],
  ];
  const electrodes = [];
  const discGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 20);
  seeds.forEach((s) => {
    const dir = new THREE.Vector3(s[0], s[1], s[2]).normalize();
    rayc.set(dir.clone().multiplyScalar(3), dir.clone().multiplyScalar(-1));
    const hit = rayc.intersectObject(cortex, false)[0];
    if (!hit) return;
    const n = hit.face.normal.clone();
    const p = hit.point.clone().add(n.clone().multiplyScalar(0.015));
    const mat = new THREE.MeshStandardMaterial({ color: 0x0a1830, emissive: 0x37a2ff, emissiveIntensity: 1.1, roughness: 0.4, metalness: 0.3 });
    const disc = new THREE.Mesh(discGeo, mat);
    disc.position.copy(p);
    disc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    brain.add(disc);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0x4fb0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9 }));
    sprite.scale.setScalar(0.34);
    sprite.position.copy(p);
    brain.add(sprite);
    electrodes.push({ mat, sprite, p, phase: Math.random() });
  });

  /* ---------- neural signals: sprites travelling electrode -> decoder ---------- */
  const baseLocal = new THREE.Vector3(0, -0.62, -0.18); // the "decoder" at the base
  const signals = electrodes.map((e, i) => {
    const mid = e.p.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, -0.1, 0));
    const curve = new THREE.CatmullRomCurve3([e.p.clone(), mid, baseLocal.clone()]);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0x7fd0ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    spr.scale.setScalar(0.16);
    brain.add(spr);
    return { curve, spr, offset: i / electrodes.length };
  });
  // the decoder core
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: 0x9fdcff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.setScalar(0.5); core.position.copy(baseLocal); brain.add(core);

  /* ---------- responsive sizing ---------- */
  function resize() {
    const w = stage.clientWidth || 1, h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    // fit: shrink the brain a touch on portrait/narrow stages
    const fit = Math.min(1, (w / h) / 1.1);
    brain.scale.setScalar(1.32 * (0.82 + 0.18 * fit));
  }
  resize();
  window.addEventListener('resize', resize);

  /* ---------- only run while the hero is on screen ---------- */
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { threshold: 0 })
      .observe(stage);
  }

  /* ---------- publish the decoder's screen position for the 2D hand ---------- */
  const baseWorld = new THREE.Vector3();
  function publishBase() {
    baseWorld.copy(baseLocal).applyMatrix4(brain.matrixWorld).project(camera);
    const r = stage.getBoundingClientRect();
    window.__brainBase = {
      x: r.left + (baseWorld.x * 0.5 + 0.5) * r.width,
      y: r.top + (1 - (baseWorld.y * 0.5 + 0.5)) * r.height,
      on: visible && baseWorld.z < 1,
    };
  }

  /* ---------- animate ---------- */
  const clock = new THREE.Clock();
  brain.rotation.x = -0.12;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) { publishBase(); return; }
    const t = clock.getElapsedTime();
    if (!REDUCED) brain.rotation.y = t * 0.16;
    brain.rotation.x = -0.12 + Math.sin(t * 0.4) * 0.03;

    // electrodes fire in a rolling sequence
    electrodes.forEach((e, i) => {
      const u = (t * 0.5 + e.phase * electrodes.length) % electrodes.length;
      const fire = Math.max(0, 1 - Math.abs(((u % electrodes.length)) - i));
      e.mat.emissiveIntensity = 0.7 + fire * 2.6 + Math.sin(t * 3 + i) * 0.15;
      e.sprite.material.opacity = 0.45 + fire * 0.55;
      e.sprite.scale.setScalar(0.3 + fire * 0.18);
    });
    // signals travel down their curves
    signals.forEach((sg) => {
      const u = REDUCED ? 0.5 : ((t * 0.32 + sg.offset) % 1);
      sg.curve.getPoint(u, sg.spr.position);
      sg.spr.material.opacity = Math.sin(u * Math.PI) * 0.95;
      sg.spr.scale.setScalar(0.12 + 0.06 * Math.sin(u * Math.PI));
    });
    core.material.opacity = 0.55 + 0.35 * Math.abs(Math.sin(t * 1.6));
    core.scale.setScalar(0.42 + 0.12 * Math.abs(Math.sin(t * 1.6)));

    publishBase();
    renderer.render(scene, camera);
  }
  frame();
}

/* sculpt an icosphere into a brain-like form (in place) */
function sculpt(geo, o) {
  const simplex = sculpt._s || (sculpt._s = makeSimplex());
  const pos = geo.attributes.position;
  const v = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    dir.copy(v).normalize();
    // ridged multifractal folds -> gyri/sulci
    let f = 0, amp = 0.5, freq = o.freq, norm = 0;
    const oct = o.oct || 5;
    for (let oc = 0; oc < oct; oc++) {
      const n = simplex(dir.x * freq, dir.y * freq, dir.z * freq);
      f += amp * (1 - Math.abs(n));
      norm += amp; freq *= 2.0; amp *= 0.55;
    }
    f = (f / norm - 0.62);                   // centre around 0
    let r = 1 + o.gyri * f;
    // longitudinal fissure between the hemispheres (top, mid-sagittal)
    if (o.fissure) {
      const groove = Math.exp(-(dir.x * dir.x) / (o.fissureW * o.fissureW)) * Math.max(0, dir.y);
      r -= o.fissure * groove;
    }
    // a hint of the lateral (Sylvian) fissure
    if (o.sylvian) {
      const s = Math.exp(-Math.pow((dir.y + 0.05) / 0.16, 2)) * Math.pow(Math.max(0, Math.abs(dir.x)), 1.2);
      r -= o.sylvian * s;
    }
    v.copy(dir).multiplyScalar(r);
    v.x *= o.scale.x; v.y *= o.scale.y; v.z *= o.scale.z;
    if (v.y < 0) v.y *= o.flatten;          // flatter underside
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
}

/* radial-gradient halo texture for additive glows */
function makeHaloTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(200,232,255,0.85)');
  grd.addColorStop(1, 'rgba(120,190,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

/* compact 3D simplex noise (Gustavson / Eastman, public domain) */
function makeSimplex() {
  const grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
  const p = [];
  // deterministic permutation so the brain is identical every load
  let seed = 1337;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const base = [];
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = base[i]; base[i] = base[j]; base[j] = t; }
  const perm = new Array(512), permMod12 = new Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = base[i & 255]; permMod12[i] = perm[i] % 12; }
  const F3 = 1 / 3, G3 = 1 / 6;
  return function (xin, yin, zin) {
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const X0 = i - t, Y0 = j - t, Z0 = k - t;
    const x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }
    const x1 = x0-i1+G3, y1 = y0-j1+G3, z1 = z0-k1+G3;
    const x2 = x0-i2+2*G3, y2 = y0-j2+2*G3, z2 = z0-k2+2*G3;
    const x3 = x0-1+3*G3, y3 = y0-1+3*G3, z3 = z0-1+3*G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0; else { const gi0 = permMod12[ii+perm[jj+perm[kk]]]; t0 *= t0; n0 = t0*t0*(grad3[gi0][0]*x0+grad3[gi0][1]*y0+grad3[gi0][2]*z0); }
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0; else { const gi1 = permMod12[ii+i1+perm[jj+j1+perm[kk+k1]]]; t1 *= t1; n1 = t1*t1*(grad3[gi1][0]*x1+grad3[gi1][1]*y1+grad3[gi1][2]*z1); }
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0; else { const gi2 = permMod12[ii+i2+perm[jj+j2+perm[kk+k2]]]; t2 *= t2; n2 = t2*t2*(grad3[gi2][0]*x2+grad3[gi2][1]*y2+grad3[gi2][2]*z2); }
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0; else { const gi3 = permMod12[ii+1+perm[jj+1+perm[kk+1]]]; t3 *= t3; n3 = t3*t3*(grad3[gi3][0]*x3+grad3[gi3][1]*y3+grad3[gi3][2]*z3); }
    return 32 * (n0 + n1 + n2 + n3);
  };
}
