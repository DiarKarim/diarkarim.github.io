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
