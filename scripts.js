/* ============================================================
   Diar Abdlkarim — site interactions
   1. Nav scroll state + mobile menu + scrollspy
   2. Scroll-reveal
   ============================================================ */

/* -----------------------------------------------------------
   1. NAV
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
   2. COURSE SIGN-UP (courses.html only)
   - preselect the course from a ?course= URL param
   - show a success banner after Formspree redirects back with ?ok=1
   ----------------------------------------------------------- */
(function signup() {
  const params = new URLSearchParams(window.location.search);

  const select = document.getElementById('course');
  if (select) {
    const map = {
      mocap: 'Motion Capture for Scientists',
      unity: 'VR with Unity for Scientists',
      printing: '3D Modelling & Printing',
    };
    const wanted = map[(params.get('course') || '').toLowerCase()];
    if (wanted) {
      Array.from(select.options).forEach((o) => {
        if (o.value.replace('&amp;', '&') === wanted) o.selected = true;
      });
    }
    // in-page "Choose this course" links preselect + scroll
    document.querySelectorAll('[data-course]').forEach((a) => {
      a.addEventListener('click', () => {
        const w = map[a.getAttribute('data-course')];
        if (!w) return;
        Array.from(select.options).forEach((o) => {
          if (o.value.replace('&amp;', '&') === w) o.selected = true;
        });
      });
    });
  }

  const banner = document.getElementById('formSuccess');
  if (banner && params.get('ok') === '1') {
    banner.classList.add('show');
    banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
