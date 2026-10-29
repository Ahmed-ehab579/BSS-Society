/* Library page: topic picker, filter chips, search, view toggle and sort (UI only, sample results) */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOPIC_NAMES = {
    belief: 'Belief & Faith',
    quran: 'The Qur’an',
    prophet: 'Prophet Muhammad',
    women: 'Women in Islam',
  };

  const grid = document.querySelector('[data-res-grid]');
  const titleWrap = document.querySelector('[data-results-title]');
  const titleEl = document.querySelector('[data-topic-name]');
  const honorific = document.querySelector('[data-honorific]');

  // Replay the card entrance so a change in the results is visible
  const refreshGrid = () => {
    if (reduceMotion) return;
    grid.classList.remove('is-refreshing');
    void grid.offsetWidth;
    grid.classList.add('is-refreshing');
  };
  grid.addEventListener('animationend', (e) => {
    if (e.target === grid.lastElementChild) grid.classList.remove('is-refreshing');
  });

  const setTopicTitle = (name) => {
    if (titleEl.textContent === name) return;
    titleWrap.classList.add('is-changing');
    setTimeout(() => {
      titleEl.textContent = name;
      honorific.hidden = name !== TOPIC_NAMES.prophet;
      titleWrap.classList.remove('is-changing');
    }, reduceMotion ? 0 : 250);
  };

  /* ---------- Filter chips ---------- */
  const chips = new Map();
  document.querySelectorAll('[data-chip]').forEach((chip) => {
    const btn = chip.querySelector('.chip__btn');
    const valueEl = chip.querySelector('[data-chip-value]');
    const removeEl = chip.querySelector('[data-chip-remove]');
    const items = [...chip.querySelectorAll('[role="menuitemradio"]')];

    const setValue = (value) => {
      items.forEach((it) => it.setAttribute('aria-checked', String(it.dataset.value === value)));
      if (value) {
        valueEl.firstChild.textContent = value;
        valueEl.hidden = false;
      } else {
        valueEl.hidden = true;
      }
      chip.dataset.value = value || '';
    };
    const close = () => { chip.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
    const open = () => {
      closeAllMenus();
      chip.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      (items.find((it) => it.getAttribute('aria-checked') === 'true') || items[0]).focus();
    };

    btn.addEventListener('click', (e) => {
      if (e.target.closest('[data-chip-remove]')) return;
      chip.classList.contains('is-open') ? close() : open();
    });
    const remove = (e) => {
      e.stopPropagation();
      setValue('');
      if (chip.dataset.chip === 'category') selectTopic(null);
      refreshGrid();
    };
    removeEl.addEventListener('click', remove);
    removeEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); remove(e); } });
    items.forEach((it) => it.addEventListener('click', () => {
      setValue(it.dataset.value);
      close();
      btn.focus();
      if (chip.dataset.chip === 'category') {
        const key = Object.keys(TOPIC_NAMES).find((k) => TOPIC_NAMES[k] === it.dataset.value);
        selectTopic(key, { fromChip: true });
      }
      refreshGrid();
    }));
    chip.dataset.value = valueEl.firstChild.textContent.trim();
    chips.set(chip.dataset.chip, { chip, setValue, close });
  });

  /* ---------- Sort menu ---------- */
  const sort = document.querySelector('[data-sort]');
  const sortBtn = sort.querySelector('.sort__btn');
  const sortItems = [...sort.querySelectorAll('[role="menuitemradio"]')];
  const closeSort = () => { sort.classList.remove('is-open'); sortBtn.setAttribute('aria-expanded', 'false'); };
  sortBtn.addEventListener('click', () => {
    const willOpen = !sort.classList.contains('is-open');
    closeAllMenus();
    if (willOpen) {
      sort.classList.add('is-open');
      sortBtn.setAttribute('aria-expanded', 'true');
      sortItems.find((it) => it.getAttribute('aria-checked') === 'true').focus();
    }
  });
  sortItems.forEach((it) => it.addEventListener('click', () => {
    sortItems.forEach((x) => x.setAttribute('aria-checked', String(x === it)));
    sort.querySelector('[data-sort-value]').textContent = it.dataset.value;
    closeSort();
    sortBtn.focus();
    refreshGrid();
  }));

  function closeAllMenus() {
    chips.forEach(({ close }) => close());
    closeSort();
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-chip], [data-sort]')) closeAllMenus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const openEl = document.querySelector('.chip.is-open, .sort.is-open');
    if (!openEl) return;
    closeAllMenus();
    openEl.querySelector('.chip__btn, .sort__btn').focus();
  });
  // Arrow keys move through an open menu
  document.querySelectorAll('.chip__menu').forEach((menu) => menu.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const list = [...menu.querySelectorAll('button')];
    const i = list.indexOf(document.activeElement);
    list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus();
  }));

  /* ---------- Topic picker ---------- */
  const picks = [...document.querySelectorAll('.topic-pick')];
  function selectTopic(key, { fromChip = false } = {}) {
    let firstMatch = null;
    picks.forEach((pick) => {
      const btn = pick.querySelector('[data-topic]');
      const on = Boolean(key) && btn.dataset.topic === key && !firstMatch;
      if (on) firstMatch = pick;
      pick.classList.toggle('is-selected', on);
      btn.setAttribute('aria-pressed', String(on));
    });
    setTopicTitle(key ? TOPIC_NAMES[key] : 'All topics');
    if (!fromChip) chips.get('category').setValue(key ? TOPIC_NAMES[key] : '');
    if (firstMatch && fromChip) {
      firstMatch.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
  picks.forEach((pick) => pick.querySelector('[data-topic]').addEventListener('click', (e) => {
    if (pick.classList.contains('is-selected')) return;
    // Only one of the repeated cards should light up: the one that was clicked
    picks.forEach((p) => {
      const on = p === pick;
      p.classList.toggle('is-selected', on);
      p.querySelector('[data-topic]').setAttribute('aria-pressed', String(on));
    });
    const key = e.currentTarget.dataset.topic;
    setTopicTitle(TOPIC_NAMES[key]);
    chips.get('category').setValue(TOPIC_NAMES[key]);
    refreshGrid();
  }));

  /* ---------- Search (filters the cards shown) ---------- */
  const search = document.querySelector('[data-search]');
  const empty = document.querySelector('[data-res-empty]');
  const cards = [...grid.children];
  search.addEventListener('input', () => {
    const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let shown = 0;
    cards.forEach((card) => {
      const text = `${card.dataset.search} ${card.textContent}`.toLowerCase();
      const match = terms.every((t) => text.includes(t));
      card.hidden = !match;
      if (match) shown += 1;
    });
    empty.hidden = shown > 0;
  });

  /* ---------- Grid / list view ---------- */
  const viewBtns = [...document.querySelectorAll('[data-view]')];
  viewBtns.forEach((btn) => btn.addEventListener('click', () => {
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    grid.classList.toggle('is-list', btn.dataset.view === 'list');
    refreshGrid();
  }));

  /* ---------- Decorative books drift slightly on scroll ---------- */
  const deco = document.querySelector('[data-deco]');
  if (deco && !reduceMotion) {
    window.addEventListener('scroll', () => {
      deco.style.setProperty('--deco', `${Math.min(window.scrollY, 600) * 0.15}px`);
    }, { passive: true });
  }
})();
