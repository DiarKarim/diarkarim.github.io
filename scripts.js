/* ============================================================
   Diar Abdlkarim — site interactions
   1. Nav (mobile menu + scrollspy)
   2. Scroll reveal with stagger
   3. Hero scroll unfold + gesture layer (one hand, whole page)
   4. Pinned story (scenes crossfade with scroll)
   5. Animated counters
   6. Course sign-up (preselect + picker cards + success banner)
   ============================================================ */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && links.classList.contains('open')) { setOpen(false); toggle.focus(); }
    });
  }

  // scrollspy: highlight the section currently in view
  const navAnchors = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  const sections = navAnchors
    .map((a) => document.querySelector(a.hash))
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        navAnchors.forEach((a) =>
          a.classList.toggle('active', a.hash === '#' + e.target.id));
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach((s) => spy.observe(s));
  }
})();

/* -----------------------------------------------------------
   2. SCROLL REVEAL — staggered within each section
   ----------------------------------------------------------- */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || REDUCED || !items.length) {
    items.forEach((i) => i.classList.add('in'));
    return;
  }
  // stagger siblings that reveal together
  document.querySelectorAll('section, .container').forEach((scope) => {
    scope.querySelectorAll(':scope > .reveal, :scope > * > .reveal').forEach((el, i) => {
      if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', `${Math.min(i * 0.09, 0.45)}s`);
    });
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  items.forEach((i) => io.observe(i));

  // feature media scale-in
  const media = document.querySelectorAll('.feature-media');
  if (media.length) {
    const mio = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); mio.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    media.forEach((m) => mio.observe(m));
  }
})();

/* -----------------------------------------------------------
   3a. HERO SCROLL UNFOLD — content recedes as you scroll away
   ----------------------------------------------------------- */
(function heroUnfold() {
  const hero = document.querySelector('.hero');
  const inner = document.querySelector('.hero-inner');
  const cap = document.querySelector('.hero-canvas-wrap');
  if (!hero || !inner || REDUCED) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const p = Math.min(Math.max(window.scrollY / (hero.offsetHeight * 0.7), 0), 1);
    inner.style.opacity = String(1 - p * 1.15);
    inner.style.transform = `translateY(${p * -46}px) scale(${1 - p * 0.05})`;
    if (cap) cap.style.opacity = String(1 - p * 1.3);
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
})();

/* -----------------------------------------------------------
   3b. GESTURE LAYER — one hand, continuous through the page.
       A fixed full-viewport canvas draws a 21-landmark hand that
       travels between per-section anchors and morphs through a
       gesture vocabulary: rest → pulse (EEG) → press → mocap →
       point → pinch (jitter filter) → hover → slide → grasp →
       swipe → offer → wave. Props (surfaces, cube, traces) fade
       in with their beat. Narrow screens and reduced motion get
       the hero-only hand.
   ----------------------------------------------------------- */
(function gestureLayer() {
  const canvas = document.getElementById('gestureCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const q = (s) => document.querySelector(s);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---- viewport ---- */
  let VW = 0, VH = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    VW = window.innerWidth; VH = window.innerHeight;
    canvas.width = VW * dpr; canvas.height = VH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stale = true;
  };
  let stale = false; // beat triggers + fallback cache need refreshing
  resize();
  window.addEventListener('resize', resize);

  // sampled live so enabling Reduce Motion mid-session takes effect
  const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const roaming = () => VW >= 1160 && !rmq.matches;

  /* ---- hand model: 21 landmarks (normalised, y up) ---- */
  const BASE = [
    [0.00, -0.92],                                                  // 0 wrist
    [-0.34, -0.72], [-0.54, -0.50], [-0.67, -0.32], [-0.77, -0.16], // thumb
    [-0.30, -0.05], [-0.34, 0.28], [-0.36, 0.50], [-0.37, 0.68],    // index
    [-0.08, 0.00], [-0.08, 0.36], [-0.08, 0.62], [-0.08, 0.82],     // middle
    [0.14, -0.03], [0.16, 0.30], [0.17, 0.55], [0.18, 0.73],        // ring
    [0.34, -0.10], [0.40, 0.14], [0.44, 0.33], [0.47, 0.48],        // pinky
  ];
  const FINGERS = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]];
  const BONES = [];
  FINGERS.forEach((f) => { BONES.push([0, f[0]]); for (let i = 0; i < 3; i++) BONES.push([f[i], f[i + 1]]); });
  BONES.push([5, 9], [9, 13], [13, 17]); // knuckle arc
  const TIPS = [4, 8, 12, 16, 20];

  /* pose builder: per-finger curl (foreshorten toward the knuckle),
     splay (spread/compress), meet (pinch thumb+index), enclose (grasp) */
  function pose(o) {
    const curls = o.curls || [0, 0, 0, 0, 0];
    const pts = BASE.map((p) => [p[0], p[1]]);
    FINGERS.forEach((f, fi) => {
      const c = curls[fi];
      if (!c) return;
      const mcp = BASE[f[0]];
      for (let j = 1; j < 4; j++) {
        const k = 1 - c * (j / 3) * 0.78;
        pts[f[j]][0] = mcp[0] + (BASE[f[j]][0] - mcp[0]) * k;
        pts[f[j]][1] = mcp[1] + (BASE[f[j]][1] - mcp[1]) * k;
      }
    });
    if (o.splay != null && o.splay !== 1) {
      pts.forEach((p, i) => {
        if (i === 0) return;
        const w = i <= 4 ? 0.55 : 1; // the thumb compresses less
        p[0] = -0.06 + (p[0] + 0.06) * lerp(1, o.splay, w);
      });
    }
    if (o.meet) {
      const m = [(pts[4][0] + pts[8][0]) / 2, (pts[4][1] + pts[8][1]) / 2];
      const W = [0, 0.18, 0.52, 1];
      [FINGERS[0], FINGERS[1]].forEach((chain) => {
        const dx = (m[0] - pts[chain[3]][0]) * o.meet;
        const dy = (m[1] - pts[chain[3]][1]) * o.meet;
        chain.forEach((ji, j) => { pts[ji][0] += dx * W[j]; pts[ji][1] += dy * W[j]; });
      });
    }
    if (o.enclose) {
      FINGERS.forEach((f) => f.forEach((ji, j) => {
        const w = [0, 0.12, 0.32, 0.55][j] * o.enclose;
        pts[ji][0] += (-0.05 - pts[ji][0]) * w;
        pts[ji][1] += (-0.2 - pts[ji][1]) * w;
      }));
    }
    return pts;
  }

  /* ---- ink: crossfades between dark-bg and light-bg palettes ---- */
  const PAL = {
    bone:  [[245, 245, 247, 0.38], [29, 29, 31, 0.4]],
    joint: [[245, 245, 247, 0.9],  [29, 29, 31, 0.78]],
    tip:   [[41, 151, 255, 1],     [0, 113, 227, 1]],
    faint: [[245, 245, 247, 0.28], [29, 29, 31, 0.26]],
  };
  const col = (name, mix, a) => {
    const d = PAL[name][0], l = PAL[name][1];
    const r = Math.round(lerp(d[0], l[0], mix));
    const g = Math.round(lerp(d[1], l[1], mix));
    const b = Math.round(lerp(d[2], l[2], mix));
    return `rgba(${r},${g},${b},${(lerp(d[3], l[3], mix) * (a == null ? 1 : a)).toFixed(3)})`;
  };

  /* ---- pointer parallax (hero only) ---- */
  let PX = 0, PY = 0, TX = 0, TY = 0;
  window.addEventListener('pointermove', (e) => {
    TX = (e.clientX / VW - 0.5) * 2;
    TY = (e.clientY / VH - 0.5) * 2;
  }, { passive: true });

  /* ---- keyframe interpolation for gesture cycles ---- */
  function keyf(ph, keys) {
    if (ph <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (ph <= keys[i][0]) {
        const p = (ph - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
        return lerp(keys[i - 1][1], keys[i][1], 0.5 - 0.5 * Math.cos(p * Math.PI));
      }
    }
    return keys[keys.length - 1][1];
  }
  const noise1 = (x) => Math.sin(x * 1.7) * 0.5 + Math.sin(x * 3.1 + 1.3) * 0.32 + Math.sin(x * 5.3 + 2.1) * 0.18;

  /* ---- anchors ---- */
  function sideAnchor(sel, side, yf) {
    return () => {
      const el = q(sel); if (!el) return null;
      const r = el.getBoundingClientRect();
      // the hand's stage is the gutter beside the anchored block: the
      // centred section heading itself, or the element's real container
      // (which also handles .wide sections correctly)
      const contEl = el.classList.contains('section-head') ? el : (el.closest('.container') || el);
      const cr = contEl.getBoundingClientRect();
      const gap = Math.max(side < 0 ? cr.left : VW - cr.right, 0); // true gutter width
      const s = clamp(gap * 0.42, 44, 120);
      const inset = Math.max(gap / 2, s * 0.92 + 8); // keep the whole hand on screen
      const rawY = r.top + r.height * (yf == null ? 0.5 : yf);
      // ease the hand out quickly once its anchor scrolls past, and when
      // the gutter is too tight for it to sit beside the content — it
      // ghosts out rather than overlapping text or cards
      const fadeY = clamp((rawY - 60) / 170, 0, 1);
      const fitFade = clamp((gap - (s * 1.9 + 20)) / 35 + 1, 0, 1);
      return {
        x: side < 0 ? inset : VW - inset,
        y: clamp(rawY, 150, VH * 0.8),
        s,
        fade: fadeY * fitFade,
      };
    };
  }
  const heroAnchor = () => {
    const el = q('.hero-canvas-wrap'); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.54, s: Math.min(r.width, r.height) * 0.46 };
  };
  const storyAnchor = () => {
    const s = clamp((VW / 2 - 450) * 0.5, 60, 118);
    return { x: Math.min(VW / 2 + 495, VW - s - 30), y: VH * 0.52, s };
  };
  // the contact copy is flush with the container edge, so the wave
  // lives in the open space beneath the contact links instead
  const contactAnchor = () => {
    const el = q('#contact .contact-links'); if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width * 0.5, y: clamp(r.bottom + 140, 150, VH * 0.86), s: 84 };
  };

  /* ---- gesture samples: (t, anchor) -> {pts, rot, ox, oy} ---- */
  const restSample = (parallax) => (t) => {
    const curls = [0, 1, 2, 3, 4].map((fi) => 0.16 + 0.16 * Math.sin(t * 0.0011 + fi * 0.9));
    return {
      pts: pose({ curls }),
      rot: Math.sin(t * 0.0006) * 0.05 + (parallax ? PX * 0.12 : 0),
      ox: parallax ? PX * 14 : 0,
      oy: parallax ? -PY * 10 : 0,
    };
  };
  const eegSample = (t) => ({
    pts: pose({ curls: [0.05, 0.03, 0.02, 0.04, 0.07], splay: 1.1 }),
    rot: Math.sin(t * 0.0008) * 0.06,
    ox: 0, oy: Math.sin(t * 0.0013) * 4,
  });
  const pressD = (t) => keyf((t % 1700) / 1700, [[0, 0], [0.3, 1], [0.55, 1], [0.85, 0], [1, 0]]);
  const pressSample = (t, a) => ({
    pts: pose({ curls: [0.55, 0, 0.85, 0.9, 0.94], splay: 0.92 }),
    rot: 2.75,
    ox: 0, oy: pressD(t) * a.s * 0.28 - a.s * 0.02,
  });
  const mocapSample = (t) => ({
    pts: pose({ curls: [0.04, 0.02, 0.02, 0.03, 0.05], splay: 1.08 }),
    rot: Math.sin(t * 0.0009) * 0.16,
    ox: 0, oy: 0,
  });
  const pointSample = (t) => {
    const nudge = keyf((t % 1500) / 1500, [[0, 0], [0.22, 1], [0.5, 0], [1, 0]]);
    return {
      pts: pose({ curls: [0.55, 0, 0.85, 0.9, 0.94], splay: 0.92 }),
      rot: 1.3,
      ox: -4 - nudge * 8, oy: 0,
    };
  };
  const pinchSample = (t) => ({
    pts: pose({ curls: [0.22, 0.3, 0.5, 0.62, 0.74], meet: 0.6 + 0.36 * (0.5 + 0.5 * Math.sin(t * 0.0034)) }),
    rot: -0.2,
    ox: 0, oy: Math.sin(t * 0.0012) * 3,
  });
  const flatSample = (t) => ({
    pts: pose({ curls: [0.12, 0, 0, 0, 0.05], splay: 0.55 }),
    rot: 1.45,
    ox: 0, oy: Math.sin(t * 0.0015) * 4 - 2,
  });
  const slideSample = (t, a) => ({
    pts: pose({ curls: [0.5, 0, 0, 0.85, 0.92], splay: 0.8 }),
    rot: 2.9,
    ox: Math.sin(t * 0.0016) * a.s * 0.55,
    oy: a.s * 0.03,
  });
  const liftD = (t) => keyf((t % 2600) / 2600, [[0, 0], [0.12, 0], [0.38, 1], [0.6, 1], [0.85, 0], [1, 0]]);
  const graspSample = (t, a) => ({
    pts: pose({ curls: [0.55, 0.62, 0.62, 0.64, 0.68], splay: 0.85, enclose: 0.55 }),
    rot: -0.25,
    ox: 0, oy: -liftD(t) * a.s * 0.3,
  });
  const swipePh = (t) => (t % 2100) / 2100;
  const swipeSample = (t, a) => ({
    pts: pose({ curls: [0.55, 0, 0, 0.88, 0.92], splay: 0.72 }),
    rot: 2.6,
    ox: keyf(swipePh(t), [[0, 0], [0.25, -0.3], [0.42, 0.45], [0.75, 0.1], [1, 0]]) * a.s,
    oy: 0,
  });
  const offerSample = (t) => ({
    pts: pose({ curls: [0.08, 0.05, 0.04, 0.07, 0.12], splay: 1.06 }),
    rot: -0.5 + Math.sin(t * 0.0012) * 0.04,
    ox: 0, oy: Math.sin(t * 0.0012) * 5,
  });
  const waveSample = (t) => ({
    pts: pose({ curls: [0.06, 0.04, 0.03, 0.05, 0.1], splay: 1.08 }),
    rot: Math.sin(t * 0.0045) * 0.24,
    ox: 0, oy: 0,
  });

  /* ---- projection: local pose -> screen points ---- */
  function mkTx(a, s, pivot) {
    const rot = s.rot || 0, cos = Math.cos(rot), sin = Math.sin(rot);
    const px = pivot ? pivot[0] : 0, py = pivot ? pivot[1] : 0;
    const ox = s.ox || 0, oy = s.oy || 0;
    return (p) => {
      const x = p[0] - px, y = p[1] - py;
      return [a.x + (x * cos - y * sin + px) * a.s + ox, a.y - (x * sin + y * cos + py) * a.s + oy];
    };
  }

  /* ---- props (drawn beneath the hand) ---- */
  function along(path, u) {
    const seg = []; let L = 0;
    for (let i = 1; i < path.length; i++) {
      const d = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      seg.push(d); L += d;
    }
    let d = u * L;
    for (let i = 0; i < seg.length; i++) {
      if (d <= seg[i]) {
        const k = seg[i] ? d / seg[i] : 0;
        return [lerp(path[i][0], path[i + 1][0], k), lerp(path[i][1], path[i + 1][1], k)];
      }
      d -= seg[i];
    }
    return path[path.length - 1];
  }

  function bracketProps(c, h, t, a) {
    const xs = h.P.map((p) => p[0]), ys = h.P.map((p) => p[1]);
    const x0 = Math.min(...xs) - 20, x1 = Math.max(...xs) + 20;
    const y0 = Math.min(...ys) - 20, y1 = Math.max(...ys) + 20;
    const L = 15;
    c.strokeStyle = col('faint', h.mix, a);
    c.lineWidth = 1.5;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => {
      c.beginPath();
      c.moveTo(x + sx * L, y); c.lineTo(x, y); c.lineTo(x, y + sy * L);
      c.stroke();
    });
  }

  // EEG: a pulse travels wrist -> fingertip along each digit
  function pulseProps(c, h, t, a) {
    for (let fi = 0; fi < 5; fi++) {
      const chain = [0].concat(FINGERS[fi]).map((i) => h.P[i]);
      const p = along(chain, (t * 0.00038 + fi * 0.2) % 1);
      c.fillStyle = col('tip', h.mix, a * 0.95);
      c.beginPath(); c.arc(p[0], p[1], 2.4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = col('tip', h.mix, a * 0.35);
      c.lineWidth = 1;
      c.beginPath(); c.arc(p[0], p[1], 5.5, 0, Math.PI * 2); c.stroke();
    }
  }

  // Touch: a film line that deflects under the fingertip, over a glass line
  function pressProps(c, h, t, a) {
    const sy = h.y + h.s * 1.02;
    const half = h.s * 1.05;
    const tip = h.P[8];
    const dip = clamp(tip[1] - (sy - 3), 0, 12);
    const tx = clamp(tip[0], h.x - half * 0.8, h.x + half * 0.8);
    c.strokeStyle = col('joint', h.mix, a * 0.6);
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(h.x - half, sy);
    if (dip > 0.5) {
      c.quadraticCurveTo((h.x - half + tx) / 2, sy, tx, sy + dip);
      c.quadraticCurveTo((tx + h.x + half) / 2, sy, h.x + half, sy);
    } else {
      c.lineTo(h.x + half, sy);
    }
    c.stroke();
    c.strokeStyle = col('faint', h.mix, a * 0.7);
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(h.x - half, sy + 13); c.lineTo(h.x + half, sy + 13); c.stroke();
    c.fillStyle = col('faint', h.mix, a * 0.9);
    [-0.55, 0.55].forEach((k) => { c.beginPath(); c.arc(h.x + half * k, sy + 6.5, 2, 0, Math.PI * 2); c.fill(); });
    if (dip > 9) {
      const r = 6 + ((t * 0.02) % 14);
      c.strokeStyle = col('tip', h.mix, a * clamp(1 - r / 20, 0, 1) * 0.7);
      c.lineWidth = 1;
      c.beginPath(); c.arc(tx, sy + dip, r, 0, Math.PI * 2); c.stroke();
    }
  }

  // Mocap: tracking brackets + a landmark sweep
  function mocapProps(c, h, t, a) {
    bracketProps(c, h, t, a);
    const p = h.P[Math.floor(t * 0.006) % 21];
    c.strokeStyle = col('tip', h.mix, a * 0.9);
    c.lineWidth = 1;
    c.beginPath(); c.arc(p[0], p[1], 6.5, 0, Math.PI * 2); c.stroke();
  }

  // Quest: raw jittery trace enters the pinch, leaves filtered-smooth
  function traceProps(c, h, t, a) {
    const pinch = [(h.P[4][0] + h.P[8][0]) / 2, (h.P[4][1] + h.P[8][1]) / 2];
    const y0 = pinch[1];
    const xR = Math.max(VW / 2 - 330, pinch[0] + 140);
    c.fillStyle = col('tip', h.mix, a * 0.06);
    c.fillRect(pinch[0] + 10, y0 - 6, xR - pinch[0] - 10, 12);
    c.strokeStyle = col('tip', h.mix, a * 0.7);
    c.lineWidth = 1.2;
    c.beginPath();
    let first = true;
    for (let x = 14; x < pinch[0] - 6; x += 5) {
      const amp = 7 * clamp((pinch[0] - x) / 150, 0.12, 1);
      const yn = y0 + noise1(x * 0.11 + t * 0.004) * amp;
      first ? c.moveTo(x, yn) : c.lineTo(x, yn);
      first = false;
    }
    c.stroke();
    c.strokeStyle = col('tip', h.mix, a * 0.9);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(pinch[0] + 6, y0);
    c.lineTo(xR, y0);
    c.stroke();
    c.fillStyle = col('tip', h.mix, a);
    c.beginPath(); c.arc(pinch[0], y0, 2.6, 0, Math.PI * 2); c.fill();
    c.strokeStyle = col('tip', h.mix, a * 0.4);
    c.lineWidth = 1;
    c.beginPath(); c.arc(pinch[0], y0, 8 + Math.sin(t * 0.004) * 2, 0, Math.PI * 2); c.stroke();
  }

  // Leadership: a steady baseline beneath the hovering palm
  function baselineProps(c, h, t, a) {
    const sy = h.y + h.s * 0.55;
    c.strokeStyle = col('faint', h.mix, a);
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(h.x - h.s * 1.1, sy); c.lineTo(h.x + h.s * 1.1, sy); c.stroke();
    c.lineWidth = 1;
    [-0.7, 0, 0.7].forEach((k) => {
      c.beginPath(); c.moveTo(h.x + h.s * k, sy); c.lineTo(h.x + h.s * k, sy + 7); c.stroke();
    });
  }

  // Research: textured strip; bumps squash under the sliding fingertips
  function textureProps(c, h, t, a) {
    const sy = h.y + h.s * 0.72;
    const half = h.s * 1.25;
    const tipX = (h.P[8][0] + h.P[12][0]) / 2;
    c.strokeStyle = col('faint', h.mix, a);
    c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(h.x - half, sy + 6); c.lineTo(h.x + half, sy + 6); c.stroke();
    c.strokeStyle = col('joint', h.mix, a * 0.5);
    c.lineWidth = 1.1;
    for (let x = h.x - half + 8; x < h.x + half - 8; x += 16) {
      const squash = Math.abs(x - tipX) < 18 ? 0.45 : 1;
      c.beginPath();
      c.ellipse(x, sy + 6, 5.5, 5.5 * squash, 0, Math.PI, Math.PI * 2);
      c.stroke();
    }
    const vel = Math.cos(t * 0.0016);
    const rr = 7 + ((t * 0.03) % 16);
    c.strokeStyle = col('tip', h.mix, a * clamp(1 - rr / 25, 0, 1) * 0.8);
    c.lineWidth = 1;
    c.beginPath();
    c.arc(tipX + Math.sign(vel) * 14, sy + 2, rr, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
  }

  // Work: a wireframe cube held in the grasp, lifted off a baseline
  function cubeProps(c, h, t, a) {
    const L = liftD(t);
    const cc = h.tx([-0.16, -0.1]); // the mouth of the grip, between thumb and fingertips
    const s = h.s * 0.34, r = s / 2, o = s * 0.35;
    const F = [[cc[0] - r, cc[1] - r], [cc[0] + r, cc[1] - r], [cc[0] + r, cc[1] + r], [cc[0] - r, cc[1] + r]];
    const B = F.map((p) => [p[0] + o, p[1] - o]);
    c.lineWidth = 1;
    c.strokeStyle = col('faint', h.mix, a * 0.9);
    c.beginPath();
    B.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    F.forEach((p, i) => { c.moveTo(p[0], p[1]); c.lineTo(B[i][0], B[i][1]); });
    c.stroke();
    c.lineWidth = 1.4;
    c.strokeStyle = col('joint', h.mix, a * 0.95);
    c.beginPath();
    F.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.closePath();
    c.stroke();
    c.fillStyle = col('tip', h.mix, a);
    F.forEach((p) => { c.beginPath(); c.arc(p[0], p[1], 2, 0, Math.PI * 2); c.fill(); });
    // ground shadow, fading as the cube lifts
    const sy = h.y + h.s * 0.72;
    const w = s * (1.4 - 0.5 * L);
    c.strokeStyle = col('faint', h.mix, a * (0.9 - 0.55 * L));
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(cc[0] - w, sy); c.lineTo(cc[0] + w, sy); c.stroke();
  }

  // Publications: a page card nudged along by the two-finger swipe
  function cardProps(c, h, t, a) {
    const ph = swipePh(t);
    const shift = keyf(ph, [[0, 0], [0.25, -6], [0.42, 30], [0.8, 0], [1, 0]]);
    const w = h.s * 1.15, ht = h.s * 0.72;
    const cx = h.x + shift, cy = h.y + h.s * 1.05;
    c.strokeStyle = col('joint', h.mix, a * 0.55);
    c.lineWidth = 1.3;
    if (c.roundRect) {
      c.beginPath(); c.roundRect(cx - w / 2, cy - ht / 2, w, ht, 8); c.stroke();
    } else {
      c.strokeRect(cx - w / 2, cy - ht / 2, w, ht);
    }
    // faint text lines on the page
    c.strokeStyle = col('faint', h.mix, a * 0.8);
    c.lineWidth = 1;
    [0.28, 0.5, 0.72].forEach((k, i) => {
      c.beginPath();
      c.moveTo(cx - w * 0.36, cy - ht / 2 + ht * k);
      c.lineTo(cx + w * (i === 2 ? 0.1 : 0.36), cy - ht / 2 + ht * k);
      c.stroke();
    });
    // motion hairlines during the flick
    if (ph > 0.27 && ph < 0.48) {
      const ma = a * (1 - Math.abs(ph - 0.37) / 0.11);
      c.strokeStyle = col('tip', h.mix, clamp(ma, 0, 1) * 0.6);
      [0.3, 0.5, 0.7].forEach((k) => {
        c.beginPath();
        c.moveTo(cx - w / 2 - 26, cy - ht / 2 + ht * k);
        c.lineTo(cx - w / 2 - 8, cy - ht / 2 + ht * k);
        c.stroke();
      });
    }
  }

  /* ---- beats: the hand's journey down the page ----
     Each beat activates at a document-space trigger Y. Triggers are
     cached and refreshed every ~2s (and on resize/load), so the frame
     loop does one rect read per frame instead of one per beat. */
  const secTrig = (sel, f) => (sy) => {
    const e = q(sel);
    return e ? e.getBoundingClientRect().top + sy - VH * (f == null ? 0.55 : f) : Infinity;
  };
  const storyTrig = (frac) => (sy) => {
    const e = q('.story-track');
    if (!e) return Infinity;
    const r = e.getBoundingClientRect();
    return frac === 0 ? r.top + sy - VH * 0.35 : r.top + sy + (r.height - VH) * frac;
  };

  const beats = [
    { id: 'hero', bg: 0, alpha: 1, anchor: heroAnchor, trigger: () => -Infinity, sample: restSample(true), props: bracketProps },
    { id: 'eeg', bg: 0, alpha: 1, anchor: storyAnchor, trigger: storyTrig(0), sample: eegSample, props: pulseProps },
    { id: 'press', bg: 0, alpha: 1, anchor: storyAnchor, trigger: storyTrig(1 / 3), sample: pressSample, props: pressProps },
    { id: 'mocap', bg: 0, alpha: 1, anchor: storyAnchor, trigger: storyTrig(2 / 3), sample: mocapSample, props: mocapProps },
    { id: 'about', bg: 1, alpha: 1, anchor: sideAnchor('#about .about-copy', 1, 0.3), trigger: secTrig('#about'), sample: pointSample },
    { id: 'quest', bg: 0, alpha: 1, anchor: sideAnchor('#quest .container', -1, 0.42), trigger: secTrig('#quest'), sample: pinchSample, props: traceProps },
    { id: 'lead', bg: 1, alpha: 1, anchor: sideAnchor('#leadership .section-head', 1, 0.5), trigger: secTrig('#leadership'), sample: flatSample, props: baselineProps },
    { id: 'research', bg: 1, alpha: 1, anchor: sideAnchor('#research .section-head', -1, 0.45), trigger: secTrig('#research'), sample: slideSample, props: textureProps },
    { id: 'work', bg: 1, alpha: 1, anchor: sideAnchor('#work .section-head', 1, 0.45), trigger: secTrig('#work'), sample: graspSample, props: cubeProps },
    { id: 'pubs', bg: 1, alpha: 1, anchor: sideAnchor('#publications .section-head', -1, 0.45), trigger: secTrig('#publications'), sample: swipeSample, props: cardProps },
    { id: 'funding', bg: 1, alpha: 0.55, anchor: sideAnchor('#funding .section-head', -1, 0.5), trigger: secTrig('#funding'), sample: restSample(false) },
    { id: 'courses', bg: 1, alpha: 1, anchor: sideAnchor('#courses .section-head', 1, 0.5), trigger: secTrig('#courses'), sample: offerSample },
    { id: 'venture', bg: 0, alpha: 0.55, anchor: sideAnchor('#venture .container', 1, 0.5), trigger: secTrig('#venture'), sample: restSample(false) },
    { id: 'contact', bg: 1, alpha: 1, anchor: contactAnchor, trigger: secTrig('#contact'), sample: waveSample, pivot: [0, -0.92] },
  ];

  let trig = null, trigStamp = -Infinity;
  function computeTriggers(now) {
    trigStamp = now;
    const sy = window.scrollY;
    trig = beats.map((b) => b.trigger(sy));
  }
  window.addEventListener('load', () => { stale = true; });
  if (rmq.addEventListener) rmq.addEventListener('change', () => { stale = true; ctx.clearRect(0, 0, VW, VH); fbKey = ''; });

  function activeIndex() {
    const sy = window.scrollY;
    let idx = 0;
    for (let i = 1; i < beats.length; i++) if (sy >= trig[i]) idx = i;
    return idx;
  }

  /* ---- hand rendering ---- */
  function drawHand(c, P, mix, alpha, t) {
    if (alpha <= 0.01) return;
    c.lineWidth = 1.25;
    c.strokeStyle = col('bone', mix, alpha);
    c.beginPath();
    BONES.forEach(([i, j]) => { c.moveTo(P[i][0], P[i][1]); c.lineTo(P[j][0], P[j][1]); });
    c.stroke();
    P.forEach((p, i) => {
      const tip = TIPS.includes(i);
      c.beginPath();
      c.arc(p[0], p[1], tip ? 3.2 : 2.3, 0, Math.PI * 2);
      c.fillStyle = tip ? col('tip', mix, alpha) : col('joint', mix, alpha);
      c.fill();
      if (tip) {
        c.beginPath();
        c.arc(p[0], p[1], 6.5 + Math.sin(t * 0.003 + i) * 1.3, 0, Math.PI * 2);
        c.strokeStyle = col('tip', mix, alpha * 0.35);
        c.lineWidth = 1;
        c.stroke();
        c.lineWidth = 1.25;
      }
    });
  }

  /* ---- fallback: hero-only hand (narrow screens / reduced motion).
     Idles when there is nothing new to draw: past the hero, or with
     reduced motion and no scroll/size change since the last frame. ---- */
  let fbKey = '', fbDrawn = false;
  function fallbackFrame(now) {
    const reduced = rmq.matches;
    const key = Math.round(window.scrollY) + '|' + VW + '|' + VH + '|' + reduced;
    // idle: nothing on canvas and nothing changed, or a static reduced-motion
    // hand that is already drawn — skip even the layout reads
    if (key === fbKey && !stale && (!fbDrawn || reduced)) return;
    const a = heroAnchor();
    const heroEl = q('.hero');
    const p = heroEl ? clamp(window.scrollY / (heroEl.offsetHeight * 0.7), 0, 1) : 0;
    const alpha = a ? clamp(1 - p * 1.3, 0, 1) : 0;
    if (alpha <= 0) {
      if (fbDrawn) { ctx.clearRect(0, 0, VW, VH); fbDrawn = false; }
      fbKey = key;
      stale = false;
      return;
    }
    stale = false;
    fbKey = key;
    ctx.clearRect(0, 0, VW, VH);
    const t = reduced ? 0 : now;
    const s = restSample(!reduced)(t, a);
    if (!reduced) s.oy = (s.oy || 0) + p * 40;
    const aa = { x: a.x, y: a.y, s: a.s * (1 + p * 0.08) };
    const P = s.pts.map(mkTx(aa, s, null));
    bracketProps(ctx, { x: aa.x, y: aa.y, s: aa.s, mix: 0, P }, t, alpha * 0.9);
    drawHand(ctx, P, 0, alpha, t);
    fbDrawn = true;
  }

  /* ---- main loop with snappy morph transitions ---- */
  const DUR = 480;
  let cur = -1, from = null, switchT = 0;
  let lastP = null, lastMix = 0, lastAlpha = 1, lastTx = null;

  const frame = (now) => {
    requestAnimationFrame(frame);

    if (!roaming()) {
      if (lastP) { ctx.clearRect(0, 0, VW, VH); fbKey = ''; } // leaving roaming mode
      cur = -1; from = null; lastP = null; lastTx = null;
      fallbackFrame(now);
      return;
    }

    ctx.clearRect(0, 0, VW, VH);
    PX += (TX - PX) * 0.04;
    PY += (TY - PY) * 0.04;

    if (!trig || stale || now - trigStamp > 2000) {
      // catches monitor moves too, which change dpr without a resize event
      if (Math.min(window.devicePixelRatio || 1, 2) !== dpr) resize();
      computeTriggers(now);
      stale = false;
    }
    const ai = activeIndex();
    if (cur === -1) { cur = ai; }
    else if (ai !== cur) {
      from = lastP ? { P: lastP.map((p) => p.slice()), mix: lastMix, alpha: lastAlpha, tx: lastTx, beat: beats[cur] } : null;
      cur = ai;
      switchT = now;
    }

    const b = beats[cur];
    const a = b.anchor();
    if (!a) return;
    const s = b.sample(now, a);
    const tx = mkTx(a, s, b.pivot);
    let P = s.pts.map(tx);
    let mix = b.bg, alpha = b.alpha * (a.fade == null ? 1 : a.fade);

    const T = from ? clamp((now - switchT) / DUR, 0, 1) : 1;
    const e = easeOut(T);
    if (from && T < 1) {
      P = P.map((p, i) => [lerp(from.P[i][0], p[0], e), lerp(from.P[i][1], p[1], e)]);
      mix = lerp(from.mix, mix, e);
      alpha = lerp(from.alpha, alpha, e);
      // outgoing props fade fast, anchored where they were
      if (from.beat.props && from.tx && T < 0.4) {
        const oa = from.beat.anchor();
        if (oa) from.beat.props(ctx, { x: oa.x, y: oa.y, s: oa.s, mix: from.mix, P: from.P, tx: from.tx }, now, from.alpha * (1 - T / 0.4));
      }
    } else if (from) {
      from = null;
    }

    const h = { x: a.x, y: a.y, s: a.s, mix, P, tx };
    const pa = from ? clamp((T - 0.3) / 0.5, 0, 1) : 1;
    if (b.props) b.props(ctx, h, now, alpha * pa);
    drawHand(ctx, P, mix, alpha, now);

    lastP = P; lastMix = mix; lastAlpha = alpha; lastTx = tx;
  };
  requestAnimationFrame(frame);
})();

/* -----------------------------------------------------------
   4. PINNED STORY — map scroll progress to active scene
   ----------------------------------------------------------- */
(function story() {
  const track = document.querySelector('.story-track');
  if (!track) return;
  const scenes = Array.from(track.querySelectorAll('.scene'));
  const dots = Array.from(track.querySelectorAll('.story-dots span'));
  if (!scenes.length) return;
  if (REDUCED) { scenes.forEach((s) => s.classList.add('active')); return; }

  let ticking = false;
  const update = () => {
    ticking = false;
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const p = Math.min(Math.max(-rect.top / total, 0), 0.999);
    const idx = Math.floor(p * scenes.length);
    scenes.forEach((s, i) => s.classList.toggle('active', i === idx));
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  };
  update();
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
})();

/* -----------------------------------------------------------
   5. COUNTERS — count up when scrolled into view
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
    const dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
})();

/* -----------------------------------------------------------
   6. COURSE SIGN-UP (courses.html)
   - picker cards + ?course= param preselect the <select>
   - success banner after Formspree redirects back with ?ok=1
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

  const choose = (key) => {
    if (!select || !map[key]) return;
    Array.from(select.options).forEach((o) => {
      o.selected = o.value.replace('&amp;', '&') === map[key];
    });
    document.querySelectorAll('.pick').forEach((p) =>
      p.classList.toggle('selected', p.dataset.course === key ||
        (map[p.dataset.course] === map[key])));
  };

  if (select) {
    const wanted = (params.get('course') || '').toLowerCase();
    if (map[wanted]) choose(wanted);

    // picker cards inside the sign-up section
    document.querySelectorAll('.pick[data-course]').forEach((p) => {
      p.addEventListener('click', () => choose(p.dataset.course));
    });
    // "Reserve a place" links on cohort sections
    document.querySelectorAll('a[data-course]').forEach((a) => {
      a.addEventListener('click', () => choose(a.getAttribute('data-course')));
    });
    // keep picker cards in sync if the user changes the select directly
    select.addEventListener('change', () => {
      const key = Object.keys(map).find((k) => map[k] === select.value);
      document.querySelectorAll('.pick').forEach((p) =>
        p.classList.toggle('selected', !!key && map[p.dataset.course] === map[key]));
    });
  }

  const banner = document.getElementById('formSuccess');
  if (banner && params.get('ok') === '1') {
    banner.classList.add('show');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();
