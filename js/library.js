// Library page: filters, search, sort, grid/list view and "Load more".
// The resources are placeholder content for the mockup (no backend yet). The current filters live in
// the URL (?category=prophet&format=video&q=...) so a filtered view can be linked, shared and reloaded.
(function () {
  const PAGE_SIZE = 9;          // three full rows of the three-column grid
  const SEARCH_DELAY = 200;     // ms after the last keystroke before the results update
  const VIEW_KEY = "bss.library.view";

  // Filters in their on-screen order. `all` is the label of the "no filter" option in the menus;
  // `short` is the text shown in the pill when it is shorter than the menu label.
  const FILTERS = [
    { key: "category", label: "Category", all: "All topics", options: [
      { value: "belief", label: "Belief & Faith" },
      { value: "quran", label: "The Qur’an" },
      { value: "prophet", label: "Prophet Muhammad", note: "(Peace & blessing be upon him)" },
      { value: "women", label: "Women in Islam" },
      { value: "life", label: "Life & Questions" },
    ] },
    { key: "language", label: "Language", all: "All languages", options: [
      { value: "en", label: "English", short: "En" },
      { value: "ar", label: "Arabic", short: "Ar" },
    ] },
    { key: "level", label: "Level", all: "All levels", options: [
      { value: "basic", label: "Basic" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
    ] },
    { key: "format", label: "Format", all: "All formats", options: [
      { value: "book", label: "Books" },
      { value: "audio", label: "Audio books" },
      { value: "article", label: "Articles" },
      { value: "video", label: "Videos" },
    ] },
  ];

  // One entry per material type: badge text and icon, action label, and the icon shown over the photo
  // (only for media you play: videos and audio books).
  const TYPES = {
    book: { badge: "Book", icon: "assets/icons/type-book.svg", action: "Read book" },
    audio: { badge: "Audio book", icon: "assets/icons/type-audio.svg", action: "Listen", overlay: "assets/icons/media-listen.svg" },
    article: { badge: "Article", icon: "assets/icons/type-article.svg", action: "Read article" },
    video: { badge: "Video", icon: "assets/icons/type-video.svg", action: "Watch video", overlay: "assets/icons/media-play.svg" },
  };

  // Photo and its object-position; the Library photos use the crops from the Figma cards.
  const IMG = {
    mosque: ["assets/images/library-mosque.jpg", "50% 50%"],
    quran: ["assets/images/library-quran.jpg", "50% 50%"],
    desert: ["assets/images/library-desert.jpg", "50% 50%"],
    caravan: ["assets/images/library-caravan.jpg", "50% 71%"],
    courtyard: ["assets/images/library-courtyard.jpg", "50% 66%"],
    embrace: ["assets/images/library-embrace.jpg", "50% 67%"],
    arches: ["assets/images/library-garden.jpg", "50% 36%"],
    belief: ["assets/images/topic-belief.jpg", "50% 50%"],
    prophet: ["assets/images/topic-prophet.jpg", "50% 50%"],
    women: ["assets/images/topic-women.jpg", "50% 45%"],
    life: ["assets/images/topic-life.jpg", "50% 45%"],
    reading: ["assets/images/hero-reading-800.jpg", "50% 40%"],
  };

  // Placeholder resources. `added` drives the "Newest" sort; the list order is the "Recommended" order.
  const RESOURCES = [
    ["Who is God in Islam?", "A calm look at how Islam describes God: one, merciful, near, and unlike anything in creation.", "belief", "en", "basic", "video", "mosque", "2026-09-02"],
    ["The life of the Prophet Muhammad", "From his childhood in Makkah to his final sermon, the key moments of his life told simply.", "prophet", "en", "basic", "book", "quran", "2026-08-14"],
    ["Walking in his footsteps", "A short film retracing the migration from Makkah to Madinah and what it teaches about patience.", "prophet", "en", "basic", "video", "desert", "2026-10-05"],
    ["His character in daily life", "Stories of how he treated his family, neighbours and strangers, and why they still matter today.", "prophet", "en", "intermediate", "article", "caravan", "2026-07-21"],
    ["Mercy to the worlds", "An audio reflection on the Prophet’s mercy towards people, animals and the world around him.", "prophet", "en", "basic", "audio", "courtyard", "2026-09-18"],
    ["The farewell sermon explained", "Line by line, what the Prophet’s last public address says about equality, rights and faith.", "prophet", "en", "advanced", "article", "embrace", "2026-06-30"],
    ["السيرة النبوية للمبتدئين", "مدخل ميسر إلى سيرة النبي ﷺ وأهم أحداث حياته، مكتوب بلغة واضحة وقريبة.", "prophet", "ar", "basic", "book", "arches", "2026-05-12"],
    ["What is the Qur’an?", "Where the Qur’an came from, how it is structured, and how Muslims read and live with it.", "quran", "en", "basic", "video", "quran", "2026-10-12"],
    ["Reading the opening chapter", "A gentle walk through Al-Fatiha, the chapter Muslims recite in every prayer, verse by verse.", "quran", "en", "basic", "audio", "reading", "2026-08-03"],
    ["Themes of the Qur’an", "Mercy, justice, purpose and the hereafter: the big themes that run through the whole book.", "quran", "en", "intermediate", "book", "arches", "2026-04-19"],
    ["How the Qur’an was preserved", "The careful history of memorising, writing and compiling the Qur’an over the first decades.", "quran", "en", "advanced", "article", "courtyard", "2026-03-08"],
    ["تدبر القرآن", "كيف نقرأ القرآن بتمهل وتدبر، مع أمثلة من آيات قصيرة يسهل البدء بها.", "quran", "ar", "intermediate", "audio", "mosque", "2026-07-02"],
    ["Why believe in God?", "Simple, honest reasons people give for belief, and the questions they often start with.", "belief", "en", "basic", "article", "belief", "2026-09-25"],
    ["The six pillars of faith", "Belief in God, the angels, the books, the prophets, the last day and destiny, each explained.", "belief", "en", "basic", "book", "mosque", "2026-02-11"],
    ["Faith and reason", "How the Islamic tradition brings thinking and believing together instead of setting them apart.", "belief", "en", "advanced", "video", "arches", "2026-06-07"],
    ["Prayer: a first guide", "What the five daily prayers are, why Muslims pray, and how to begin one step at a time.", "belief", "en", "basic", "video", "courtyard", "2026-10-20"],
    ["Destiny and free will", "An audio talk on one of the oldest questions in faith, with clear examples and no jargon.", "belief", "en", "intermediate", "audio", "desert", "2026-01-29"],
    ["أركان الإيمان الستة", "شرح مبسط لأركان الإيمان وما تعنيه في حياة المسلم اليومية.", "belief", "ar", "basic", "article", "quran", "2026-05-27"],
    ["Women in Islam: the basics", "The rights, roles and dignity Islam gives women, explained through the Qur’an and history.", "women", "en", "basic", "article", "women", "2026-08-22"],
    ["Mothers of the believers", "The lives of the Prophet’s wives and the scholarship, courage and leadership they showed.", "women", "en", "intermediate", "book", "arches", "2026-04-02"],
    ["Khadijah: the first believer", "A short film on the businesswoman who was the first to believe and support the message.", "women", "en", "basic", "video", "caravan", "2026-09-10"],
    ["Questions women ask", "Honest answers to common questions about hijab, marriage, work and worship.", "women", "en", "basic", "audio", "embrace", "2026-07-15"],
    ["Marriage and family in Islam", "What a healthy Muslim family looks like, built on mercy, care and shared responsibility.", "life", "en", "intermediate", "book", "embrace", "2026-03-22"],
    ["Everyday manners", "Greetings, gratitude, kindness to neighbours: the small daily habits Islam encourages.", "life", "en", "basic", "video", "life", "2026-10-26"],
    ["Is Islam compatible with science?", "A balanced look at the relationship between revelation and scientific discovery.", "life", "en", "advanced", "article", "reading", "2026-02-24"],
    ["Fasting in Ramadan", "Why Muslims fast, what a day of Ramadan looks like, and what the month is meant to build.", "life", "en", "basic", "audio", "desert", "2026-06-18"],
    ["New to Islam: what next?", "Practical first steps after taking the shahada, from prayer to finding a community.", "life", "en", "basic", "book", "courtyard", "2026-08-30"],
    ["أسئلة الحياة اليومية", "إجابات قصيرة وواضحة عن أسئلة يومية يطرحها كثير من المسلمين الجدد.", "life", "ar", "basic", "video", "caravan", "2026-01-15"],
    ["Patience in hard times", "An audio reflection on how faith helps people carry grief, worry and loss.", "belief", "en", "intermediate", "audio", "reading", "2026-05-04"],
    ["Understanding the Hadith", "What the Hadith are, how scholars checked them, and how they relate to the Qur’an.", "prophet", "en", "advanced", "book", "reading", "2026-03-14"],
  ].map(([title, text, category, language, level, format, image, added], index) => ({
    id: index + 1, title, text, category, language, level, format, image: IMG[image][0], focus: IMG[image][1], added,
    dir: language === "ar" ? "rtl" : "auto",
  }));

  const root = document.querySelector("[data-results]");
  if (!root) return;

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const els = {
    bar: $("[data-filter-bar]"),
    clearAll: $$("[data-clear-all]"),
    search: $("[data-search]"),
    searchInput: $("#library-search"),
    searchClear: $("[data-search-clear]"),
    eyebrow: $("[data-results-eyebrow]"),
    heading: $("[data-results-heading]"),
    note: $("[data-results-note]"),
    status: $("[data-results-status]"),
    grid: $("[data-resource-grid]"),
    empty: $("[data-results-empty]"),
    emptyText: $("[data-empty-text]"),
    more: $("[data-results-more]"),
    loadMore: $("[data-load-more]"),
    count: $("[data-results-count]"),
    sort: $("[data-sort]"),
    views: $$("[data-view]"),
    sheet: $("[data-sheet]"),
    sheetBody: $("[data-sheet-body]"),
    sheetOpen: $("[data-sheet-open]"),
    sheetApply: $("[data-sheet-apply]"),
    filterCount: $("[data-filter-count]"),
    chips: $("[data-active-chips]"),
  };

  const state = { category: "all", language: "all", level: "all", format: "all", q: "", sort: "recommended", view: "grid" };
  let visible = PAGE_SIZE;
  let statusTimer;
  let searchTimer;

  const filterByKey = (key) => FILTERS.find((filter) => filter.key === key);
  const optionFor = (key, value) => filterByKey(key).options.find((option) => option.value === value);
  const activeFilters = () => FILTERS.filter((filter) => state[filter.key] !== "all");
  const normalise = (text) => text.toLocaleLowerCase().normalize("NFD").replace(/[̀-ͯ’']/g, "");

  // ---- URL and stored state ------------------------------------------------------------------

  function readState() {
    const params = new URLSearchParams(location.search);
    FILTERS.forEach(({ key }) => {
      const value = params.get(key);
      state[key] = value && optionFor(key, value) ? value : "all";   // unknown values fall back to All
    });
    state.q = (params.get("q") || "").trim().slice(0, 100);
    const sort = params.get("sort");
    state.sort = [...els.sort.options].some((option) => option.value === sort) ? sort : "recommended";
    try {
      if (window.localStorage.getItem(VIEW_KEY) === "list") state.view = "list";
    } catch (error) { /* storage blocked: keep the grid */ }
  }

  function writeUrl() {
    const params = new URLSearchParams();
    FILTERS.forEach(({ key }) => { if (state[key] !== "all") params.set(key, state[key]); });
    if (state.q) params.set("q", state.q);
    if (state.sort !== "recommended") params.set("sort", state.sort);
    const query = params.toString();
    history.replaceState(null, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
  }

  // ---- Results -------------------------------------------------------------------------------

  function matches() {
    const words = normalise(state.q).split(/\s+/).filter(Boolean);
    const list = RESOURCES.filter((item) =>
      FILTERS.every(({ key }) => state[key] === "all" || item[key] === state[key]) &&
      words.every((word) => normalise(`${item.title} ${item.text} ${TYPES[item.format].badge}`).includes(word)));
    if (state.sort === "newest") list.sort((a, b) => b.added.localeCompare(a.added));
    if (state.sort === "title") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }

  function cardHtml(item) {
    const type = TYPES[item.format];
    const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    return `
      <li class="resource-card resource-card--${item.format}">
        <div class="resource-card__media">
          <img class="resource-card__photo" src="${item.image}" alt="" loading="lazy" decoding="async"
            style="object-position: ${item.focus}" onerror="this.hidden = true">
          <span class="resource-card__badge">
            <img src="${type.icon}" width="12" height="12" alt="">${type.badge}
          </span>
          ${type.overlay ? `<img class="resource-card__overlay" src="${type.overlay}" width="94.1506" height="94.1506" alt="">` : ""}
        </div>
        <div class="resource-card__body">
          <div class="resource-card__text">
            <h4 class="resource-card__title" dir="${item.dir}">${escape(item.title)}</h4>
            <p class="resource-card__desc" dir="${item.dir}">${escape(item.text)}</p>
          </div>
          <!-- No destination yet: the action becomes a link once the resource pages exist. -->
          <a class="btn btn--primary resource-card__action" aria-label="${type.action}: ${escape(item.title)}">${type.action}</a>
        </div>
      </li>`;
  }

  function renderResults({ announce = true } = {}) {
    const list = matches();
    const shown = Math.min(visible, list.length);
    const category = optionFor("category", state.category);

    els.eyebrow.textContent = category ? "You’re exploring the topic of:" : "You’re exploring:";
    els.heading.textContent = category ? category.label : "All topics";
    els.note.hidden = !(category && category.note);
    if (category && category.note) els.note.textContent = category.note;

    els.grid.innerHTML = list.slice(0, shown).map(cardHtml).join("");
    els.grid.hidden = list.length === 0;
    els.empty.hidden = list.length > 0;
    els.more.hidden = list.length === 0;
    els.loadMore.hidden = shown >= list.length;

    const query = state.q ? ` for “${state.q}”` : "";
    els.emptyText.textContent = state.q
      ? `Nothing matches “${state.q}” with these filters. Check the spelling, try fewer words, or clear the filters.`
      : "Try another topic or format, or clear the filters to see the whole library.";
    els.count.innerHTML = shown >= list.length
      ? `Showing <strong>${list.length === 1 ? "1 resource" : `all ${list.length} resources`}</strong>${escapeText(query)}`
      : `Showing <strong>${shown} of ${list.length}</strong> resources${escapeText(query)}`;

    els.sheetApply.textContent = list.length ? `Show ${list.length} result${list.length === 1 ? "" : "s"}` : "No results";

    if (announce) {
      clearTimeout(statusTimer);
      statusTimer = setTimeout(() => {
        els.status.textContent = list.length ? `${list.length} resource${list.length === 1 ? "" : "s"} found` : "No resources found";
      }, 400);
    }
  }

  function escapeText(text) {
    const span = document.createElement("span");
    span.textContent = text;
    return span.innerHTML;
  }

  // ---- Filters (desktop pills with menus) ------------------------------------------------------

  function renderBar() {
    els.bar.insertAdjacentHTML("afterbegin", FILTERS.map(({ key, label, all, options }) => `
      <div class="filter" data-filter="${key}">
        <button class="filter__toggle" type="button" id="filter-${key}" aria-haspopup="true" aria-expanded="false" aria-controls="filter-menu-${key}">
          <span class="filter__label">${label}:</span>
          <span class="filter__value" data-filter-value></span>
          <span class="filter__chevron" aria-hidden="true"><img src="assets/icons/filter-chevron.svg" width="13.6611" height="7.80635" alt=""></span>
        </button>
        <button class="filter__remove" type="button" data-filter-remove hidden>
          <img src="assets/icons/filter-remove.svg" width="12" height="12" alt="">
        </button>
        <fieldset class="filter__menu" id="filter-menu-${key}" hidden>
          <legend class="visually-hidden">${label}</legend>
          ${[{ value: "all", label: all }, ...options].map((option) => `
            <label class="filter-option">
              <input class="filter-option__input" type="radio" name="bar-${key}" value="${option.value}">
              <span class="filter-option__label">${option.label}</span>
            </label>`).join("")}
        </fieldset>
      </div>`).join(""));

    $$(".filter").forEach((filter) => {
      const key = filter.dataset.filter;
      const toggle = filter.querySelector(".filter__toggle");
      const menu = filter.querySelector(".filter__menu");

      toggle.addEventListener("click", () => setMenu(filter, menu.hidden));
      filter.querySelector("[data-filter-remove]").addEventListener("click", () => {
        setFilter(key, "all");
        toggle.focus();   // the remove button disappears with the filter: keep focus on the pill
      });
      menu.addEventListener("change", (event) => setFilter(key, event.target.value));
      // Labels can't take focus: without this, pressing on one would blur the menu and close it early.
      menu.addEventListener("mousedown", (event) => event.preventDefault());
      // A click or Enter picks the option and closes the menu; arrow keys only move the selection.
      menu.addEventListener("click", (event) => {
        if (event.target.matches("input") && event.detail > 0) closeMenu(filter, true);
      });
      menu.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (event.target.matches("input")) setFilter(key, event.target.value);
          closeMenu(filter, true);
        }
      });
    });
  }

  function setMenu(filter, open) {
    $$(".filter").forEach((other) => { if (other !== filter) closeMenu(other); });
    const menu = filter.querySelector(".filter__menu");
    menu.hidden = !open;
    filter.classList.toggle("is-open", open);
    filter.querySelector(".filter__toggle").setAttribute("aria-expanded", String(open));
    if (open) (menu.querySelector("input:checked") || menu.querySelector("input")).focus();
  }

  function closeMenu(filter, returnFocus = false) {
    if (filter.querySelector(".filter__menu").hidden) return;
    setMenu(filter, false);
    if (returnFocus) filter.querySelector(".filter__toggle").focus();
  }

  document.addEventListener("click", (event) => {
    $$(".filter.is-open").forEach((filter) => { if (!filter.contains(event.target)) closeMenu(filter); });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    $$(".filter.is-open").forEach((filter) => closeMenu(filter, true));
  });

  // Keyboard users tabbing out of an open menu close it.
  els.bar.addEventListener("focusout", (event) => {
    const filter = event.target.closest(".filter");
    if (filter && !filter.contains(event.relatedTarget)) closeMenu(filter);
  });

  // ---- Filters (phone sheet and chips) ---------------------------------------------------------

  function renderSheet() {
    els.sheetBody.innerHTML = FILTERS.map(({ key, label, all, options }) => `
      <fieldset class="sheet-group">
        <legend class="sheet-group__legend">${label}</legend>
        <div class="sheet-group__options">
          ${[{ value: "all", label: all }, ...options].map((option) => `
            <label class="sheet-option">
              <input class="sheet-option__input" type="radio" name="sheet-${key}" value="${option.value}">
              <span class="sheet-option__label">${option.label}</span>
            </label>`).join("")}
        </div>
      </fieldset>`).join("");

    els.sheetBody.addEventListener("change", (event) => setFilter(event.target.name.replace("sheet-", ""), event.target.value));
    els.sheetOpen.addEventListener("click", () => {
      if (typeof els.sheet.showModal === "function") els.sheet.showModal();
      else els.sheet.setAttribute("open", "");
    });
    $$("[data-sheet-close]").forEach((button) => button.addEventListener("click", () => closeSheet()));
    // A tap on the dimmed backdrop (the dialog element itself, outside its content) closes the sheet.
    els.sheet.addEventListener("click", (event) => { if (event.target === els.sheet) closeSheet(); });
  }

  function closeSheet() {
    if (typeof els.sheet.close === "function") els.sheet.close();
    else els.sheet.removeAttribute("open");
  }

  // ---- Shared filter state ---------------------------------------------------------------------

  function syncFilters() {
    FILTERS.forEach(({ key, label }) => {
      const value = state[key];
      const option = optionFor(key, value);
      const filter = els.bar.querySelector(`[data-filter="${key}"]`);
      const valueEl = filter.querySelector("[data-filter-value]");
      const remove = filter.querySelector("[data-filter-remove]");
      valueEl.textContent = option ? option.short || option.label : "All";
      filter.classList.toggle("is-set", Boolean(option));
      remove.hidden = !option;
      if (option) remove.setAttribute("aria-label", `Remove ${label.toLowerCase()} filter: ${option.label}`);
      filter.querySelector(".filter__toggle").setAttribute("aria-label", `${label}: ${option ? option.label : filterByKey(key).all}`);
      $$(`input[name="bar-${key}"], input[name="sheet-${key}"]`).forEach((input) => { input.checked = input.value === value; });
    });

    const active = activeFilters();
    const hasAny = active.length > 0 || state.q !== "";
    els.clearAll.forEach((button) => {
      if (button.closest("[data-library-tools]")) button.hidden = !hasAny;
    });
    els.filterCount.hidden = active.length === 0;
    els.filterCount.textContent = active.length;
    els.sheetOpen.setAttribute("aria-label", active.length ? `Filters, ${active.length} active` : "Filters");

    els.chips.innerHTML = active.map(({ key, label }) => {
      const option = optionFor(key, state[key]);
      return `<li><button class="active-chip" type="button" data-chip="${key}" aria-label="Remove ${label.toLowerCase()} filter: ${option.label}">
        ${option.label}<img src="assets/icons/filter-remove.svg" width="12" height="12" alt=""></button></li>`;
    }).join("");
  }

  function setFilter(key, value) {
    if (state[key] === value) return;
    state[key] = value;
    visible = PAGE_SIZE;
    syncFilters();
    writeUrl();
    renderResults();
  }

  function clearAll() {
    FILTERS.forEach(({ key }) => { state[key] = "all"; });
    state.q = "";
    els.searchInput.value = "";
    updateSearchUi();
    visible = PAGE_SIZE;
    syncFilters();
    writeUrl();
    renderResults();
  }

  // The clicked button hides once nothing is filtered, so focus moves to the first filter control
  // (inside the phone sheet focus stays where it is).
  els.clearAll.forEach((button) => button.addEventListener("click", () => {
    clearAll();
    if (button.closest("[data-sheet]")) return;
    const target = els.bar.offsetParent ? els.bar.querySelector(".filter__toggle") : els.sheetOpen;
    target.focus({ preventScroll: true });
  }));

  els.chips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-chip]");
    if (!chip) return;
    const items = $$("[data-chip]");
    const index = items.indexOf(chip);
    setFilter(chip.dataset.chip, "all");
    // Keep focus in the chip row: next chip, else the previous one, else the Filters button.
    const rest = $$("[data-chip]");
    (rest[index] || rest[index - 1] || els.sheetOpen).focus();
  });

  // ---- Search: expands to the full width while in use ------------------------------------------

  function updateSearchUi() {
    const hasText = els.searchInput.value !== "";
    els.searchClear.hidden = !hasText;
    els.search.classList.toggle("is-expanded", hasText || document.activeElement === els.searchInput);
  }

  els.searchInput.addEventListener("focus", updateSearchUi);
  els.searchInput.addEventListener("blur", () => setTimeout(updateSearchUi));   // after a click on Clear
  els.searchInput.addEventListener("input", () => {
    updateSearchUi();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = els.searchInput.value.trim().slice(0, 100);
      if (q === state.q) return;
      state.q = q;
      visible = PAGE_SIZE;
      syncFilters();
      writeUrl();
      renderResults();
    }, SEARCH_DELAY);
  });
  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && els.searchInput.value) {
      event.preventDefault();
      els.searchInput.value = "";
      els.searchInput.dispatchEvent(new Event("input"));
    }
  });
  els.searchClear.addEventListener("click", () => {
    els.searchInput.value = "";
    els.searchInput.dispatchEvent(new Event("input"));
    els.searchInput.focus();
  });

  // ---- Sort, view, load more -------------------------------------------------------------------

  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    writeUrl();
    renderResults();
  });

  function setView(view) {
    state.view = view;
    els.grid.classList.toggle("is-list", view === "list");
    els.views.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
    try { window.localStorage.setItem(VIEW_KEY, view); } catch (error) { /* not remembered: fine */ }
  }

  els.views.forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));

  els.loadMore.addEventListener("click", () => {
    const before = visible;
    visible += PAGE_SIZE;
    renderResults({ announce: false });
    const added = Math.min(visible, matches().length) - before;
    els.status.textContent = `${added} more resource${added === 1 ? "" : "s"} loaded`;
  });

  // ---- Start -----------------------------------------------------------------------------------

  readState();
  renderBar();
  renderSheet();
  els.searchInput.value = state.q;
  els.sort.value = state.sort;
  setView(state.view);
  syncFilters();
  updateSearchUi();
  renderResults({ announce: false });
})();
