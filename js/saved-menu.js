// Saved menu in the site header: the bookmark button, its count and the menu it opens (js/saved.js keeps
// the list). Works like the language picker (js/language.js): a dropdown under the icon on wider screens,
// a sheet from the bottom on phones (drag down to dismiss). Filter chips show which path each save
// belongs to; removing one leaves an Undo in its place for a few seconds.
(function () {
  const BSS = window.BSS;
  const toggle = document.querySelector("[data-saved-toggle]");
  if (!toggle || !BSS || !BSS.saved || typeof HTMLDialogElement === "undefined") return;

  const UNDO_TIME = 6000;          // ms the Undo stays after a remove
  const DISMISS_DISTANCE = 110;    // px dragged down that closes the sheet
  const DISMISS_SPEED = 0.6;       // px per ms: a quick flick closes it from any distance
  const DROPDOWN_GAP = 8;          // px between the icon and the dropdown
  const DROPDOWN_CLOSE = 150;      // ms, matches the dropdown's closing transition
  const TYPES = { book: "Book", audio: "Audio book", video: "Video", article: "Article", step: "" };   // a step says "Step 2" in its label
  const COVERS = ["book", "audio"];   // shown whole on a light board, like the Library cards
  const PATH_PAGES = { "start-here": "start-here.html", "new-muslim": "new-muslim.html", library: "library.html" };
  const CROSS = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideScreen = window.matchMedia("(min-width: 768px)");
  const escape = (text) => String(text ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---- Count on the header button -----------------------------------------------------------------

  const count = toggle.querySelector("[data-saved-count]");
  let shown = -1;

  let holdCount = false;   // true while a saved item flies to the icon (the count changes when it lands)

  function showCount() {
    if (holdCount) return;
    const total = BSS.saved.list().length;
    if (total === shown) return;
    const grew = shown >= 0 && total > shown;
    shown = total;
    count.hidden = total === 0;
    count.textContent = total > 99 ? "99+" : String(total);
    toggle.setAttribute("aria-label", total ? `Saved, ${total} ${total === 1 ? "item" : "items"}` : "Saved");
    if (grew) {
      count.classList.remove("is-bumping");
      count.getBoundingClientRect();   // restart the animation on quick repeat saves
      count.classList.add("is-bumping");
    }
  }

  // ---- The menu -----------------------------------------------------------------------------------

  const dialog = document.createElement("dialog");
  dialog.className = "saved-dialog";
  dialog.setAttribute("aria-labelledby", "saved-title");
  dialog.innerHTML = `
    <div class="saved-dialog__backdrop"></div>
    <div class="saved-sheet" tabindex="-1">
      <div class="saved-sheet__head">
        <span class="saved-sheet__grabber" aria-hidden="true"></span>
        <h2 class="saved-sheet__title" id="saved-title">Saved</h2>
        <button class="saved-sheet__close" type="button" aria-label="Close">${CROSS}</button>
      </div>
      <div class="saved-filters" role="group" aria-label="Show saved from"></div>
      <ul class="saved-list" aria-labelledby="saved-title"></ul>
      <div class="saved-empty" hidden>
        <img class="saved-empty__icon" src="assets/icons/saved.svg" width="32" height="32" alt="">
        <p class="saved-empty__title"></p>
        <p class="saved-empty__text"></p>
        <a class="saved-empty__link"></a>
      </div>
      <p class="saved-sheet__note"></p>
      <p class="visually-hidden" role="status" data-saved-status></p>
    </div>`;
  document.body.append(dialog);

  const sheet = dialog.querySelector(".saved-sheet");
  const head = dialog.querySelector(".saved-sheet__head");
  const backdrop = dialog.querySelector(".saved-dialog__backdrop");
  const filters = dialog.querySelector(".saved-filters");
  const list = dialog.querySelector(".saved-list");
  const empty = dialog.querySelector(".saved-empty");
  const note = dialog.querySelector(".saved-sheet__note");
  const status = dialog.querySelector("[data-saved-status]");
  let filter = "all";
  let undo = null;          // { entry, timer } for the item just removed
  let closeTimer = null;
  let isDropdown = false;

  function chipsHtml(all) {
    const chips = [["all", "All", all.length]].concat(
      Object.entries(BSS.saved.PATHS).map(([path, label]) => [path, label, all.filter((entry) => entry.path === path).length]));
    return chips.map(([path, label, total]) => `
      <button class="saved-chip" type="button" data-filter="${path}" aria-pressed="${path === filter}">
        ${label}<span class="saved-chip__count">${total}</span>
      </button>`).join("");
  }

  function rowHtml(entry) {
    const title = escape(entry.title || "Saved item");
    const meta = [BSS.saved.PATHS[entry.path], TYPES[entry.type], entry.label].filter(Boolean).map(escape);
    const cover = COVERS.includes(entry.type) ? " saved-row__thumb--cover" : "";
    const picture = entry.image
      ? `<img src="${escape(entry.image)}" alt="" loading="lazy" decoding="async" onerror="this.hidden = true">`
      : "";
    return `
      <li class="saved-row" data-key="${escape(entry.key)}">
        <a class="saved-row__link" href="${escape(entry.url || PATH_PAGES[entry.path])}">
          <span class="saved-row__thumb${cover}">${picture}</span>
          <span class="saved-row__text">
            <span class="saved-row__meta"><span class="saved-row__path">${meta[0]}</span>${meta.slice(1).map((part) => ` · ${part}`).join("")}</span>
            <span class="saved-row__title">${title}</span>
          </span>
        </a>
        <button class="saved-row__remove" type="button" aria-label="Remove ${title} from saved">
          <img src="assets/icons/bookmark-filled.svg" width="11.55" height="14.85" alt="">
        </button>
      </li>`;
  }

  const undoHtml = (entry) => `
    <li class="saved-row saved-row--undo" data-undo="${escape(entry.key)}">
      <span class="saved-row__removed">Removed <span class="saved-row__removed-title">${escape(entry.title)}</span></span>
      <button class="saved-row__undo" type="button">Undo</button>
    </li>`;

  function render() {
    const all = BSS.saved.list();
    const shownEntries = all.filter((entry) => filter === "all" || entry.path === filter);
    const focusedKey = document.activeElement?.closest?.(".saved-row")?.dataset.key;
    filters.innerHTML = chipsHtml(all);
    filters.hidden = all.length === 0 && !undo;

    // The removed item keeps its place, newest first, so Undo sits where the item was
    const rows = shownEntries.slice();
    const undoShown = undo && (filter === "all" || undo.entry.path === filter);
    if (undoShown) {
      const index = rows.findIndex((entry) => (entry.savedAt || 0) < (undo.entry.savedAt || 0));
      rows.splice(index < 0 ? rows.length : index, 0, { undo: undo.entry });
    }
    list.innerHTML = rows.map((row) => (row.undo ? undoHtml(row.undo) : rowHtml(row))).join("");
    list.hidden = rows.length === 0;
    empty.hidden = rows.length !== 0;

    if (!rows.length) {
      const path = BSS.saved.PATHS[filter];
      empty.querySelector(".saved-empty__title").textContent = path ? `Nothing saved from ${path} yet` : "Nothing saved yet";
      empty.querySelector(".saved-empty__text").textContent = "Press the bookmark on a book, video or article to keep it here for later.";
      const link = empty.querySelector(".saved-empty__link");
      link.href = PATH_PAGES[filter] || "library.html";
      link.textContent = path ? `Go to ${path}` : "Explore the library";
    }

    note.textContent = BSS.saved.failed()
      ? "This browser isn’t keeping your saves. They’ll be gone when you close this tab."
      : "Saved on this device only";

    if (focusedKey) list.querySelector(`[data-key="${CSS.escape(focusedKey)}"] .saved-row__link`)?.focus({ preventScroll: true });
  }

  function remove(key) {
    const entry = BSS.saved.list().find((item) => item.key === key);
    if (!entry) return;
    clearUndo();
    undo = { entry, timer: setTimeout(() => { undo = null; render(); }, UNDO_TIME) };
    BSS.saved.remove(key);   // renders through onChange
    status.textContent = `Removed ${entry.title} from saved`;
    list.querySelector(".saved-row__undo")?.focus({ preventScroll: true });
  }

  function restore() {
    if (!undo) return;
    const { entry } = undo;
    clearUndo();
    BSS.saved.add(entry, entry.savedAt);
    status.textContent = `${entry.title} is back in saved`;
    list.querySelector(`[data-key="${CSS.escape(entry.key)}"] .saved-row__link`)?.focus({ preventScroll: true });
  }

  function clearUndo() {
    if (!undo) return;
    clearTimeout(undo.timer);
    undo = null;
  }

  filters.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-filter]");
    if (!chip) return;
    filter = chip.dataset.filter;
    render();
    filters.querySelector(`[data-filter="${filter}"]`).focus({ preventScroll: true });
    list.scrollTop = 0;
  });

  list.addEventListener("click", (event) => {
    const removeButton = event.target.closest(".saved-row__remove");
    if (removeButton) remove(removeButton.closest(".saved-row").dataset.key);
    else if (event.target.closest(".saved-row__undo")) restore();
  });

  // ---- Opening and closing (as in js/language.js) ---------------------------------------------------

  function open() {
    if (dialog.open) return;
    clearTimeout(closeTimer);
    if (root.classList.contains("is-menu-open")) document.querySelector(".menu-toggle").click();
    isDropdown = wideScreen.matches;
    dialog.classList.toggle("is-dropdown", isDropdown);
    render();
    if (isDropdown) {
      placeDropdown();
      dialog.show();
      document.addEventListener("pointerdown", closeFromOutside);
      window.addEventListener("scroll", closeWithoutFocus, { passive: true });
      window.addEventListener("resize", placeDropdown);
    } else {
      root.classList.add("is-sheet-open");
      dialog.showModal();
    }
    toggle.setAttribute("aria-expanded", "true");
    list.scrollTop = 0;
    sheet.focus({ preventScroll: true });
    sheet.getBoundingClientRect();   // start from the closed position
    dialog.classList.add("is-open");
  }

  // Under the icon, its right edge lined up with the icon's
  function placeDropdown() {
    const icon = toggle.getBoundingClientRect();
    dialog.style.setProperty("--dropdown-top", `${Math.round(icon.bottom + DROPDOWN_GAP)}px`);
    dialog.style.setProperty("--dropdown-right", `${Math.round(root.clientWidth - icon.right)}px`);
  }

  function closeFromOutside(event) {
    if (!sheet.contains(event.target) && !toggle.contains(event.target)) closeWithoutFocus();
  }

  function closeWithoutFocus() {
    close({ returnFocus: false });
  }

  function finish(returnFocus = true) {
    document.removeEventListener("pointerdown", closeFromOutside);
    window.removeEventListener("scroll", closeWithoutFocus);
    window.removeEventListener("resize", placeDropdown);
    dialog.close();
    if (returnFocus) toggle.focus({ preventScroll: true });
    root.classList.remove("is-sheet-open");
    toggle.setAttribute("aria-expanded", "false");
    sheet.style.removeProperty("transform");
    backdrop.style.removeProperty("opacity");
    clearUndo();
  }

  function close({ returnFocus = true } = {}) {
    if (!dialog.open || !dialog.classList.contains("is-open")) return;
    dialog.classList.remove("is-open");
    sheet.classList.remove("is-dragging");
    sheet.style.removeProperty("transform");
    backdrop.style.removeProperty("opacity");
    const duration = parseFloat(getComputedStyle(root).getPropertyValue("--motion-duration-sheet-out")) || 0;
    const time = isDropdown ? DROPDOWN_CLOSE : duration;
    closeTimer = setTimeout(() => finish(returnFocus), reducedMotion.matches ? 0 : time);
  }

  toggle.addEventListener("click", () => {
    if (dialog.classList.contains("is-open")) close();
    else open();
  });
  backdrop.addEventListener("click", () => close());
  dialog.querySelector(".saved-sheet__close").addEventListener("click", () => close());
  wideScreen.addEventListener("change", () => close({ returnFocus: false }));   // the two layouts differ

  // Tabbing out of the dropdown closes it
  dialog.addEventListener("focusout", (event) => {
    if (isDropdown && event.relatedTarget && !dialog.contains(event.relatedTarget)) closeWithoutFocus();
  });

  // Back gesture on Android, and Esc
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  // Drag the top of the sheet down to dismiss it
  let drag = null;

  head.addEventListener("pointerdown", (event) => {
    if (isDropdown || event.target.closest("button") || !dialog.classList.contains("is-open")) return;
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

  // Back to this page from the browser's cache with the menu still open
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && dialog.open) {
      dialog.classList.remove("is-open");
      finish(false);
    }
  });

  // ---- Fly to the header: a saved item rises from its Save button into the header bookmark ----------
  // Like a browser's download animation: a dark bookmark lifts off the button, arcs up to the header
  // icon and shrinks into it; the icon then pulses and the count goes up. Skipped with reduced motion.
  // Callers call BSS.savedFly(button) just before saving; it returns a promise for the landing.
  const FLY_ICON = '<svg viewBox="0 0 11.55 14.85" width="11.55" height="14.85" aria-hidden="true"><path fill="currentColor" d="M0 14.85V1.65C0 1.2.16.81.48.48.81.16 1.2 0 1.65 0H9.9c.45 0 .84.16 1.17.48.32.33.48.71.48 1.17v13.2L5.78 12.38 0 14.85Z"/></svg>';
  let flight = null;

  // Where the icon will be: a header hidden by scrolling slides back first
  function iconBox() {
    const header = document.querySelector(".site-header");
    header?.classList.remove("is-hidden");
    const slide = header ? new DOMMatrix(getComputedStyle(header).transform).m42 : 0;
    const box = toggle.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top - slide + box.height / 2, width: box.width, bottom: box.bottom - slide, right: box.right };
  }

  BSS.savedFly = function (from) {
    if (!from || reducedMotion.matches || dialog.open || !toggle.offsetParent || !Element.prototype.animate) return null;
    const start = (from.querySelector("img, svg") || from).getBoundingClientRect();
    if (!start.width) return null;
    const end = iconBox();
    const x0 = start.left + start.width / 2;
    const y0 = start.top + start.height / 2;
    const dx = end.x - x0;
    const dy = end.y - y0;
    const time = Math.min(900, Math.max(520, Math.hypot(dx, dy) * 0.75));   // farther flies a little longer

    // Two layers make the arc: the outer one moves across, the inner one rises at a different pace
    const across = document.createElement("div");
    across.className = "saved-fly";
    across.style.left = `${x0}px`;
    across.style.top = `${y0}px`;
    across.innerHTML = `<div class="saved-fly__rise"><div class="saved-fly__chip">${FLY_ICON}</div></div>`;
    document.body.append(across);
    const rise = across.firstElementChild;
    const chip = rise.firstElementChild;

    holdCount = true;
    hideHint();   // an earlier "Removed" note would sit in its way
    across.animate([{ transform: "translateX(0)" }, { transform: `translateX(${dx}px)` }],
      { duration: time, easing: "cubic-bezier(0.55, 0, 0.75, 0.45)", fill: "forwards" });
    rise.animate([{ transform: "translateY(0)" }, { transform: `translateY(${dy}px)` }],
      { duration: time, easing: "cubic-bezier(0.2, 0.6, 0.35, 1)", fill: "forwards" });
    const shrink = chip.animate([
      { transform: "scale(0.6)", opacity: 0 },
      { transform: "scale(1.15)", opacity: 1, offset: 0.14 },
      { transform: "scale(1)", opacity: 1, offset: 0.3 },
      { transform: "scale(0.45)", opacity: 0.9, offset: 0.92 },
      { transform: "scale(0.3)", opacity: 0 },
    ], { duration: time, easing: "linear", fill: "forwards" });

    const landed = shrink.finished.catch(() => {}).then(() => {
      across.remove();
      toggle.classList.remove("is-landing");
      toggle.getBoundingClientRect();
      toggle.classList.add("is-landing");
      holdCount = false;
      showCount();
      if (flight === landed) flight = null;
    });
    flight = landed;
    return landed;
  };

  toggle.addEventListener("animationend", () => toggle.classList.remove("is-landing"));

  // ---- "Saved. Find it here" bubble under the header icon ----------------------------------------------
  // Shown after a save so people learn where their saves go; View opens the menu.
  const HINT_TIME = 3500;   // ms the bubble stays
  const hint = document.createElement("div");
  hint.className = "saved-hint";
  hint.setAttribute("role", "status");
  hint.innerHTML = `<span class="saved-hint__text"></span><button class="saved-hint__view" type="button">View</button>`;
  document.body.append(hint);
  const hintText = hint.querySelector(".saved-hint__text");
  const hintView = hint.querySelector(".saved-hint__view");
  let hintTimer = null;

  function hideHint() {
    clearTimeout(hintTimer);
    hint.classList.remove("is-visible");
  }

  // kind: "saved", "removed" or "failed"
  BSS.savedHint = function (kind = "saved") {
    if (flight) {
      flight.then(() => BSS.savedHint(kind));   // after the item has landed on the icon
      return;
    }
    if (dialog.open) return;
    const icon = iconBox();   // the icon has to be in view
    hint.style.setProperty("--hint-top", `${Math.round(icon.bottom + 6)}px`);
    hint.style.setProperty("--hint-right", `${Math.max(12, Math.round(root.clientWidth - icon.right - 6))}px`);
    hint.style.setProperty("--hint-arrow", `${Math.round(icon.width / 2 + 6 - Math.max(0, 12 - (root.clientWidth - icon.right - 6)))}px`);
    hintText.textContent = {
      saved: "Saved. Find it here anytime.",
      removed: "Removed from saved",
      failed: "Couldn’t save on this device",
    }[kind];
    hintView.hidden = kind !== "saved";
    hint.classList.remove("is-visible");
    hint.getBoundingClientRect();   // replay the entrance on quick repeat saves
    hint.classList.add("is-visible");
    clearTimeout(hintTimer);
    hintTimer = setTimeout(hideHint, HINT_TIME);
  };

  hintView.addEventListener("click", () => {
    hideHint();
    open();
  });
  hint.addEventListener("pointerenter", () => clearTimeout(hintTimer));   // stays while the pointer is on it
  hint.addEventListener("pointerleave", () => { hintTimer = setTimeout(hideHint, 1500); });
  toggle.addEventListener("click", hideHint);
  window.addEventListener("resize", hideHint);

  // ---- Save buttons on article and step pages ------------------------------------------------------
  // <button data-save> with a [data-save-text] label; getEntry() describes the page (js/saved.js entry)
  BSS.saveButton = function (button, getEntry) {
    const text = button.querySelector("[data-save-text]");
    const show = () => {
      const saved = BSS.saved.has(getEntry().key);
      button.setAttribute("aria-pressed", String(saved));
      if (text) text.textContent = saved ? "Saved" : "Save";
    };
    button.addEventListener("click", () => {
      if (!BSS.saved.has(getEntry().key)) BSS.savedFly(button);
      const { saved, stored } = BSS.saved.toggle(getEntry());
      show();
      BSS.savedHint(stored ? (saved ? "saved" : "removed") : "failed");
      button.classList.remove("is-popping");
      button.getBoundingClientRect();   // restart the animation on quick repeat presses
      button.classList.add("is-popping");
    });
    show();
    BSS.saved.refresh(getEntry());
    BSS.saved.onChange(show);   // also when removed from the Saved menu or in another tab
  };

  showCount();
  BSS.saved.onChange(() => {
    showCount();
    if (dialog.open) render();
  });
})();
