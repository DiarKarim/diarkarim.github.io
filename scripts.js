/* ============================================================
   Diar Abdlkarim — site interactions
   1. Nav (mobile menu + scrollspy)
   2. Scroll reveal with stagger
   3. Hero: scroll unfold + interactive hand-tracking canvas
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
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open')));
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
  const canvasWrap = document.querySelector('.hero-canvas-wrap');
  if (!hero || !inner || REDUCED) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    const p = Math.min(Math.max(window.scrollY / (hero.offsetHeight * 0.7), 0), 1);
    inner.style.opacity = String(1 - p * 1.15);
    inner.style.transform = `translateY(${p * -46}px) scale(${1 - p * 0.05})`;
    if (canvasWrap) {
      canvasWrap.style.opacity = String(1 - p * 1.3);
      canvasWrap.style.transform = `translateY(${p * 40}px) scale(${1 + p * 0.08})`;
    }
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
})();

/* -----------------------------------------------------------
   3b. HAND-TRACKING CANVAS — a live markerless-tracking motif:
       21-joint hand skeleton, breathing finger motion, fingertip
       tracking brackets, gentle pointer parallax.
   ----------------------------------------------------------- */
(function handCanvas() {
  const canvas = document.getElementById('handCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // 21 hand landmarks (normalised, y up): wrist + 4 joints per digit
  const BASE = [
    [0.00, -0.92],                                              // 0 wrist
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

  let W = 0, H = 0, dpr = 1;
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  // pointer parallax
  let px = 0, py = 0, tx = 0, ty = 0;
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // only animate while on screen
  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(canvas);
  }

  const project = (pt, t) => {
    const scale = Math.min(W, H) * 0.46;
    const cx = W / 2 + px * 14;
    const cy = H * 0.56 - py * 10;
    const sway = Math.sin(t * 0.0006) * 0.05 + px * 0.12; // slow yaw
    const x = pt[0] * Math.cos(sway) * scale;
    const y = -pt[1] * scale;
    return [cx + x, cy + y];
  };

  const frame = (t) => {
    requestAnimationFrame(frame);
    if (!visible) return;
    px += (tx - px) * 0.04;
    py += (ty - py) * 0.04;
    ctx.clearRect(0, 0, W, H);

    // pose: each finger curls with its own phase (foreshorten toward knuckle)
    const pts = BASE.map((p) => [p[0], p[1]]);
    if (!REDUCED) {
      FINGERS.forEach((f, fi) => {
        const curl = 0.16 + 0.16 * Math.sin(t * 0.0011 + fi * 0.9);
        const mcp = BASE[f[0]];
        f.forEach((ji, seg) => {
          if (seg === 0) return;
          const k = 1 - curl * (seg / 3) * 0.55;
          pts[ji][0] = mcp[0] + (BASE[ji][0] - mcp[0]) * k;
          pts[ji][1] = mcp[1] + (BASE[ji][1] - mcp[1]) * k;
        });
      });
    }
    const P = pts.map((p) => project(p, t));

    // bones
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(245,245,247,0.35)';
    ctx.beginPath();
    BONES.forEach(([a, b]) => { ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(P[b][0], P[b][1]); });
    ctx.stroke();

    // joints
    P.forEach((p, i) => {
      const tip = TIPS.includes(i);
      ctx.beginPath();
      ctx.arc(p[0], p[1], tip ? 3.4 : 2.4, 0, Math.PI * 2);
      ctx.fillStyle = tip ? '#2997ff' : 'rgba(245,245,247,0.9)';
      ctx.fill();
      if (tip) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 7 + Math.sin(t * 0.003 + i) * 1.4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(41,151,255,0.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // tracking bracket around the hand's bounding box
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
    const x0 = Math.min(...xs) - 22, x1 = Math.max(...xs) + 22;
    const y0 = Math.min(...ys) - 22, y1 = Math.max(...ys) + 22;
    const L = 16;
    ctx.strokeStyle = 'rgba(245,245,247,0.28)';
    ctx.lineWidth = 1.5;
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(([x, y, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * L, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * L);
      ctx.stroke();
    });
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
