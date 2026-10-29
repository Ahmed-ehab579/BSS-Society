/* Language selector: opens from the globe in the header, and once on a first visit */
(() => {
  const LANGS = [
    { code: 'en', native: 'English', name: 'Default translation', search: 'english' },
    { code: 'fr', native: 'Français', name: 'French' },
    { code: 'de', native: 'Deutsch', name: 'German' },
    { code: 'tr', native: 'Türkçe', name: 'Turkish' },
    { code: 'id', native: 'Bahasa Indonesia', name: 'Indonesian' },
    { code: 'ur', native: 'اردو', name: 'Urdu', rtl: true },
    { code: 'es', native: 'Español', name: 'Spanish' },
    { code: 'fa', native: 'فارسی', name: 'Persian', rtl: true },
    { code: 'bs', native: 'Bosanski', name: 'Bosnian' },
    { code: 'bn', native: 'বাংলা', name: 'Bengali' },
    { code: 'ru', native: 'Русский', name: 'Russian' },
    { code: 'ms', native: 'Bahasa Melayu', name: 'Malay' },
    { code: 'sw', native: 'Kiswahili', name: 'Swahili' },
  ];
  const STORE_KEY = 'bss-lang';
  const SEEN_KEY = 'bss-lang-seen';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
    remove(k) { try { localStorage.removeItem(k); } catch { /* storage unavailable */ } },
    seen() { try { return sessionStorage.getItem(SEEN_KEY) === '1'; } catch { return true; } },
    markSeen() { try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* storage unavailable */ } },
  };

  const globes = [...document.querySelectorAll('.lang-btn')];
  if (!globes.length) return;

  /* ---------- Build the dialog once ---------- */
  const overlay = document.createElement('div');
  overlay.className = 'lang-overlay';
  overlay.innerHTML = `
    <div class="lang-dialog" role="dialog" aria-modal="true" aria-labelledby="lang-title" aria-describedby="lang-desc">
      <button class="lang-close" type="button" aria-label="Close" data-lang-close><img src="assets/icons/lang-close.svg" width="16" height="16" alt=""></button>
      <div class="lang-head">
        <h2 id="lang-title">Welcome to Ahsan al-Qawl</h2>
        <p id="lang-desc">Select your preferred language</p>
      </div>
      <div class="lang-search" data-lang-search>
        <label class="sr-only" for="lang-q">Search languages</label>
        <img class="lang-search__icon" src="assets/icons/lang-search.svg" width="12" height="12" alt="">
        <input id="lang-q" type="search" placeholder="Search languages or country names..." autocomplete="off" spellcheck="false">
        <div class="lang-search__side">
          <button class="lang-search__clear" type="button" aria-label="Clear search" data-lang-clear><img src="assets/icons/lang-clear.svg" width="11" height="11" alt=""></button>
          <span class="lang-count" aria-live="polite" data-lang-count></span>
        </div>
      </div>
      <div class="lang-listwrap" data-lang-wrap>
        <div class="lang-list" role="radiogroup" aria-label="Available languages" data-lang-list></div>
        <div class="lang-scroll" aria-hidden="true" data-lang-scroll><span></span></div>
      </div>
      <div class="lang-foot">
        <div class="lang-remember">
          <label><input type="checkbox" checked data-lang-remember><span class="lang-remember__box"><img src="assets/icons/lang-remember.svg" width="14" height="14" alt=""></span>Remember my selection on this device</label>
          <small>Can be changed anytime</small>
        </div>
        <div class="lang-actions">
          <button class="lang-save" type="button" data-lang-save>Save and Continue <img src="assets/icons/lang-arrow.svg" width="13" height="13" alt=""></button>
          <button class="lang-english" type="button" data-lang-english>Continue with English</button>
        </div>
        <p class="lang-trust"><img src="assets/icons/lang-trust.svg" width="11" height="11" alt="">Endowed for universal access · No tracking advertisements · Zero fees</p>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const toast = document.createElement('p');
  toast.className = 'lang-toast';
  toast.setAttribute('role', 'status');
  document.body.appendChild(toast);

  const dialog = overlay.querySelector('.lang-dialog');
  const list = overlay.querySelector('[data-lang-list]');
  const wrap = overlay.querySelector('[data-lang-wrap]');
  const scroll = overlay.querySelector('[data-lang-scroll]');
  const searchBox = overlay.querySelector('[data-lang-search]');
  const input = overlay.querySelector('#lang-q');
  const count = overlay.querySelector('[data-lang-count]');
  const remember = overlay.querySelector('[data-lang-remember]');
  const englishBtn = overlay.querySelector('[data-lang-english]');

  let selected = store.get(STORE_KEY) || 'en';
  let lastFocus = null;

  const option = (l, i) => `
    <button class="lang-option" type="button" role="radio" aria-checked="${l.code === selected}" tabindex="${l.code === selected ? 0 : -1}" data-code="${l.code}" style="--n:${i}" lang="${l.code}">
      <span class="lang-option__main">
        <span class="lang-flag${l.code === 'en' ? ' lang-flag--en' : ''}"><img src="assets/icons/flags/${l.code}.svg" width="33" height="24" alt=""></span>
        <span class="lang-names"><b${l.rtl ? ' dir="rtl"' : ''}>${l.native}</b><span lang="en">${l.name}</span></span>
      </span>
      <span class="lang-option__side"><span class="lang-code">${l.code.toUpperCase()}</span><span class="lang-tick"><img src="assets/icons/lang-check.svg" width="13" height="13" alt=""></span></span>
    </button>`;

  const updateThumb = () => {
    const { scrollHeight, clientHeight, scrollTop } = list;
    const ratio = clientHeight / scrollHeight;
    scroll.classList.toggle('is-hidden', ratio >= 1);
    const trackH = scroll.clientHeight - 12.7;
    const h = Math.max(24, trackH * ratio);
    scroll.style.setProperty('--thumb-h', `${h}px`);
    scroll.style.setProperty('--thumb-top', `${6.35 + (trackH - h) * (scrollTop / Math.max(1, scrollHeight - clientHeight))}px`);
  };

  const render = () => {
    const q = input.value.trim().toLowerCase();
    const matches = LANGS.filter((l) => !q || [l.native, l.name, l.code, l.search || ''].some((s) => s.toLowerCase().includes(q)));
    list.innerHTML = matches.length
      ? matches.map(option).join('')
      : '<p class="lang-empty">No languages match your search.</p>';
    searchBox.classList.toggle('has-query', Boolean(q));
    count.textContent = q ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : `${LANGS.length} available`;
    englishBtn.hidden = Boolean(q);
    wrap.classList.toggle('is-short', Boolean(q) && matches.length <= 4);
    // Keep one option tabbable even when the selected one is filtered out
    if (matches.length && !matches.some((l) => l.code === selected)) list.querySelector('.lang-option').tabIndex = 0;
    requestAnimationFrame(updateThumb);
  };

  const choose = (code, focus = false) => {
    selected = code;
    list.querySelectorAll('.lang-option').forEach((b) => {
      const on = b.dataset.code === code;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
  };

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.lang-option');
    if (b) choose(b.dataset.code);
  });
  // Arrow keys move through the radio grid (two columns)
  list.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('.lang-option')];
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 2, ArrowUp: -2 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = items[Math.min(items.length - 1, Math.max(0, i + step))];
    choose(next.dataset.code, true);
  });
  list.addEventListener('scroll', updateThumb, { passive: true });
  input.addEventListener('input', render);
  overlay.querySelector('[data-lang-clear]').addEventListener('click', () => { input.value = ''; render(); input.focus(); });

  /* ---------- Open / close ---------- */
  const open = (trigger) => {
    lastFocus = trigger || document.activeElement;
    selected = store.get(STORE_KEY) || selected;
    input.value = '';
    render();
    overlay.classList.add('is-open');
    document.documentElement.classList.add('lang-locked');
    globes.forEach((g) => g.setAttribute('aria-expanded', 'true'));
    setTimeout(() => (list.querySelector('[aria-checked="true"]') || input).focus({ preventScroll: true }), 60);
  };
  const close = () => {
    overlay.classList.remove('is-open');
    document.documentElement.classList.remove('lang-locked');
    globes.forEach((g) => g.setAttribute('aria-expanded', 'false'));
    store.markSeen();
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  };
  let toastTimer;
  const confirm = (code) => {
    const lang = LANGS.find((l) => l.code === code);
    if (remember.checked) store.set(STORE_KEY, code); else store.remove(STORE_KEY);
    showCode(code);
    close();
    toast.textContent = `Language preference saved: ${lang.native}`;
    toast.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-shown'), 2400);
  };
  const showCode = (code) => globes.forEach((g) => {
    if (code && code !== 'en') g.dataset.code = code.toUpperCase(); else delete g.dataset.code;
  });

  overlay.querySelector('[data-lang-close]').addEventListener('click', close);
  overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('[data-lang-save]').addEventListener('click', () => confirm(selected));
  englishBtn.addEventListener('click', () => { choose('en'); confirm('en'); });
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    // Keep focus inside the dialog
    const f = [...dialog.querySelectorAll('button:not([hidden]), input, [tabindex="0"]')].filter((el) => el.offsetParent !== null && el.tabIndex >= 0);
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  globes.forEach((g) => {
    g.setAttribute('aria-haspopup', 'dialog');
    g.setAttribute('aria-expanded', 'false');
    g.addEventListener('click', () => open(g));
  });
  showCode(store.get(STORE_KEY));

  // First visit: greet once per session until a language has been remembered
  if (!store.get(STORE_KEY) && !store.seen()) setTimeout(() => open(null), 1200);
})();
