/* ============================================================
   Diar Abdlkarim — site interactions
   1. Scroll-driven "opening brain" hero
   2. Nav scroll state + mobile menu
   3. Scroll-reveal
   ============================================================ */

/* -----------------------------------------------------------
   1. THE OPENING BRAIN
   A brain, drawn from a field of fine particles, sits quietly
   behind the page. Move the cursor and it breathes and parts
   beneath your hand. Scroll, and it opens along the midline —
   the hemispheres draw apart and the inner structures light up
   in turn (prefrontal cortex, motor & somatosensory strip,
   thalamus, hippocampus, amygdala, cerebellum). Each structure
   flares as you reach it, then streams outward and dissolves
   into the section it names — the anatomy becoming the page.
   ----------------------------------------------------------- */
(function openingBrain() {
  const canvas = document.getElementById('brainCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- brain silhouette (left-facing profile), in a 220 x 180 viewBox --- */
  const VB_W = 220, VB_H = 180;
  const BRAIN_PATH =
    'M54 132 C34 130 22 112 30 96 C14 90 12 66 30 58 ' +
    'C24 40 44 26 64 34 C68 18 92 14 104 28 ' +
    'C118 14 146 18 150 40 C172 38 188 60 176 80 ' +
    'C190 92 186 118 166 122 C168 140 146 152 128 144 ' +
    'C120 160 92 160 84 146 C74 154 58 150 54 132 Z';
  const path = new Path2D(BRAIN_PATH);

  /* subtle gyri / fissure strokes drawn over the particle fill */
  const GYRI = [
    'M60 60 C82 70 78 96 60 104',
    'M96 40 C104 66 96 96 104 128',
    'M132 44 C120 74 138 96 126 122',
    'M150 66 C168 78 160 100 150 108',
    'M74 118 C96 112 120 120 140 112',
  ].map((d) => new Path2D(d));

  /* inner structures — anchor in viewBox space, tied to a section.
     revealAt = scroll progress (0..1) at which the structure flares. */
  const STRUCTURES = [
    { key: 'prefrontal',    label: 'Prefrontal cortex', ax: 58,  ay: 74,  hue: 'gold',   revealAt: 0.16 },
    { key: 'motor',         label: 'Motor cortex',      ax: 96,  ay: 40,  hue: 'ivory',  revealAt: 0.30 },
    { key: 'somatosensory', label: 'Somatosensory',     ax: 120, ay: 46,  hue: 'violet', revealAt: 0.42 },
    { key: 'thalamus',      label: 'Thalamus',          ax: 110, ay: 92,  hue: 'gold',   revealAt: 0.54 },
    { key: 'hippocampus',   label: 'Hippocampus',       ax: 120, ay: 108, hue: 'teal',   revealAt: 0.66 },
    { key: 'amygdala',      label: 'Amygdala',          ax: 96,  ay: 118, hue: 'violet', revealAt: 0.78 },
    { key: 'cerebellum',    label: 'Cerebellum',        ax: 166, ay: 122, hue: 'ivory',  revealAt: 0.90 },
  ];

  const HUES = {
    ivory:  [242, 240, 232],
    gold:   [226, 192, 120],
    violet: [168, 150, 225],
    teal:   [140, 208, 198],
  };

  let W, H, DPR;
  let particles = [];
  const pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
  let scrollP = 0;      // eased scroll progress 0..1
  let scrollTarget = 0;
  let t = 0;

  /* map a viewBox point to the current screen transform */
  let cx, cy, scale;
  function computeTransform() {
    const box = Math.min(W, H) * (W < 720 ? 0.82 : 0.66);
    scale = box / VB_H;
    cx = W * 0.5;
    cy = H * 0.46;
  }
  function toScreenX(vx) { return cx + (vx - VB_W / 2) * scale; }
  function toScreenY(vy) { return cy + (vy - VB_H / 2) * scale; }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth = window.innerWidth;
    H = canvas.clientHeight = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    computeTransform();
    seed();
  }

  /* rejection-sample particle homes inside the brain path (viewBox space) */
  function seed() {
    const target = Math.round(Math.min(1100, Math.max(420, (W * H) / 2400)));
    particles = [];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);        // test in raw viewBox coords
    let guard = 0;
    while (particles.length < target && guard < target * 60) {
      guard++;
      const vx = Math.random() * VB_W;
      const vy = Math.random() * VB_H;
      if (!ctx.isPointInPath(path, vx, vy)) continue;
      const side = vx < 110 ? -1 : 1;          // hemisphere
      particles.push({
        vx, vy, side,
        jx: (Math.random() - 0.5) * 3,         // organic jitter
        jy: (Math.random() - 0.5) * 3,
        tw: Math.random() * Math.PI * 2,        // twinkle phase
        sp: 0.6 + Math.random() * 0.9,          // twinkle speed
        depth: 0.5 + Math.random() * 0.5,       // parallax depth
        hue: Math.random() < 0.78 ? 'ivory' : (Math.random() < 0.5 ? 'gold' : 'violet'),
      });
    }
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.restore();
  }

  function updateScroll() {
    // brain opens across roughly the first 1.4 viewport heights
    const range = H * 1.4;
    scrollTarget = Math.max(0, Math.min(1, window.scrollY / range));
  }

  function draw() {
    t += 0.016;
    scrollP += (scrollTarget - scrollP) * 0.08;
    // ease pointer
    pointer.x += (pointer.tx - pointer.x) * 0.10;
    pointer.y += (pointer.ty - pointer.y) * 0.10;

    ctx.clearRect(0, 0, W, H);

    const p = scrollP;
    const globalFade = Math.max(0.10, 1 - p * 1.05);     // brain recedes as you scroll
    const open = p;                                       // 0 closed → 1 open
    const breathe = Math.sin(t * 0.7) * 0.6;             // gentle idle motion

    // parallax offset from the cursor (whole-brain drift)
    const par = pointer.active
      ? { x: (pointer.x / W - 0.5) * 26, y: (pointer.y / H - 0.5) * 20 }
      : { x: 0, y: 0 };

    /* ---- faint silhouette + gyri, mapped to screen ---- */
    ctx.save();
    ctx.translate(toScreenX(0) + par.x, toScreenY(0) + par.y);
    ctx.scale(scale, scale);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(226,192,120,${0.10 * globalFade})`;
    ctx.lineWidth = 0.7;
    ctx.stroke(path);
    ctx.strokeStyle = `rgba(210,214,236,${0.07 * globalFade})`;
    ctx.lineWidth = 0.6;
    for (const g of GYRI) ctx.stroke(g);
    // midline crack that widens as the brain opens
    ctx.strokeStyle = `rgba(226,192,120,${0.16 * globalFade * (0.3 + open)})`;
    ctx.lineWidth = 0.6 + open * 1.4;
    ctx.beginPath();
    ctx.moveTo(110, 26); ctx.lineTo(110, 150);
    ctx.stroke();
    ctx.restore();

    /* ---- particles ---- */
    for (const pt of particles) {
      // hemispheres part along the midline as the brain opens
      const spread = pt.side * open * 46 * pt.depth;
      let sx = toScreenX(pt.vx + pt.jx * 0.4) + spread * scale * 0.4 + par.x * pt.depth;
      let sy = toScreenY(pt.vy + pt.jy * 0.4) + par.y * pt.depth;

      // idle breathing outward from centre
      const bx = (pt.vx - VB_W / 2), by = (pt.vy - VB_H / 2);
      sx += bx * breathe * 0.004 * scale;
      sy += by * breathe * 0.004 * scale;

      // local parting under the cursor
      if (pointer.active) {
        const dx = sx - pointer.x, dy = sy - pointer.y;
        const d2 = dx * dx + dy * dy;
        const R = 120;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / R) * 16;
          sx += (dx / d) * push;
          sy += (dy / d) * push;
        }
      }

      const tw = 0.55 + 0.45 * Math.sin(t * pt.sp + pt.tw);
      const [r, g, b] = HUES[pt.hue];
      const a = tw * globalFade * (0.9 - open * 0.35);
      if (a <= 0.02) continue;
      const rad = (pt.hue === 'ivory' ? 0.9 : 1.1) * (1 + tw * 0.5);
      ctx.beginPath();
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.arc(sx, sy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    /* ---- inner structures: flare as reached, then drift & dissolve ---- */
    for (const s of STRUCTURES) {
      // life: 0 before reveal, ramps to 1 at reveal, then fades as we pass
      const d = p - s.revealAt;
      let life;
      if (d < -0.14) life = 0;
      else if (d < 0) life = (d + 0.14) / 0.14;          // ramp in
      else life = Math.max(0, 1 - d / 0.20);              // fade out
      if (life <= 0.001) continue;

      const [r, g, b] = HUES[s.hue];
      // drift outward from brain centre as it dissolves
      const dirx = (s.ax - VB_W / 2), diry = (s.ay - VB_H / 2);
      const driftK = Math.max(0, d) * 2.4;
      const sx = toScreenX(s.ax + dirx * driftK) + par.x;
      const sy = toScreenY(s.ay + diry * driftK) + par.y;
      const flare = Math.pow(life, 0.6);

      // glow
      const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46 * flare + 8);
      gr.addColorStop(0, `rgba(${r},${g},${b},${0.5 * flare})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(sx, sy, 46 * flare + 8, 0, Math.PI * 2);
      ctx.fill();
      // core
      ctx.fillStyle = `rgba(${r},${g},${b},${0.95 * flare})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.6 + flare * 1.6, 0, Math.PI * 2);
      ctx.fill();
      // label
      ctx.font = '600 12px Inter, system-ui, sans-serif';
      ctx.fillStyle = `rgba(238,241,255,${0.9 * life})`;
      ctx.textBaseline = 'middle';
      ctx.fillText(s.label.toUpperCase(), sx + 12, sy);
      ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 * life})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + 5, sy); ctx.lineTo(sx + 9, sy); ctx.stroke();
    }

    requestAnimationFrame(draw);
  }

  /* static frame for reduced-motion / no-animation users */
  function staticFrame() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(toScreenX(0), toScreenY(0));
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(226,192,120,0.14)';
    ctx.lineWidth = 0.8; ctx.stroke(path);
    ctx.strokeStyle = 'rgba(210,214,236,0.08)';
    for (const g of GYRI) ctx.stroke(g);
    ctx.restore();
    for (const pt of particles) {
      const [r, g, b] = HUES[pt.hue];
      ctx.fillStyle = `rgba(${r},${g},${b},0.55)`;
      ctx.beginPath();
      ctx.arc(toScreenX(pt.vx), toScreenY(pt.vy), 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  window.addEventListener('resize', () => { resize(); if (reduced) staticFrame(); });
  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('mousemove', (e) => {
    pointer.tx = e.clientX; pointer.ty = e.clientY; pointer.active = true;
  });
  window.addEventListener('mouseout', () => { pointer.active = false; pointer.tx = pointer.ty = -9999; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) { pointer.tx = e.touches[0].clientX; pointer.ty = e.touches[0].clientY; pointer.active = true; }
  }, { passive: true });

  resize();
  updateScroll();
  if (reduced) staticFrame();
  else requestAnimationFrame(draw);
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
