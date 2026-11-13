// New Muslim path: "Mark as done". A material opened from the path can be marked as done; the path then
// shows it: a green check on the material's card, a check on a topic tab once all its materials are done,
// and progress on each step. Kept in this browser until accounts exist (like Saved, js/saved.js).
// Used by js/preview.js (materials), js/article.js (the article), js/new-muslim-step.js and js/new-muslim.js.
(() => {
  const STORE = "bss-new-muslim-done";
  const listeners = [];
  let done = read();

  function read() {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORE) || "[]"));
    } catch (error) {
      return new Set();
    }
  }

  function write() {
    try {
      localStorage.setItem(STORE, JSON.stringify([...done]));
      return true;
    } catch (error) {
      return false;
    }
  }

  const has = (key) => done.has(key);
  const count = (keys) => keys.filter(has).length;

  function set(key, on) {
    if (on) done.add(key);
    else done.delete(key);
    const stored = write();
    changed();
    return stored;
  }

  function changed() {
    paint();
    listeners.forEach((fn) => fn());
  }

  // Another tab marked something: show it here too
  window.addEventListener("storage", (event) => {
    if (event.key !== STORE) return;
    done = read();
    changed();
  });

  // Only the New Muslim path shows done marks; the same material in the Library stays plain
  const params = new URLSearchParams(location.search);
  const inPath = location.pathname.includes("new-muslim") || params.get("from") === "new-muslim";

  // ---- The "Mark as done" card (materials and the article) -----------------------------------------

  const CIRCLE_CHECK = '<svg class="done-card__icon" viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="21.5" stroke="currentColor" stroke-width="3"/><path class="done-card__tick" d="M15 24.5l6.5 6.5L33.5 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';

  function blockHtml(key) {
    return `<section class="done-card" data-done-key="${key}" aria-label="Your progress">
      ${CIRCLE_CHECK}
      <div class="done-card__copy">
        <p class="done-card__title" data-done-title>Finished this one?</p>
        <p class="done-card__text" data-done-text aria-live="polite">Mark it as done to tick it off on your New Muslim path.</p>
      </div>
      <div class="done-card__actions">
        <button class="btn btn--primary btn--regular done-card__mark" type="button" data-done-mark>Mark as done</button>
        <button class="done-card__undo" type="button" data-done-undo hidden>Mark as not done</button>
      </div>
    </section>`;
  }

  function paintBlock(block, { celebrate = false } = {}) {
    const isDone = has(block.dataset.doneKey);
    block.classList.toggle("is-done", isDone);
    block.classList.toggle("is-celebrating", celebrate && isDone);
    block.querySelector("[data-done-title]").textContent = isDone ? "Done. Well done!" : "Finished this one?";
    block.querySelector("[data-done-text]").textContent = isDone
      ? "It’s ticked off on your New Muslim path."
      : "Mark it as done to tick it off on your New Muslim path.";
    block.querySelector("[data-done-mark]").hidden = isDone;
    block.querySelector("[data-done-undo]").hidden = !isDone;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-done-mark], [data-done-undo]");
    if (!button) return;
    const block = button.closest("[data-done-key]");
    const marking = button.hasAttribute("data-done-mark");
    const stored = set(block.dataset.doneKey, marking);
    paintBlock(block, { celebrate: marking });
    if (!stored) block.querySelector("[data-done-text]").textContent = "Couldn’t save on this device.";
    // Keep keyboard focus on the card's remaining button
    block.querySelector(marking ? "[data-done-undo]" : "[data-done-mark]").focus({ preventScroll: true });
  });

  // ---- Done marks on cards ---------------------------------------------------------------------------

  function paintCards() {
    if (!inPath) return;
    document.querySelectorAll("[data-resource]").forEach((card) => {
      const isDone = has(card.dataset.resource);
      card.classList.toggle("is-done", isDone);
      const badge = card.querySelector(".resource-card__done");
      if (badge) badge.hidden = !isDone;
    });
  }

  function paint() {
    paintCards();
    document.querySelectorAll("[data-done-key]").forEach((block) => paintBlock(block));
  }

  // Cards and cards' previews are drawn by script at any time: mark them as they appear
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paintCards();
      document.querySelectorAll("[data-done-key]:not([data-done-painted])").forEach((block) => {
        block.setAttribute("data-done-painted", "");
        paintBlock(block);
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  window.BSS = window.BSS || {};
  window.BSS.done = {
    has, set, count, inPath, blockHtml,
    onChange: (fn) => listeners.push(fn),
  };
})();
