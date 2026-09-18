(() => {
  'use strict';

  const body = document.body;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const progress = document.querySelector('.scroll-progress');
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const sculpture = document.querySelector('.scroll-sculpture');
  let sculptureTarget = 0;
  let sculptureAngle = 0;
  const depth = document.querySelector('.sculpture-depth');
  const timeline = document.querySelector('.career-timeline');
  const motionButton = document.querySelector('.motion-toggle');
  const motionLabel = document.querySelector('.motion-label');
  const motionIcon = document.querySelector('.motion-icon');
  const cards = [...document.querySelectorAll('.project-card')];
  const countElements = [...document.querySelectorAll('[data-count]')];
  const canvas = document.getElementById('gold-field');
  const context = canvas?.getContext('2d');
  const counters = new Map();
  const counted = new WeakSet();
  const revealElements = [...new Set(document.querySelectorAll('.reveal, .section-heading, .project-card'))];

  let userPaused = false;
  let paused = reducedMotion.matches;
  let heroVisible = true;
  let frame = 0;
  let scrollFrame = 0;
  let lastTick = 0;
  let lastPaint = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  let pendingHero = null;
  let pendingCard = null;
  const dustOffset = { x: 0, y: 0 };
  const clamp = (value, low = 0, high = 1) => Math.min(high, Math.max(low, value));

  // Distribute glitter along the photo frame, not across the face.
  const particles = Array.from({ length: 112 }, (_, index) => ({
    position: index / 112,
    size: 0.8 + (index % 5) * 0.28,
    speed: 0.009 + (index % 4) * 0.002,
    phase: index * 1.8
  }));

  function finishCounters() {
    counters.forEach((state, element) => { element.textContent = String(state.target); });
    counters.clear();
  }

  function startCounter(element) {
    if (counted.has(element)) return;
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;
    counted.add(element);
    if (paused || document.hidden) { element.textContent = String(target); return; }
    element.textContent = '0';
    counters.set(element, { target, start: performance.now() });
    requestRender();
  }

  function settleReveal(element) {
    element.classList.add('is-visible', 'reveal-settled');
    element.style.setProperty('--reveal-delay', '0ms');
  }

  function showElement(element) {
    element.classList.add('is-visible');
    if (paused) { settleReveal(element); return; }
    const settle = event => {
      if (event.target === element && event.propertyName === 'opacity') {
        settleReveal(element);
        element.removeEventListener('transitionend', settle);
      }
    };
    element.addEventListener('transitionend', settle);
  }

  function resetCard(card) {
    ['--tilt-x', '--tilt-y', '--spot-x', '--spot-y', '--spot-opacity'].forEach(property => card.style.removeProperty(property));
  }

  function resetHero() {
    ['--hero-x', '--hero-y', '--hero-rx', '--hero-ry'].forEach(property => depth?.style.removeProperty(property));
    dustOffset.x = 0;
    dustOffset.y = 0;
  }

  function resetPointers() {
    pendingHero = null;
    pendingCard = null;
    resetHero();
    cards.forEach(resetCard);
  }

  function processPointers() {
    if (!pendingHero && !pendingCard) return;
    if (!finePointer.matches) { resetPointers(); return; }
    if (pendingHero && depth) {
      const rect = hero.getBoundingClientRect();
      const x = clamp((pendingHero.x - rect.left) / rect.width) - 0.5;
      const y = clamp((pendingHero.y - rect.top) / rect.height) - 0.5;
      depth.style.setProperty('--hero-x', (x * 18).toFixed(2) + 'px');
      depth.style.setProperty('--hero-y', (y * 14).toFixed(2) + 'px');
      depth.style.setProperty('--hero-rx', (-y * 4).toFixed(2) + 'deg');
      depth.style.setProperty('--hero-ry', (x * 5).toFixed(2) + 'deg');
      dustOffset.x = x * 10;
      dustOffset.y = y * 8;
      pendingHero = null;
    }
    if (pendingCard) {
      const { card, x, y } = pendingCard;
      const rect = card.getBoundingClientRect();
      const px = clamp((x - rect.left) / rect.width);
      const py = clamp((y - rect.top) / rect.height);
      card.style.setProperty('--spot-x', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--spot-y', (py * 100).toFixed(1) + '%');
      card.style.setProperty('--spot-opacity', '1');
      if (card.classList.contains('reveal-settled')) {
        card.style.setProperty('--tilt-x', ((0.5 - py) * 3).toFixed(2) + 'deg');
        card.style.setProperty('--tilt-y', ((px - 0.5) * 3).toFixed(2) + 'deg');
      }
      pendingCard = null;
    }
  }

  function drawParticles(time) {
    if (!context || !width || !height) return;
    context.clearRect(0, 0, width, height);
    const total = innerWidth < 761 ? 60 : particles.length;
    for (let i = 0; i < total; i++) {
      const p = particles[i];
      const perimeter = ((i / total + time * p.speed) % 1) * 4;
      const side = Math.floor(perimeter);
      const along = perimeter - side;
      const inset = 0.055 + Math.sin(time * 0.7 + p.phase) * 0.018;
      let x, y;
      if (side === 0) { x = inset + along * (1 - inset * 2); y = inset; }
      else if (side === 1) { x = 1 - inset; y = inset + along * (1 - inset * 2); }
      else if (side === 2) { x = 1 - inset - along * (1 - inset * 2); y = 1 - inset; }
      else { x = inset; y = 1 - inset - along * (1 - inset * 2); }
      x *= width; y *= height;
      const twinkle = (1 + Math.sin(time * 1.1 + p.phase)) / 2;
      const alpha = 0.3 + twinkle * 0.65;
      context.fillStyle = 'rgba(255,221,153,' + alpha + ')';
      context.beginPath();
      context.arc(x, y, p.size, 0, Math.PI * 2);
      context.fill();
      if (i % 9 === 0) {
        const radius = p.size * (2 + twinkle * 2);
        context.strokeStyle = 'rgba(255,238,195,' + alpha * 0.65 + ')';
        context.lineWidth = 0.7;
        context.beginPath();
        context.moveTo(x - radius, y); context.lineTo(x + radius, y);
        context.moveTo(x, y - radius); context.lineTo(x, y + radius);
        context.stroke();
      }
    }
  }

  function needsFrame() {
    return !paused && !document.hidden &&
      ((context && heroVisible) || counters.size > 0 || pendingHero || pendingCard ||
        (sculpture && Math.abs(sculptureTarget - sculptureAngle) > 0.02));
  }

  function requestRender() {
    if (!frame && needsFrame()) frame = requestAnimationFrame(render);
  }

  function stopRender() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTick = 0;
  }

  function render(timestamp) {
    frame = 0;
    if (paused || document.hidden) { lastTick = 0; return; }
    const delta = lastTick ? Math.min((timestamp - lastTick) / 1000, 0.08) : 0;
    lastTick = timestamp;
    processPointers();
    if (sculpture && Math.abs(sculptureTarget - sculptureAngle) > 0.02) {
      const ease = 1 - Math.exp(-Math.max(delta, 1 / 60) * 9);
      sculptureAngle += (sculptureTarget - sculptureAngle) * ease;
      if (Math.abs(sculptureTarget - sculptureAngle) < 0.02) sculptureAngle = sculptureTarget;
      sculpture.style.transform = 'rotate(' + sculptureAngle.toFixed(3) + 'deg)';
    }
    if (heroVisible && context) {
      elapsed += delta;
      if (timestamp - lastPaint >= 32) { drawParticles(elapsed); lastPaint = timestamp; }
    }
    counters.forEach((state, element) => {
      const fraction = clamp((timestamp - state.start) / 900);
      const eased = 1 - Math.pow(1 - fraction, 3);
      element.textContent = String(Math.round(state.target * eased));
      if (fraction >= 1) { element.textContent = String(state.target); counters.delete(element); }
    });
    if (!needsFrame()) lastTick = 0;
    requestRender();
  }

  function updateScroll() {
    scrollFrame = 0;
    const distance = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (distance > 0 ? clamp(scrollY / distance) : 0) + ')';
    header.classList.toggle('is-scrolled', scrollY > 24);
    if (sculpture && !paused && !document.hidden) {
      sculptureTarget = (distance > 0 ? clamp(scrollY / distance) : 0) * 360;
      requestRender();
    }
    if (depth) {
      const rect = hero.getBoundingClientRect();
      const amount = !paused && finePointer.matches ? clamp(-rect.top / rect.height) : 0;
      depth.style.setProperty('--hero-scroll', (amount * 30).toFixed(2) + 'px');
      depth.style.setProperty('--hero-scale', (1 + amount * 0.025).toFixed(4));
    }
    if (timeline) {
      const rect = timeline.getBoundingClientRect();
      const amount = paused ? 1 : clamp((innerHeight * 0.75 - rect.top) / Math.max(rect.height, 1));
      timeline.style.setProperty('--timeline-progress', amount.toFixed(4));
    }
  }

  function queueScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }

  function resizeCanvas() {
    if (!context) return;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    drawParticles(elapsed);
  }

  function syncMotion() {
    paused = userPaused || reducedMotion.matches;
    body.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.disabled = reducedMotion.matches;
    motionButton.setAttribute('aria-label', reducedMotion.matches
      ? 'Animations disabled by your device setting'
      : paused ? 'Resume decorative animations' : 'Pause decorative animations');
    motionLabel.textContent = reducedMotion.matches ? 'Motion off' : paused ? 'Play motion' : 'Pause motion';
    motionIcon.textContent = paused ? '▷' : 'Ⅱ';
    if (paused) {
      stopRender();
      sculptureTarget = sculptureAngle;
      finishCounters();
      resetPointers();
      revealElements.forEach(settleReveal);
      countElements.forEach(element => { element.textContent = element.dataset.count; });
    }
    updateScroll();
    requestRender();
  }

  // Stagger adjacent cards while retaining normal document order.
  let column = 0;
  cards.forEach(card => {
    const fullWidth = card.classList.contains('project-featured') || card.classList.contains('project-compact');
    if (fullWidth) column = 0;
    card.style.setProperty('--reveal-delay', (column * 100) + 'ms');
    column = fullWidth ? 0 : (column + 1) % 2;
  });

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          showElement(entry.target);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -16px 0px' });

    revealElements.forEach(element => {
      if (paused) settleReveal(element);
      else { element.classList.add('will-reveal'); revealObserver.observe(element); }
    });

    const visibilityObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle('motion-active', entry.isIntersecting);
        if (entry.target.classList.contains('hero-visual')) heroVisible = entry.isIntersecting;
        if (entry.isIntersecting) entry.target.querySelectorAll('[data-count]').forEach(startCounter);
      });
      requestRender();
    }, { threshold: 0.04 });
    document.querySelectorAll('.hero-visual, .hero-copy, .project-card, .impact-grid, .about-intro, .contact-section')
      .forEach(element => visibilityObserver.observe(element));

    const links = [...document.querySelectorAll('.nav-links a')];
    const activeSections = new Map();
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => activeSections.set(entry.target.id, entry.isIntersecting));
      const active = [...activeSections].find(([, isVisible]) => isVisible)?.[0];
      links.forEach(link => {
        if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -55% 0px', threshold: 0 });
    document.querySelectorAll('#work, #about, #experience, #expertise').forEach(section => navObserver.observe(section));
  } else {
    revealElements.forEach(settleReveal);
    document.querySelectorAll('.hero-visual, .hero-copy, .project-card, .about-intro, .contact-section')
      .forEach(element => element.classList.add('motion-active'));
  }

  hero.addEventListener('pointermove', event => {
    if (!depth || paused || !finePointer.matches || event.pointerType !== 'mouse') return;
    pendingHero = { x: event.clientX, y: event.clientY };
    requestRender();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { pendingHero = null; resetHero(); });

  cards.forEach(card => {
    card.addEventListener('pointermove', event => {
      if (paused || !finePointer.matches || event.pointerType !== 'mouse') return;
      pendingCard = { card, x: event.clientX, y: event.clientY };
      requestRender();
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      if (pendingCard?.card === card) pendingCard = null;
      resetCard(card);
    });
  });

  motionButton.addEventListener('click', () => { userPaused = !userPaused; syncMotion(); });
  reducedMotion.addEventListener?.('change', syncMotion);
  finePointer.addEventListener?.('change', () => { resetPointers(); queueScroll(); });
  addEventListener('scroll', queueScroll, { passive: true });
  addEventListener('resize', () => { resizeCanvas(); queueScroll(); }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    body.classList.toggle('page-inactive', document.hidden);
    if (document.hidden) { stopRender(); finishCounters(); resetPointers(); }
    else { lastTick = 0; queueScroll(); requestRender(); }
  });
  if ('ResizeObserver' in window && canvas) new ResizeObserver(resizeCanvas).observe(canvas);

  if ('ResizeObserver' in window) new ResizeObserver(queueScroll).observe(document.querySelector('main'));

  body.classList.add('motion-ready');
  body.classList.toggle('page-inactive', document.hidden);
  resizeCanvas();
  syncMotion();
})();
