/* ============================================================
   Diar Abdlkarim — site interactions
   1. Interactive neural / motor-control canvas
   2. Nav scroll state + mobile menu
   3. Scroll-reveal
   ============================================================ */

/* -----------------------------------------------------------
   1. NEURAL FIELD
   A living network of neurons. Signals (action potentials)
   travel along axons between firing cells. The cursor acts
   as a "motor intention" — nearby neurons are recruited and
   fire toward it, echoing the perception–action loop.
   ----------------------------------------------------------- */
(function neuralField() {
  const canvas = document.getElementById('neuralCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR;
  const pointer = { x: -9999, y: -9999, active: false };

  const COLORS = {
    cyan:   [52, 229, 255],
    violet: [139, 107, 255],
    magenta:[255, 92, 200],
    amber:  [255, 194, 75],
  };
  const palette = [COLORS.cyan, COLORS.violet, COLORS.magenta, COLORS.cyan, COLORS.amber];

  let neurons = [];
  let signals = [];
  let links = [];   // adjacency: {a, b, d}

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function build() {
    const density = Math.min(90, Math.max(34, Math.floor((W * H) / 20000)));
    neurons = [];
    for (let i = 0; i < density; i++) {
      const c = palette[i % palette.length];
      neurons.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.14,
        vy: (Math.random() - 0.5) * 0.14,
        r: 1.3 + Math.random() * 1.8,
        c,
        charge: Math.random(),        // 0..1 membrane potential
        threshold: 0.82 + Math.random() * 0.12,
        cooldown: 0,
        pulse: 0,                     // visual flash 0..1
      });
    }
    computeLinks();
  }

  const LINK_DIST = 150;
  function computeLinks() {
    links = [];
    for (let i = 0; i < neurons.length; i++) {
      for (let j = i + 1; j < neurons.length; j++) {
        const dx = neurons[i].x - neurons[j].x;
        const dy = neurons[i].y - neurons[j].y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) links.push({ a: i, b: j, d });
      }
    }
  }

  function neighbours(idx) {
    const out = [];
    for (const l of links) {
      if (l.a === idx) out.push(l.b);
      else if (l.b === idx) out.push(l.a);
    }
    return out;
  }

  function fire(idx) {
    const n = neurons[idx];
    if (n.cooldown > 0) return;
    n.charge = 0;
    n.cooldown = 40 + Math.random() * 40;
    n.pulse = 1;
    const targets = neighbours(idx);
    let sent = 0;
    for (const t of targets) {
      if (sent >= 3) break;
      if (Math.random() < 0.7) { emitSignal(idx, t); sent++; }
    }
  }

  function emitSignal(fromIdx, toIdx) {
    signals.push({
      from: fromIdx,
      to: toIdx,
      t: 0,
      speed: 0.012 + Math.random() * 0.02,
      c: neurons[fromIdx].c,
    });
  }

  let linkTimer = 0;

  function step() {
    ctx.clearRect(0, 0, W, H);

    linkTimer++;
    if (linkTimer > 30) { computeLinks(); linkTimer = 0; }

    // --- axons ---
    for (const l of links) {
      const a = neurons[l.a], b = neurons[l.b];
      const alpha = (1 - l.d / LINK_DIST) * 0.5;
      ctx.strokeStyle = `rgba(120,150,230,${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // --- neurons ---
    for (let i = 0; i < neurons.length; i++) {
      const n = neurons[i];

      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      n.x = Math.max(0, Math.min(W, n.x));
      n.y = Math.max(0, Math.min(H, n.y));

      if (n.cooldown > 0) n.cooldown--;
      n.charge += 0.0022 + Math.random() * 0.0016;

      if (pointer.active) {
        const dx = pointer.x - n.x;
        const dy = pointer.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 190) {
          const pull = (1 - d / 190);
          n.vx += (dx / (d + 0.01)) * pull * 0.012;
          n.vy += (dy / (d + 0.01)) * pull * 0.012;
          n.charge += pull * 0.02;
        }
      }
      n.vx *= 0.985; n.vy *= 0.985;

      if (n.charge >= n.threshold) fire(i);
      if (n.pulse > 0) n.pulse -= 0.045;

      const [r, g, bb] = n.c;
      if (n.pulse > 0) {
        const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 30 * n.pulse + 6);
        gr.addColorStop(0, `rgba(${r},${g},${bb},${0.35 * n.pulse})`);
        gr.addColorStop(1, `rgba(${r},${g},${bb},0)`);
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 30 * n.pulse + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const chargeGlow = 0.4 + n.charge * 0.6;
      ctx.fillStyle = `rgba(${r},${g},${bb},${chargeGlow})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + n.pulse * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- signals (action potentials) ---
    for (let s = signals.length - 1; s >= 0; s--) {
      const sig = signals[s];
      const a = neurons[sig.from], b = neurons[sig.to];
      if (!a || !b) { signals.splice(s, 1); continue; }
      sig.t += sig.speed;
      if (sig.t >= 1) {
        b.charge = Math.min(b.threshold + 0.05, b.charge + 0.5);
        signals.splice(s, 1);
        continue;
      }
      const x = a.x + (b.x - a.x) * sig.t;
      const y = a.y + (b.y - a.y) * sig.t;
      const [r, g, bb] = sig.c;

      const tail = 0.12;
      const tx = a.x + (b.x - a.x) * Math.max(0, sig.t - tail);
      const ty = a.y + (b.y - a.y) * Math.max(0, sig.t - tail);
      const grad = ctx.createLinearGradient(tx, ty, x, y);
      grad.addColorStop(0, `rgba(${r},${g},${bb},0)`);
      grad.addColorStop(1, `rgba(${r},${g},${bb},0.9)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.fillStyle = `rgba(${r},${g},${bb},1)`;
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (signals.length > 160) signals.splice(0, signals.length - 160);

    requestAnimationFrame(step);
  }

  function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = true;
  }
  window.addEventListener('mousemove', (e) => setPointer(e.clientX, e.clientY));
  window.addEventListener('mouseout', () => { pointer.active = false; pointer.x = pointer.y = -9999; });
  window.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  // click / tap = deliberate motor command: force-fire nearest neuron
  window.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    if (e.clientY - rect.top > H) return; // only within hero region
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    let best = -1, bd = 1e9;
    for (let i = 0; i < neurons.length; i++) {
      const d = Math.hypot(neurons[i].x - px, neurons[i].y - py);
      if (d < bd) { bd = d; best = i; }
    }
    if (best >= 0 && bd < 220) { neurons[best].cooldown = 0; neurons[best].charge = 1; fire(best); }
  });

  window.addEventListener('resize', resize);
  resize();

  if (reduced) {
    // static single frame for reduced-motion users
    ctx.clearRect(0, 0, W, H);
    for (const l of links) {
      const a = neurons[l.a], b = neurons[l.b];
      ctx.strokeStyle = `rgba(120,150,230,${(1 - l.d / LINK_DIST) * 0.25})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    for (const n of neurons) {
      const [r, g, bb] = n.c;
      ctx.fillStyle = `rgba(${r},${g},${bb},0.7)`;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    requestAnimationFrame(step);
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
