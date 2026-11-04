// Language picker on the world icon: a sheet that slides up from the bottom of the screen. Tap a language,
// then Confirm. The dialog element gives the focus trap, the inert page, Esc and the Android back gesture.
// Only English exists so far, so choosing another one says so and the site stays in English. A language
// marked `available: true` here is treated as a real choice.
(function () {
  const toggle = document.querySelector(".language-toggle");
  if (!toggle || typeof HTMLDialogElement === "undefined") return;

  // Names people may type, in English, in the language itself and in the other listed languages
  const LANGUAGES = [
    { code: "en", name: "English", flag: "gb", available: true,
      terms: "english en british uk america american ingles anglais 英语 英文 अंग्रेज़ी अंग्रेजी انجليزي انجليزية" },
    { code: "zh", name: "中文", english: "Chinese", flag: "cn",
      terms: "chinese mandarin putonghua zh china chino chinois 中文 汉语 普通话 中国 चीनी صيني صينية" },
    { code: "hi", name: "हिन्दी", english: "Hindi", flag: "in",
      terms: "hindi hi hindustani india indien हिन्दी हिंदी भारत 印地语 هندي هندية" },
    { code: "es", name: "Español", english: "Spanish", flag: "es",
      terms: "spanish es espanol castellano spain mexico espagnol 西班牙语 स्पेनिश اسباني اسبانية" },
    { code: "ar", name: "العربية", english: "Arabic", flag: "eg",
      terms: "arabic ar arabe arabisch egypt masr misr saudi uae العربية عربي عربية 阿拉伯语 अरबी" },
    { code: "fr", name: "Français", english: "French", flag: "fr",
      terms: "french fr francais france frances 法语 फ़्रेंच फ्रेंच فرنسي فرنسية" },
    { code: "bn", name: "বাংলা", english: "Bengali", flag: "bd", terms: "bengali bangla bn bangladesh বাংলা বাঙালি" },
    { code: "pt", name: "Português", english: "Portuguese", flag: "br", terms: "portuguese portugues pt brazil brasil portugal" },
    { code: "ru", name: "Русский", english: "Russian", flag: "ru", terms: "russian ru russia русский россия روسي" },
    { code: "ur", name: "اردو", english: "Urdu", flag: "pk", terms: "urdu ur pakistan اردو" },
    { code: "id", name: "Bahasa Indonesia", english: "Indonesian", flag: "id", terms: "indonesian bahasa id indonesia" },
    { code: "de", name: "Deutsch", english: "German", flag: "de", terms: "german deutsch de germany allemand" },
    { code: "ja", name: "日本語", english: "Japanese", flag: "jp", terms: "japanese nihongo ja japan 日本語 日本" },
    { code: "tr", name: "Türkçe", english: "Turkish", flag: "tr", terms: "turkish turkce tr turkey turkiye تركي" },
    { code: "ko", name: "한국어", english: "Korean", flag: "kr", terms: "korean hangul ko korea 한국어 한국" },
    { code: "vi", name: "Tiếng Việt", english: "Vietnamese", flag: "vn", terms: "vietnamese tieng viet vi vietnam" },
    { code: "it", name: "Italiano", english: "Italian", flag: "it", terms: "italian italiano it italy" },
    { code: "th", name: "ไทย", english: "Thai", flag: "th", terms: "thai th thailand ไทย" },
    { code: "sw", name: "Kiswahili", english: "Swahili", flag: "tz", terms: "swahili kiswahili sw tanzania kenya" },
    { code: "ha", name: "Hausa", flag: "ng", terms: "hausa ha nigeria" },
  ];
  let current = "en";    // the language the site is in
  let selected = current; // the row picked in the sheet, until Confirm
  const DISMISS_DISTANCE = 110;   // px dragged down that closes the sheet
  const DISMISS_SPEED = 0.6;      // px per ms: a quick flick closes it from any distance
  const KEYBOARD_MIN = 120;       // px of lost height that means a keyboard, not a toolbar

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover)");
  const CROSS = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  // Case, accents and Arabic or Hindi marks don't matter: "espanol" finds Español
  const normalize = (text) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();

  const rows = LANGUAGES.map((language) => `<li role="presentation" data-code="${language.code}">
      <button class="language-row" type="button" role="radio" aria-checked="false" tabindex="-1">
        <img class="language-row__flag" src="assets/flags/${language.flag}.svg" width="32" height="24" alt="">
        <span class="language-row__names">
          <span class="language-row__name" lang="${language.code}" dir="auto">${language.name}</span>
          ${language.english ? `<span class="language-row__english">${language.english}</span>` : ""}
        </span>
        ${language.available ? "" : '<span class="language-row__status">Coming soon</span>'}
        <img class="language-row__check" src="assets/icons/check.svg" width="20" height="20" alt="">
      </button>
    </li>`).join("");

  const dialog = document.createElement("dialog");
  dialog.className = "language-dialog";
  dialog.setAttribute("aria-labelledby", "language-title");
  dialog.innerHTML = `
    <div class="language-dialog__backdrop"></div>
    <div class="language-sheet" tabindex="-1">
      <div class="language-sheet__head">
        <span class="language-sheet__grabber" aria-hidden="true"></span>
        <h2 class="language-sheet__title" id="language-title">Choose a language</h2>
        <button class="language-sheet__close" type="button" aria-label="Close">${CROSS}</button>
      </div>
      <div class="language-search">
        <img class="language-search__icon" src="assets/icons/search.svg" width="22" height="22" alt="">
        <input class="language-search__input" type="text" inputmode="search" enterkeyhint="search" placeholder="Search languages" aria-label="Search languages" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false">
        <button class="language-search__clear" type="button" aria-label="Clear search" hidden>${CROSS}</button>
      </div>
      <ul class="language-list" role="radiogroup" aria-labelledby="language-title">${rows}</ul>
      <div class="language-empty" hidden>
        <p class="language-empty__title"></p>
        <p class="language-empty__text">Try the name in English or in your own language.</p>
        <button class="language-empty__clear" type="button">Clear search</button>
      </div>
      <div class="language-sheet__foot">
        <p class="language-sheet__hint" role="status"></p>
        <button class="btn btn--large btn--primary language-sheet__confirm" type="button">Confirm</button>
      </div>
      <p class="visually-hidden" role="status" data-search-status></p>
    </div>`;
  document.body.append(dialog);

  const sheet = dialog.querySelector(".language-sheet");
  const head = dialog.querySelector(".language-sheet__head");
  const backdrop = dialog.querySelector(".language-dialog__backdrop");
  const input = dialog.querySelector(".language-search__input");
  const clearButton = dialog.querySelector(".language-search__clear");
  const list = dialog.querySelector(".language-list");
  const empty = dialog.querySelector(".language-empty");
  const emptyTitle = dialog.querySelector(".language-empty__title");
  const status = dialog.querySelector("[data-search-status]");
  const hint = dialog.querySelector(".language-sheet__hint");
  const items = [...list.children];
  let closeTimer = null;

  const search = LANGUAGES.map((language) => ({
    item: items.find((item) => item.dataset.code === language.code),
    language,
    words: normalize(`${language.name} ${language.english || ""} ${language.terms}`).split(/\s+/),
  }));

  // Marks the picked row, and says so plainly when that language isn't ready yet
  function select(code) {
    selected = code;
    items.forEach((item) => {
      const row = item.querySelector(".language-row");
      const isSelected = item.dataset.code === code;
      row.classList.toggle("is-selected", isSelected);
      row.setAttribute("aria-checked", String(isSelected));
    });
    const language = LANGUAGES.find((entry) => entry.code === code);
    hint.textContent = language.available ? "" : `${language.english || language.name} is coming soon. The site stays in English for now.`;
    tabStop();
  }

  // One Tab stop for the list, the arrow keys do the rest
  function tabStop() {
    const rowsNow = visibleRows();
    const stop = rowsNow.find((row) => row.classList.contains("is-selected")) || rowsNow[0];
    items.forEach((item) => { item.querySelector(".language-row").tabIndex = -1; });
    if (stop) stop.tabIndex = 0;
  }

  const visibleRows = () => items.filter((item) => !item.hidden).map((item) => item.querySelector(".language-row"));

  // A language matches when one of its names starts with what was typed
  function filter() {
    const query = normalize(input.value);
    const found = search.filter(({ item, words }) => {
      const match = !query || words.some((word) => word.startsWith(query));
      item.hidden = !match;
      return match;
    });
    clearButton.hidden = !input.value;
    list.hidden = !found.length;
    empty.hidden = Boolean(found.length);
    emptyTitle.textContent = `No results for “${input.value.trim()}”`;
    if (query) status.textContent = found.length ? `${found.length} ${found.length === 1 ? "language" : "languages"} found` : "No languages found";
    else status.textContent = "";
    list.scrollTop = 0;
    tabStop();
  }

  function clearSearch() {
    input.value = "";
    filter();
    input.focus();
  }

  // Raises the sheet above the on-screen keyboard. Only for a real keyboard: browser toolbars also change
  // the visible height, and following those would make the sheet jump.
  function fitKeyboard() {
    const view = window.visualViewport;
    if (!view) return;
    const lift = Math.round(window.innerHeight - view.height - view.offsetTop);
    sheet.style.setProperty("--sheet-lift", `${document.activeElement === input && lift > KEYBOARD_MIN ? lift : 0}px`);
  }

  function open() {
    if (dialog.open) return;
    clearTimeout(closeTimer);
    if (root.classList.contains("is-menu-open")) document.querySelector(".menu-toggle").click();
    root.classList.add("is-sheet-open");
    select(current);
    dialog.showModal();
    dialog.scrollTop = 0;
    toggle.setAttribute("aria-expanded", "true");
    fitKeyboard();
    window.visualViewport?.addEventListener("resize", fitKeyboard);
    window.visualViewport?.addEventListener("scroll", fitKeyboard);
    // Touch screens: no keyboard until they tap the search
    (canHover.matches ? input : sheet).focus({ preventScroll: true });
    sheet.getBoundingClientRect();   // start from the closed position
    dialog.classList.add("is-open");
  }

  function finish() {
    window.visualViewport?.removeEventListener("resize", fitKeyboard);
    window.visualViewport?.removeEventListener("scroll", fitKeyboard);
    dialog.close();
    toggle.focus({ preventScroll: true });   // Safari doesn't focus a tapped button by itself
    root.classList.remove("is-sheet-open");
    toggle.setAttribute("aria-expanded", "false");
    sheet.style.removeProperty("transform");
    backdrop.style.removeProperty("opacity");
    input.value = "";
    filter();
    select(current);
  }

  function close() {
    if (!dialog.open || !dialog.classList.contains("is-open")) return;
    dialog.classList.remove("is-open");
    sheet.classList.remove("is-dragging");
    sheet.style.removeProperty("transform");
    backdrop.style.removeProperty("opacity");
    const duration = parseFloat(getComputedStyle(root).getPropertyValue("--motion-duration-sheet-out"));
    closeTimer = setTimeout(finish, reducedMotion.matches ? 0 : duration);
  }

  toggle.addEventListener("click", open);
  backdrop.addEventListener("click", close);
  dialog.querySelector(".language-sheet__close").addEventListener("click", close);
  clearButton.addEventListener("click", clearSearch);
  dialog.querySelector(".language-empty__clear").addEventListener("click", clearSearch);
  input.addEventListener("input", filter);
  input.addEventListener("focus", fitKeyboard);
  input.addEventListener("blur", fitKeyboard);

  list.addEventListener("click", (event) => {
    const item = event.target.closest("[data-code]");
    if (item) select(item.dataset.code);
  });

  // A language that isn't ready leaves the site as it is; the hint has already said so
  dialog.querySelector(".language-sheet__confirm").addEventListener("click", () => {
    if (LANGUAGES.find((language) => language.code === selected).available) current = selected;
    close();
  });

  // Back gesture on Android, and Esc where keydown doesn't reach us
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  // Esc clears the search first, then closes. Arrows move through the rows, Enter picks the top result.
  dialog.addEventListener("keydown", (event) => {
    const rowsNow = visibleRows();
    const index = rowsNow.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      if (input.value) clearSearch();
      else close();
    } else if (event.key === "ArrowDown" && rowsNow.length) {
      event.preventDefault();
      rowsNow[Math.min(index + 1, rowsNow.length - 1)].focus();
    } else if (event.key === "ArrowUp" && index >= 0) {
      event.preventDefault();
      (rowsNow[index - 1] || input).focus();
    } else if (event.key === "Enter" && document.activeElement === input) {
      event.preventDefault();
      if (input.value && rowsNow[0]) rowsNow[0].click();
    }
  });

  // Drag the top of the sheet down to dismiss it 
  let drag = null;

  head.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button") || !dialog.classList.contains("is-open")) return;
    drag = { startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, speed: 0 };
    head.setPointerCapture(event.pointerId);
    sheet.classList.add("is-dragging");
  });

  head.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const distance = Math.max(0, event.clientY - drag.startY);
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.speed = (event.clientY - drag.lastY) / elapsed;
    drag.lastY = event.clientY;
    drag.lastTime = event.timeStamp;
    drag.distance = distance;
    sheet.style.transform = `translateY(${distance}px)`;
    backdrop.style.opacity = String(1 - Math.min(1, distance / sheet.offsetHeight));
  });

  function endDrag(event) {
    if (!drag) return;
    const { distance = 0, speed } = drag;
    drag = null;
    sheet.classList.remove("is-dragging");
    if (event.type === "pointerup" && (distance > DISMISS_DISTANCE || (distance > 8 && speed > DISMISS_SPEED))) {
      close();
    } else {
      sheet.style.removeProperty("transform");   // settles back into place
      backdrop.style.removeProperty("opacity");
    }
  }

  head.addEventListener("pointerup", endDrag);
  head.addEventListener("pointercancel", endDrag);

  // Back to this page from the browser's cache with the sheet still open
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && dialog.open) {
      dialog.classList.remove("is-open");
      finish();
    }
  });
})();
