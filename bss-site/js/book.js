/* Book details page: cover tilt, share, save, related resources */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ } },
  };

  /* ---------- Cover tilts gently toward the pointer ---------- */
  const cover = document.querySelector('[data-tilt]');
  if (cover && !reduceMotion && window.matchMedia('(hover: hover)').matches) {
    cover.addEventListener('pointermove', (e) => {
      const r = cover.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      cover.classList.add('is-tilting');
      cover.style.setProperty('--ry', `${x * 6}deg`);
      cover.style.setProperty('--rx', `${y * -6}deg`);
    });
    cover.addEventListener('pointerleave', () => {
      cover.classList.remove('is-tilting');
      cover.style.setProperty('--ry', '0deg');
      cover.style.setProperty('--rx', '0deg');
    });
  }

  /* ---------- Share: native share sheet, else copy the link ---------- */
  const share = document.querySelector('[data-share]');
  const toast = document.querySelector('[data-toast]');
  let toastTimer;
  const showToast = (text) => {
    toast.textContent = text;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 1800);
  };
  share?.addEventListener('click', async () => {
    const data = { title: document.title, url: location.href };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* cancelled */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(location.href);
      showToast('Link copied');
    } catch {
      showToast('Copy the link from the address bar');
    }
  });

  /* ---------- Save this book (remembered in this browser) ---------- */
  const save = document.querySelector('[data-save-book]');
  if (save) {
    const set = (on) => {
      save.setAttribute('aria-pressed', String(on));
      save.setAttribute('aria-label', on ? 'Remove from saved' : 'Save this book');
    };
    set(store.get('bss-book-saved', false));
    save.addEventListener('click', () => {
      const on = save.getAttribute('aria-pressed') !== 'true';
      set(on);
      store.set('bss-book-saved', on);
    });
  }

  /* ---------- Related resources: scroll buttons ---------- */
  const list = document.querySelector('[data-lessons]');
  const prev = document.querySelector('[data-lessons-prev]');
  const next = document.querySelector('[data-lessons-next]');
  if (list && prev && next) {
    const step = () => list.firstElementChild.getBoundingClientRect().width + 30;
    const update = () => {
      prev.disabled = list.scrollLeft <= 2;
      next.disabled = list.scrollLeft >= list.scrollWidth - list.clientWidth - 2;
    };
    prev.addEventListener('click', () => list.scrollBy({ left: -step() }));
    next.addEventListener('click', () => list.scrollBy({ left: step() }));
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Related resources: mark done / save ---------- */
  document.querySelectorAll('[data-lesson]').forEach((lesson) => {
    const done = lesson.querySelector('[data-done]');
    const keep = lesson.querySelector('[data-save]');
    const status = lesson.querySelector('[data-status] span:last-child');
    done.addEventListener('click', () => {
      const on = !lesson.classList.contains('is-done');
      lesson.classList.toggle('is-done', on);
      done.setAttribute('aria-pressed', String(on));
      done.setAttribute('aria-label', on ? 'Mark as not done' : 'Mark as done');
      status.textContent = on ? 'Completed' : 'Not started';
    });
    keep.addEventListener('click', () => {
      const on = keep.getAttribute('aria-pressed') !== 'true';
      keep.setAttribute('aria-pressed', String(on));
      keep.setAttribute('aria-label', on ? 'Remove from saved' : 'Save for later');
    });
  });
})();
