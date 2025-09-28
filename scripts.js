/* Sidebar toggle + drawer-handle behavior for the menu button */
(function(){
  const btn = document.getElementById('menuToggle');
  const sidebar = document.querySelector('.sidebar');
  if(!btn || !sidebar) return;

  const mq = window.matchMedia('(max-width: 980px)');

  function isMobile(){ return mq.matches; }

  function setBtnVisibility(){
    btn.style.display = isMobile() ? 'block' : 'none';
    if(!isMobile()){
      btn.style.left = '14px';      // reset on desktop
      sidebar.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  }

  function nudgeHandle(){
    if(!isMobile()){ btn.style.left = '14px'; return; }
    const open = sidebar.classList.contains('open');
    const sbWidth = open ? sidebar.getBoundingClientRect().width : 0;
    btn.style.left = (14 + sbWidth) + 'px'; // park to the right of the drawer when open
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', ()=>{
    sidebar.classList.toggle('open');
    nudgeHandle();
  });

  // Keep the handle aligned on viewport changes or orientation flips
  mq.addEventListener('change', ()=>{ setBtnVisibility(); nudgeHandle(); });
  window.addEventListener('resize', nudgeHandle);
  document.addEventListener('visibilitychange', nudgeHandle);

  setBtnVisibility();
  nudgeHandle();
})();

/* Auto sliding carousel: 1 shift per 3 seconds (unchanged) */
(function(){
  const track = document.querySelector('.carousel-track');
  if(!track) return;

  let slides = Array.from(track.children);
  if(slides.length === 0) return;

  const firstClone = slides[0].cloneNode(true);
  track.appendChild(firstClone);

  let index = 0;
  let timer = null;
  const DURATION = 3000;
  const TRANS_MS = 600;

  const move = (i, animate=true)=>{
    track.style.transition = animate ? `transform ${TRANS_MS}ms ease` : 'none';
    track.style.transform = `translateX(-${i * 100}%)`;
  };

  const next = ()=>{
    index++;
    move(index, true);
    if(index === slides.length){
      setTimeout(()=>{
        index = 0;
        move(index, false);
      }, TRANS_MS + 20);
    }
  };

  const start = ()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(!timer) timer = setInterval(next, DURATION);
  };
  const stop = ()=>{ if(timer){ clearInterval(timer); timer = null; } };

  start();
  track.addEventListener('mouseenter', stop);
  track.addEventListener('mouseleave', start);
  document.addEventListener('visibilitychange', ()=> document.hidden ? stop() : start());
})();

/* Hero network animation */
(function(){
  const canvas = document.getElementById('heroNetworkCanvas');
  const header = document.querySelector('.header');
  if(!canvas || !header) return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let nodes = [];

  const pointer = { x: 0, y: 0, active: false, last: 0 };

  function updatePointer(evt){
    const rect = canvas.getBoundingClientRect();
    pointer.x = (evt.clientX || (evt.touches && evt.touches[0]?.clientX) || 0) - rect.left;
    pointer.y = (evt.clientY || (evt.touches && evt.touches[0]?.clientY) || 0) - rect.top;
    pointer.active = true;
    pointer.last = performance.now();
  }

  function deactivatePointer(){
    pointer.active = false;
  }

  header.addEventListener('pointermove', updatePointer, { passive: true });
  header.addEventListener('pointerdown', updatePointer, { passive: true });
  header.addEventListener('pointerleave', deactivatePointer);
  header.addEventListener('touchmove', updatePointer, { passive: true });
  header.addEventListener('touchend', deactivatePointer);

  function resize(){
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildNodes();
  }

  function buildNodes(){
    const area = width * height;
    const density = 0.00012;
    const targetCount = Math.max(60, Math.min(180, Math.floor(area * density)));
    nodes = new Array(targetCount).fill(null).map(()=>{
      const depth = 0.3 + Math.random() * 0.7;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35 * depth,
        vy: (Math.random() - 0.5) * 0.35 * depth,
        depth,
        radius: 1.2 + depth * 3.4,
      };
    });
  }

  function limitVelocity(node, limit){
    const mag = Math.hypot(node.vx, node.vy);
    if(mag > limit){
      const scale = limit / (mag || 1);
      node.vx *= scale;
      node.vy *= scale;
    }
  }

  function update(){
    const now = performance.now();
    if(pointer.active && now - pointer.last > 1200){
      pointer.active = false;
    }

    ctx.clearRect(0, 0, width, height);

    const maxDist = Math.min(width, height) * 0.35;
    const influence = Math.min(width, height) * 0.45;

    for(const node of nodes){
      let ax = (Math.random() - 0.5) * 0.02;
      let ay = (Math.random() - 0.5) * 0.02;

      if(pointer.active){
        const dx = pointer.x - node.x;
        const dy = pointer.y - node.y;
        const dist = Math.hypot(dx, dy) + 0.0001;
        if(dist < influence){
          const force = (1 - dist / influence) * 0.18 * node.depth;
          ax += (dx / dist) * force;
          ay += (dy / dist) * force;
        }
      }

      node.vx = (node.vx + ax) * 0.98;
      node.vy = (node.vy + ay) * 0.98;
      limitVelocity(node, 0.45 + node.depth * 0.9);

      node.x += node.vx;
      node.y += node.vy;

      if(node.x < -60) node.x = width + 60;
      if(node.x > width + 60) node.x = -60;
      if(node.y < -60) node.y = height + 60;
      if(node.y > height + 60) node.y = -60;
    }

    drawConnections(maxDist);
    drawNodes();

  }

  function drawConnections(maxDist){
    for(let i = 0; i < nodes.length; i++){
      const a = nodes[i];
      for(let j = i + 1; j < nodes.length; j++){
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if(dist > maxDist) continue;
        const depthMix = (a.depth + b.depth) * 0.5;
        const opacity = Math.max(0, 0.35 * (1 - dist / maxDist) * depthMix);
        if(opacity < 0.02) continue;
        ctx.strokeStyle = `rgba(148, 197, 255, ${opacity})`;
        ctx.lineWidth = 0.6 + depthMix * 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  function drawNodes(){
    for(const node of nodes){
      const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 1.6);
      const highlight = Math.min(1, 0.4 + node.depth * 0.5);
      gradient.addColorStop(0, `rgba(226, 242, 255, ${highlight})`);
      gradient.addColorStop(0.4, `rgba(168, 216, 255, ${highlight * 0.7})`);
      gradient.addColorStop(1, 'rgba(28, 78, 118, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
})();
