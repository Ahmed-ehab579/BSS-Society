/* Homepage behaviour: intro, reveals, header, carousel, benefit cards, forms */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro animation ---------- */
  // Force a style flush so the start state is committed, then animate (rAF would stall in background tabs)
  const startIntro = () => {
    void document.body.offsetWidth;
    document.documentElement.classList.add('is-loaded');
  };
  const heroImg = document.querySelector('.hero__media img');
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', startIntro, { once: true });
    heroImg.addEventListener('error', startIntro, { once: true });
    setTimeout(startIntro, 1200); // never wait too long for the image
  } else {
    startIntro();
  }

  /* ---------- Scroll reveals ---------- */
  const revealEls = document.querySelectorAll('[data-reveal]');
  const GROUP = '[data-track], [data-reveal-group]';
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // A scroller reveals all its items at once (off-screen items never intersect)
        const items = entry.target.matches(GROUP)
          ? entry.target.querySelectorAll('[data-reveal]')
          : [entry.target];
        items.forEach((el) => el.classList.add('is-visible'));
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    const isScroller = (el) => el.scrollWidth > el.clientWidth + 1;
    const groups = [...document.querySelectorAll(GROUP)].filter(isScroller);
    revealEls.forEach((el) => { if (!groups.some((g) => g.contains(el))) io.observe(el); });
    groups.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- Count-up numbers and "reached" steps ---------- */
  const counters = document.querySelectorAll('[data-count]');
  const flowRows = document.querySelectorAll('[data-flow]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = Number(el.dataset.count);
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / 1600, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
          if (t < 1) requestAnimationFrame(tick);
        };
        el.textContent = '0';
        requestAnimationFrame(tick);
        countIO.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIO.observe(el));

    // A step turns green once it reaches the middle of the screen
    const flowIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add('is-done');
          flowIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -50% 0px' });
    flowRows.forEach((el) => flowIO.observe(el));
  } else {
    flowRows.forEach((el) => el.classList.add('is-done'));
  }

  /* ---------- Header: shadow, hide on scroll down, mobile menu ---------- */
  const header = document.querySelector('[data-header]');
  const nav = document.querySelector('[data-nav]');
  const toggle = document.querySelector('[data-menu-toggle]');
  let lastY = window.scrollY;

  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Scroll-linked effects (parallax + zoom) ---------- */
  const parallax = document.querySelector('[data-parallax]');
  const zoomEls = document.querySelectorAll('[data-zoom]');
  const drawEls = document.querySelectorAll('[data-draw]');
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 4);
    const menuOpen = toggle.getAttribute('aria-expanded') === 'true';
    header.classList.toggle('is-hidden', !menuOpen && y > 240 && y > lastY);
    lastY = y;

    if (!reduceMotion) {
      const vh = window.innerHeight;
      if (parallax) {
        const r = parallax.getBoundingClientRect();
        if (r.bottom > 0 && r.top < vh) {
          parallax.style.setProperty('--parallax', `${(r.top / vh) * -40}px`);
        }
      }
      zoomEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        // 0 when entering from below, 1 when the element has scrolled to the top
        const p = Math.min(Math.max(1 - (r.top + r.height / 2) / (vh + r.height / 2), 0), 1);
        el.style.setProperty('--zoom', (1.12 - p * 0.12).toFixed(4));
      });
      // Draw the path top to bottom as it passes the lower part of the screen
      drawEls.forEach((el) => {
        const r = el.getBoundingClientRect();
        const p = Math.min(Math.max((vh * 0.8 - r.top) / Math.max(r.height * 0.85, vh * 0.35), 0), 1);
        el.style.setProperty('--draw', p.toFixed(4));
      });
    } else {
      drawEls.forEach((el) => el.style.setProperty('--draw', 1));
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Carousel ---------- */
  document.querySelectorAll('[data-carousel]').forEach((root) => {
    const track = root.querySelector('[data-track]');
    const viewport = root.querySelector('[data-viewport]');
    const prev = root.querySelector('[data-prev]');
    const next = root.querySelector('[data-next]');

    const step = () => {
      const card = track.firstElementChild;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };
    const update = () => {
      const max = track.scrollWidth - track.clientWidth - 2;
      prev.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= max;
      viewport.classList.toggle('is-end', track.scrollLeft >= max);
    };
    const go = (dir) => track.scrollBy({ left: dir * step(), behavior: reduceMotion ? 'auto' : 'smooth' });

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    track.tabIndex = 0;
    track.setAttribute('aria-label', 'Library topics');
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    // Drag to scroll with a mouse (touch uses native scrolling)
    let startX = 0, startLeft = 0, dragging = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      dragging = true; startX = e.clientX; startLeft = track.scrollLeft;
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) track.classList.add('is-dragging');
      track.scrollLeft = startLeft - dx;
    });
    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      // Let scroll-snap settle on the nearest card
      const s = step();
      track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior: 'smooth' });
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    update();
  });

  /* ---------- Benefit cards: measure how far to slide to show the text ---------- */
  const benefits = document.querySelectorAll('[data-benefit]');
  const measureBenefits = () => benefits.forEach((card) => {
    const p = card.querySelector('p');
    const gap = parseFloat(getComputedStyle(p.parentElement).rowGap) || 0;
    card.style.setProperty('--shift', `${p.offsetHeight + gap}px`);
  });
  measureBenefits();
  window.addEventListener('resize', measureBenefits);
  if (document.fonts) document.fonts.ready.then(measureBenefits);
  // Touch screens have no hover: tap toggles the card
  benefits.forEach((card) => card.addEventListener('click', () => {
    if (window.matchMedia('(hover: none)').matches) card.classList.toggle('is-open');
  }));

  /* ---------- Forms: client-side validation only (no backend yet) ---------- */
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const messageFor = (input) => {
    const v = input.value.trim();
    if (!v) return 'This field is required.';
    if (input.type === 'email' && !emailOk(v)) return 'Please enter a valid email address.';
    return '';
  };
  const check = (input, errorEl) => {
    const msg = messageFor(input);
    errorEl.textContent = msg;
    input.setAttribute('aria-invalid', String(Boolean(msg)));
    return !msg;
  };

  const contact = document.querySelector('[data-contact-form]');
  if (contact) {
    const fields = [...contact.querySelectorAll('input, textarea')];
    const errFor = (f) => document.getElementById(f.getAttribute('aria-describedby'));
    fields.forEach((f) => f.addEventListener('blur', () => { if (f.value) check(f, errFor(f)); }));
    fields.forEach((f) => f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') check(f, errFor(f)); }));
    contact.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = fields.map((f) => check(f, errFor(f)));
      const firstBad = fields[results.indexOf(false)];
      if (firstBad) firstBad.focus();
      // TODO: send to the contact service once it is chosen.
    });
  }

  const newsletter = document.querySelector('[data-newsletter]');
  if (newsletter) {
    const input = newsletter.querySelector('input');
    const err = document.getElementById('nl-err');
    newsletter.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!check(input, err)) input.focus();
      // TODO: send to the newsletter service once it is chosen.
    });
  }
})();
