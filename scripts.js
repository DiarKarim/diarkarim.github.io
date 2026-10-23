/* ============================================================
   Diar Abdlkarim — site interactions
   1. Nav (mobile menu, scrollspy, progress hairline)
   2. Scroll reveal
   3. Hero: live hand-landmark tracker (canvas)
   4. Field rail buttons
   5. Animated counters
   6. Ambient video (play only while visible)
   7. Course sign-up (preselect + picker cards + success banner)
   8. Leadership lightbox
   No scroll-jacking: the page always scrolls natively.
   ============================================================ */

document.documentElement.classList.add('js');
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_IO = 'IntersectionObserver' in window;

/* -----------------------------------------------------------
   1. NAV
   ----------------------------------------------------------- */
(function nav() {
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    const setOpen = (open) => {
      links.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 960) setOpen(false); });
  }

  // scrollspy
  const anchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = anchors.map((a) => document.querySelector(a.hash)).filter(Boolean);
  if (sections.length && HAS_IO) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        anchors.forEach((a) => a.classList.toggle('active', a.hash === '#' + e.target.id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => spy.observe(s));
  }

  // reading-progress hairline
  const bar = document.querySelector('.nav-progress');
  if (bar) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${dh > 0 ? Math.min(Math.max(window.scrollY / dh, 0), 1) : 0})`;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
})();

/* -----------------------------------------------------------
   2. SCROLL REVEAL — staggered among siblings
   ----------------------------------------------------------- */
(function reveal() {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length) return;
  if (!HAS_IO || REDUCED) { items.forEach((i) => i.classList.add('in')); return; }

  const groups = new Map();
  items.forEach((el) => {
    const p = el.parentElement;
    const idx = groups.get(p) || 0;
    groups.set(p, idx + 1);
    if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(idx * 0.08, 0.4)}s`);
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach((i) => io.observe(i));

  // safety net: anything already on screen at load shows immediately
  requestAnimationFrame(() => items.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
  }));
})();

/* -----------------------------------------------------------
   3. HERO — a 21-landmark hand that cycles through gestures,
      with raw (noisy) vs filtered tip estimates, fingertip
      trails and a live coordinate readout.
   ----------------------------------------------------------- */
(function heroHand() {
  const canvas = document.getElementById('handCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const readout = document.getElementById('handReadout');
  const poseLabel = document.getElementById('handPose');

  // normalised landmarks, y up (MediaPipe-style topology)
  const BASE = [
    [0.00, -0.92],
    [-0.34, -0.72], [-0.54, -0.50], [-0.67, -0.32], [-0.77, -0.16],
    [-0.30, -0.05], [-0.34, 0.28], [-0.36, 0.50], [-0.37, 0.68],
    [-0.08, 0.00], [-0.08, 0.36], [-0.08, 0.62], [-0.08, 0.82],
    [0.14, -0.03], [0.16, 0.30], [0.17, 0.55], [0.18, 0.73],
    [0.34, -0.10], [0.40, 0.14], [0.44, 0.33], [0.47, 0.48],
  ];
  const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
  const TIPS = [4, 8, 12, 16, 20];
  const BONES = [];
  FINGERS.forEach((f) => { BONES.push([0, f[0]]); for (let i = 0; i < 3; i++) BONES.push([f[i], f[i + 1]]); });
  BONES.push([5, 9], [9, 13], [13, 17]);

  // [thumb, index, middle, ring, pinky] curl 0..1, pinch 0..1
  const POSES = [
    { name: 'Open palm', c: [0, 0, 0, 0, 0], pinch: 0 },
    { name: 'Precision pinch', c: [0.2, 0.25, 0.12, 0.15, 0.2], pinch: 1 },
    { name: 'Point', c: [0.7, 0, 0.92, 0.92, 0.92], pinch: 0 },
    { name: 'Two-finger', c: [0.7, 0, 0, 0.92, 0.92], pinch: 0 },
    { name: 'Power grasp', c: [0.6, 0.75, 0.78, 0.8, 0.82], pinch: 0 },
  ];
  const HOLD = 2.2, MOVE = 0.9;

  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  // pointer parallax
  let px = 0, py = 0, tx = 0, ty = 0;
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  });
  canvas.parentElement.addEventListener('pointerleave', () => { tx = 0; ty = 0; });

  const curlFinger = (pts, f, curl, isThumb) => {
    // frontal projection of a flexing finger: each segment foreshortens
    // by cos of the cumulative flexion angle
    const ang = isThumb ? [0.35, 0.7, 1.0] : [0.9, 1.9, 2.6];
    let prev = pts[f[0]];
    for (let i = 1; i < 4; i++) {
      const a = BASE[f[i - 1]], b = BASE[f[i]];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const k = Math.cos(Math.min(ang[i - 1] * curl, Math.PI * 0.95));
      let nx = prev[0] + dx * k, ny = prev[1] + dy * k;
      if (isThumb) { nx = lerp(nx, -0.05, curl * 0.35 * i / 3); ny = lerp(ny, -0.25, curl * 0.3 * i / 3); }
      pts[f[i]] = [nx, ny];
      prev = pts[f[i]];
    }
  };

  const trails = TIPS.map(() => []);
  const raw = TIPS.map(() => [0, 0]);
  let last = performance.now(), t = 0, running = true, lastReadout = 0;

  const frame = (now) => {
    const dt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
    last = now;
    if (!REDUCED) t += dt;

    // which pose, and how far into the transition
    const cycle = HOLD + MOVE;
    const k = Math.floor(t / cycle) % POSES.length;
    const local = t % cycle;
    const m = local < HOLD ? 0 : ease((local - HOLD) / MOVE);
    const A = POSES[k], B = POSES[(k + 1) % POSES.length];
    const curl = A.c.map((c, i) => lerp(c, B.c[i], m));
    const pinch = lerp(A.pinch, B.pinch, m);

    if (poseLabel) poseLabel.textContent = (m < 0.5 ? A : B).name;

    const pts = BASE.map((p) => [p[0], p[1]]);
    FINGERS.forEach((f, i) => curlFinger(pts, f, curl[i], i === 0));
    if (pinch > 0) {
      const ti = pts[4], ii = pts[8];
      const mx = (ti[0] + ii[0]) / 2 + 0.02, my = (ti[1] + ii[1]) / 2 + 0.02;
      pts[4] = [lerp(ti[0], mx, pinch), lerp(ti[1], my, pinch)];
      pts[8] = [lerp(ii[0], mx + 0.03, pinch), lerp(ii[1], my + 0.03, pinch)];
      pts[3] = [lerp(pts[3][0], (pts[3][0] + mx) / 2, pinch * 0.5), lerp(pts[3][1], (pts[3][1] + my) / 2, pinch * 0.5)];
      pts[7] = [lerp(pts[7][0], (pts[7][0] + mx) / 2, pinch * 0.4), lerp(pts[7][1], (pts[7][1] + my) / 2, pinch * 0.4)];
    }

    // place in panel: gentle sway + pointer parallax
    px = lerp(px, tx, 0.06); py = lerp(py, ty, 0.06);
    const s = Math.min(W, H) * 0.34;
    const cx = W * 0.5 + Math.sin(t * 0.5) * W * 0.02 + px * W * 0.03;
    const cy = H * 0.52 + Math.cos(t * 0.4) * H * 0.015 + py * H * 0.03;
    const rot = Math.sin(t * 0.35) * 0.08 + px * 0.08;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const P = pts.map(([x, y]) => {
      const X = x * cr - y * sr, Y = x * sr + y * cr;
      return [cx + X * s, cy - Y * s];
    });

    ctx.clearRect(0, 0, W, H);

    // scan line
    const scanY = (t * 0.22 % 1) * H;
    const g = ctx.createLinearGradient(0, scanY - 60, 0, scanY);
    g.addColorStop(0, 'rgba(200,245,61,0)');
    g.addColorStop(1, 'rgba(200,245,61,0.035)');
    ctx.fillStyle = g;
    ctx.fillRect(0, scanY - 60, W, 60);
    ctx.fillStyle = 'rgba(200,245,61,0.18)';
    ctx.fillRect(0, scanY, W, 1);

    // bounding box
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    P.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
    const pad = 18;
    ctx.strokeStyle = 'rgba(238,240,242,0.18)';
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - pad, y0 - pad, x1 - x0 + pad * 2, y1 - y0 + pad * 2);
    ctx.setLineDash([]);

    // palm fill
    ctx.beginPath();
    [0, 1, 5, 9, 13, 17].forEach((i, j) => (j ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1])));
    ctx.closePath();
    ctx.fillStyle = 'rgba(200,245,61,0.05)';
    ctx.fill();

    // trails
    TIPS.forEach((ti, i) => {
      const tr = trails[i];
      tr.push([P[ti][0], P[ti][1]]);
      if (tr.length > 26) tr.shift();
      ctx.beginPath();
      tr.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = 'rgba(200,245,61,0.22)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // bones
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(238,240,242,0.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    BONES.forEach(([a, b]) => { ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); });
    ctx.stroke();

    // joints
    P.forEach(([x, y], i) => {
      if (TIPS.includes(i)) return;
      ctx.beginPath();
      ctx.arc(x, y, i === 0 ? 4 : 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0c0f';
      ctx.fill();
      ctx.strokeStyle = 'rgba(238,240,242,0.85)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
    });

    // tips: raw noisy estimate (grey) vs filtered (signal)
    TIPS.forEach((ti, i) => {
      const [x, y] = P[ti];
      if (!REDUCED) { raw[i][0] = lerp(raw[i][0], (Math.random() - 0.5) * 9, 0.5); raw[i][1] = lerp(raw[i][1], (Math.random() - 0.5) * 9, 0.5); }
      ctx.beginPath();
      ctx.arc(x + raw[i][0], y + raw[i][1], 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(238,240,242,0.35)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(200,245,61,0.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#c8f53d';
      ctx.fill();
    });

    // label at index tip
    const [ix, iy] = P[8];
    ctx.strokeStyle = 'rgba(200,245,61,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ix - 8, iy - 8); ctx.lineTo(ix - 30, iy - 30); ctx.lineTo(ix - 50, iy - 30); ctx.stroke();
    ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace';
    ctx.fillStyle = 'rgba(238,240,242,0.85)';
    ctx.textAlign = 'right';
    ctx.fillText('INDEX_TIP · 08', ix - 56, iy - 27);
    ctx.textAlign = 'left';

    if (readout && now - lastReadout > 120) {
      lastReadout = now;
      const nx = (pts[8][0] * 100).toFixed(1), ny = (pts[8][1] * 100).toFixed(1);
      const nz = (curl[1] * -42).toFixed(1);
      readout.textContent = `x ${nx}  y ${ny}  z ${nz} mm`;
    }

    if (running && !REDUCED) requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
  if (REDUCED) return;

  if (HAS_IO) {
    new IntersectionObserver(([e]) => {
      const vis = e.isIntersecting;
      if (vis && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
      running = vis;
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  });
})();

/* -----------------------------------------------------------
   4. FIELD RAIL — prev/next buttons for the native scroller
   ----------------------------------------------------------- */
(function rail() {
  const vp = document.querySelector('.rail-viewport');
  if (!vp) return;
  const step = () => {
    const item = vp.querySelector('.rail-item');
    return item ? item.getBoundingClientRect().width + 16 : vp.clientWidth * 0.8;
  };
  document.querySelectorAll('[data-rail]').forEach((b) =>
    b.addEventListener('click', () =>
      vp.scrollBy({ left: step() * (b.dataset.rail === 'next' ? 1 : -1), behavior: REDUCED ? 'auto' : 'smooth' })));
})();

/* -----------------------------------------------------------
   5. COUNTERS
   ----------------------------------------------------------- */
(function counters() {
  const els = document.querySelectorAll('[data-count]');
  if (!els.length) return;
  const run = (el) => {
    const target = parseFloat(el.dataset.count);
    const decimals = (el.dataset.count.split('.')[1] || '').length;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (REDUCED) { el.textContent = prefix + target.toFixed(decimals) + suffix; return; }
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / 1400, 1);
      el.textContent = prefix + (target * (1 - Math.pow(1 - p, 3))).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!HAS_IO) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
})();

/* -----------------------------------------------------------
   6. AMBIENT VIDEO — loops only play while on screen
   ----------------------------------------------------------- */
(function ambientVideo() {
  const vids = document.querySelectorAll('video[data-ambient]');
  if (!vids.length) return;
  if (REDUCED || !HAS_IO) { vids.forEach((v) => v.pause()); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); }
      else v.pause();
    });
  }, { threshold: 0.2 });
  vids.forEach((v) => io.observe(v));
})();

/* -----------------------------------------------------------
   7. COURSE SIGN-UP (courses.html)
   ----------------------------------------------------------- */
(function signup() {
  const params = new URLSearchParams(window.location.search);
  const select = document.getElementById('course');
  const map = {
    engine: 'Game Engines for Scientists — May 2027 (4 days)',
    unity: 'Game Engines for Scientists — May 2027 (4 days)',
    mocap: 'Motion Capture for Scientists — June 2027 (3 days)',
    printing: '3D Modelling & Printing — on request (1 day)',
  };
  const sync = (value) => document.querySelectorAll('.pick').forEach((p) =>
    p.classList.toggle('selected', map[p.dataset.course] === value));
  const choose = (key) => {
    if (!select || !map[key]) return;
    Array.from(select.options).forEach((o) => { o.selected = o.value === map[key]; });
    sync(map[key]);
  };

  if (select) {
    const wanted = (params.get('course') || '').toLowerCase();
    if (map[wanted]) choose(wanted);
    document.querySelectorAll('.pick[data-course]').forEach((p) => {
      p.addEventListener('click', () => choose(p.dataset.course));
      p.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(p.dataset.course); }
      });
    });
    document.querySelectorAll('a[data-course]').forEach((a) =>
      a.addEventListener('click', () => choose(a.getAttribute('data-course'))));
    select.addEventListener('change', () => sync(select.value));
  }

  const banner = document.getElementById('formSuccess');
  if (banner && params.get('ok') === '1') {
    banner.classList.add('show');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();

/* -----------------------------------------------------------
   8. LEADERSHIP LIGHTBOX
   ----------------------------------------------------------- */
(function leadLightbox() {
  const cards = document.querySelectorAll('.lead-card');
  if (!cards.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'lightbox';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = '<figure class="lightbox-frame"><img alt="" /><figcaption class="lightbox-cap"></figcaption></figure>';
  document.body.appendChild(overlay);
  const frame = overlay.querySelector('.lightbox-frame');
  const img = overlay.querySelector('img');
  const cap = overlay.querySelector('.lightbox-cap');

  const close = () => { overlay.classList.remove('open'); document.body.style.overflow = ''; };
  const open = (card) => {
    const thumb = card.querySelector('.lead-media img');
    const body = card.querySelector('.lead-body');
    if (!thumb) return;
    img.src = thumb.src; img.alt = thumb.alt;
    cap.innerHTML = body ? body.innerHTML : '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  cards.forEach((card) => {
    const media = card.querySelector('.lead-media');
    if (!media) return;
    media.setAttribute('role', 'button');
    media.setAttribute('tabindex', '0');
    media.setAttribute('aria-label', 'Enlarge image');
    media.addEventListener('click', () => open(card));
    media.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); } });
  });
  overlay.addEventListener('click', (e) => { if (!frame.contains(e.target) || e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });
})();
