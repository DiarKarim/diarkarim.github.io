/* Sidebar toggle for mobile */
(function(){
    const btn = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    if(btn && sidebar){
      btn.addEventListener('click', ()=> sidebar.classList.toggle('open'));
    }
  })();
  
  /* Auto sliding carousel: 1 shift per 3 seconds */
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
        // after transition, snap back to 0
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
  