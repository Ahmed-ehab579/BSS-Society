/* New Muslim pages: stage accordion, reading preview, topic tabs, lesson progress */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(key, fallback) {
      try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
    },
  };

  /* ---------- Overview: one stage open at a time ---------- */
  const stages = [...document.querySelectorAll('[data-stage]')];
  stages.forEach((stage) => {
    const toggle = stage.querySelector('[data-stage-toggle]');
    toggle.addEventListener('click', () => {
      const open = !stage.classList.contains('is-open');
      stages.forEach((s) => {
        const on = s === stage ? open : false;
        s.classList.toggle('is-open', on);
        s.querySelector('[data-stage-toggle]').setAttribute('aria-expanded', String(on));
      });
    });
  });

  // Hovering a reading highlights it and pans the preview image
  const readings = [...document.querySelectorAll('[data-reading]')];
  const previewImg = document.querySelector('[data-preview-img]');
  const PANS = ['-278.69%', '-210%', '-340%', '-150%'];
  const activate = (row) => {
    readings.forEach((r) => r.classList.toggle('is-active', r === row));
    if (previewImg) previewImg.style.setProperty('--pv-t', PANS[Number(row.dataset.reading)] || PANS[0]);
  };
  readings.forEach((row) => {
    row.addEventListener('mouseenter', () => activate(row));
    row.addEventListener('focus', () => activate(row));
  });

  /* ---------- Stage page: topic tabs ---------- */
  const TOPIC_TITLES = ['Who is God in Islam?', 'What is the Qur’an?', 'What is the Qur’an?', 'Who is Prophet Muhammad?', 'Topic 5'];
  const panel = document.querySelector('[data-step-panel]');
  const tabs = [...document.querySelectorAll('[data-tab]')];
  const lessonsList = document.querySelector('[data-lessons]');

  const replayLessons = () => {
    if (!lessonsList || reduceMotion) return;
    lessonsList.classList.remove('is-refreshing');
    void lessonsList.offsetWidth;
    lessonsList.classList.add('is-refreshing');
  };

  const selectTab = (n, { focus = false } = {}) => {
    const tab = tabs[n - 1];
    if (!tab) return;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    panel.setAttribute('aria-labelledby', tab.id);
    const apply = () => {
      panel.querySelector('[data-step-num]').textContent = String(n).padStart(2, '0');
      panel.querySelector('[data-step-title]').textContent = TOPIC_TITLES[n - 1];
      panel.classList.remove('is-changing');
    };
    if (reduceMotion) { apply(); return; }
    panel.classList.add('is-changing');
    setTimeout(apply, 250);
    lessonsList.scrollTo({ left: 0 });
    replayLessons();
  };

  if (panel) {
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => selectTab(i + 1));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        const next = (i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        selectTab(next + 1, { focus: true });
      });
      tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    });
    // Readings on the overview link here as #topic-N
    const fromHash = /^#topic-(\d)$/.exec(location.hash);
    if (fromHash) {
      selectTab(Number(fromHash[1]));
      document.getElementById('resources').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* ---------- Lessons: scroll buttons ---------- */
  const prev = document.querySelector('[data-lessons-prev]');
  const next = document.querySelector('[data-lessons-next]');
  if (lessonsList && prev && next) {
    const step = () => lessonsList.firstElementChild.getBoundingClientRect().width + 20;
    const update = () => {
      prev.disabled = lessonsList.scrollLeft <= 2;
      next.disabled = lessonsList.scrollLeft >= lessonsList.scrollWidth - lessonsList.clientWidth - 2;
    };
    prev.addEventListener('click', () => lessonsList.scrollBy({ left: -step() }));
    next.addEventListener('click', () => lessonsList.scrollBy({ left: step() }));
    lessonsList.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Lessons: mark done / save, with progress ---------- */
  const lessons = [...document.querySelectorAll('[data-lesson]')];
  const countEl = document.querySelector('[data-progress-count]');
  const ring = document.querySelector('[data-ring]');
  const ringLabel = document.querySelector('[data-ring-label]');
  const saved = store.get('bss-essentials', null);

  const updateProgress = () => {
    const done = lessons.filter((l) => l.classList.contains('is-done')).length;
    const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
    if (countEl) countEl.textContent = `${done} of ${lessons.length} resources explored`;
    if (ring) ring.style.setProperty('--p', pct);
    if (ringLabel) ringLabel.textContent = `${pct}%`;
  };
  const persist = () => store.set('bss-essentials', lessons.map((l) => ({
    done: l.classList.contains('is-done'),
    saved: l.querySelector('[data-save]').getAttribute('aria-pressed') === 'true',
  })));

  lessons.forEach((lesson, i) => {
    const doneBtn = lesson.querySelector('[data-done]');
    const saveBtn = lesson.querySelector('[data-save]');
    const status = lesson.querySelector('[data-status] span:last-child');
    const setDone = (on) => {
      lesson.classList.toggle('is-done', on);
      doneBtn.setAttribute('aria-pressed', String(on));
      doneBtn.setAttribute('aria-label', on ? 'Mark as not done' : 'Mark as done');
      status.textContent = on ? 'Completed' : 'Not started';
    };
    if (saved && saved[i]) {
      setDone(saved[i].done);
      saveBtn.setAttribute('aria-pressed', String(saved[i].saved));
    }
    doneBtn.addEventListener('click', () => { setDone(!lesson.classList.contains('is-done')); updateProgress(); persist(); });
    saveBtn.addEventListener('click', () => {
      const on = saveBtn.getAttribute('aria-pressed') !== 'true';
      saveBtn.setAttribute('aria-pressed', String(on));
      saveBtn.setAttribute('aria-label', on ? 'Remove from saved' : 'Save for later');
      persist();
    });
  });
  if (lessons.length) {
    // Let the ring fill from zero once the page has painted
    requestAnimationFrame(() => setTimeout(updateProgress, reduceMotion ? 0 : 500));
  }
  lessonsList?.addEventListener('animationend', (e) => {
    if (e.target === lessonsList.lastElementChild) lessonsList.classList.remove('is-refreshing');
  });

  // Charts animate when they scroll into view
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    }), { threshold: 0.4 });
    document.querySelectorAll('.chart').forEach((c) => io.observe(c));
  } else {
    document.querySelectorAll('.chart').forEach((c) => c.classList.add('is-visible'));
  }
})();
