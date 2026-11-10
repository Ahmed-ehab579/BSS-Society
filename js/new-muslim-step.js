// New Muslim step page (Figma 1137:4893): what the step covers, then the suggested resources for each of
// its topics. The step and topic live in the URL (?step=2&topic=3) so a view can be linked and reloaded;
// anything missing or out of range falls back to the first one.
(function () {
  const STEPS = window.BSS.NEW_MUSLIM_STEPS;   // js/new-muslim-data.js
  const cardHtml = window.BSS.resourceCardHtml;   // js/resource-card.js

  const els = {
    title: document.querySelector("[data-step-title]"),
    intro: document.querySelector("[data-step-intro]"),
    outcomes: document.querySelector("[data-outcomes]"),
    tabs: document.querySelector("[data-tabs]"),
    panel: document.querySelector("[data-panel]"),
    number: document.querySelector("[data-topic-number]"),
    topicTitle: document.querySelector("[data-topic-title]"),
    topicText: document.querySelector("[data-topic-text]"),
    track: document.querySelector("[data-resources]"),
    dots: document.querySelector("[data-dots]"),
    prev: document.querySelector('[data-scroll="-1"]'),
    next: document.querySelector('[data-scroll="1"]'),
  };
  if (!els.tabs) return;

  const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  // ---- Step (from the URL) --------------------------------------------------------------------

  const params = new URLSearchParams(location.search);
  const inRange = (value, max) => (Number.isInteger(value) && value >= 1 && value <= max ? value : 1);
  const step = STEPS[inRange(Number(params.get("step")), STEPS.length) - 1];
  let topicIndex = inRange(Number(params.get("topic")), step.topics.length) - 1;

  document.title = `${step.title} — New Muslim — Best Speech Society`;
  els.title.textContent = step.title;
  els.intro.textContent = step.intro;

  // Save this step (js/saved-menu.js)
  const saveButton = document.querySelector("[data-save]");
  if (saveButton && window.BSS?.saveButton) {
    window.BSS.saveButton(saveButton, () => ({
      key: `new-muslim-step-${step.id}`, path: "new-muslim", type: "step", label: `Step ${step.id}`,
      title: step.title, image: step.topics[0].image, url: `new-muslim-step.html?step=${step.id}`,
    }));
  }
  els.outcomes.innerHTML = step.outcomes.map((text) => `
    <li class="learn__item">
      <img src="assets/icons/check.svg" width="24" height="24" alt="">${escape(text)}
    </li>`).join("");

  // ---- Topic tabs -------------------------------------------------------------------------------

  els.tabs.innerHTML = step.topics.map((topic, i) => `
    <button class="topic-tab" type="button" role="tab" id="topic-tab-${i + 1}" aria-controls="topic-panel"
      aria-selected="false" tabindex="-1">Topic ${i + 1}<span class="visually-hidden">: ${escape(topic.title)}</span></button>`).join("");
  const tabs = [...els.tabs.querySelectorAll('[role="tab"]')];

  // `reveal` (user actions only): bring the tab into view in the row, which scrolls sideways on phones.
  // `animate` (user actions only): the panel's content fades across instead of swapping instantly.
  function showTopic(index, { focusTab = false, reveal = false, animate = false } = {}) {
    const changed = index !== topicIndex;
    topicIndex = index;
    const topic = step.topics[index];
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (focusTab) tabs[index].focus();
    if (reveal) tabs[index].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });

    // Keep the view in the URL without adding a history entry for every tab (set before rendering:
    // the cards' article links read it)
    const url = new URL(location.href);
    url.searchParams.set("step", step.id);
    url.searchParams.set("topic", index + 1);
    history.replaceState(null, "", url);
    els.panel.setAttribute("aria-labelledby", tabs[index].id);
    if (animate && changed && !reducedMotion.matches) swapAnimated(() => renderTopic(index));
    else if (changed || !animate) renderTopic(index);

  }

  function renderTopic(index) {
    const topic = step.topics[index];
    els.number.textContent = pad(index + 1);
    els.topicTitle.textContent = topic.title;
    els.topicText.textContent = topic.text;
    els.track.innerHTML = topic.resources.map(cardHtml).join("");
    els.track.scrollLeft = 0;
    updateArrows();
  }

  // Topic change: the old content fades out quickly, the panel eases to its new height and the new
  // content fades up, the cards following one another by a few milliseconds. A newer click cancels
  // an unfinished change.
  const parts = () => [els.panel.querySelector(".topic-panel__intro"), ...els.track.children];
  let swapId = 0;
  function swapAnimated(render) {
    const id = ++swapId;
    els.panel.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    const from = els.panel.getBoundingClientRect().height;
    const fadeOut = parts().map((el) => el.animate(
      [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-4px)" }],
      { duration: 140, easing: "ease-in", fill: "forwards" }));
    Promise.all(fadeOut.map((animation) => animation.finished)).then(() => {
      if (id !== swapId) return;
      fadeOut.forEach((animation) => animation.cancel());
      render();
      const to = els.panel.getBoundingClientRect().height;
      if (Math.abs(to - from) > 1) {
        els.panel.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: 320, easing: "cubic-bezier(0.2, 0, 0, 1)" });
      }
      parts().forEach((el, i) => el.animate(
        [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }],
        { duration: 320, delay: i === 0 ? 0 : 40 + i * 30, easing: "cubic-bezier(0.2, 0, 0, 1)", fill: "backwards" }));
    }).catch(() => { /* cancelled by a newer change */ });
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => showTopic(i, { reveal: true, animate: true })));

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation)
  els.tabs.addEventListener("keydown", (event) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const move = moves[event.key];
    const last = tabs.length - 1;
    const target = move === -Infinity ? 0 : move === Infinity ? last : (topicIndex + move + tabs.length) % tabs.length;
    showTopic(target, { focusTab: true, reveal: true, animate: true });
  });

  // ---- Resource row: scrolls by one card; the arrows switch off at either end ----------------------

  function cardStep() {
    const card = els.track.firstElementChild;
    if (!card) return 0;
    return card.getBoundingClientRect().width + parseFloat(getComputedStyle(els.track).columnGap || 0);
  }

  function updateArrows() {
    const max = els.track.scrollWidth - els.track.clientWidth;
    els.prev.disabled = els.track.scrollLeft <= 1;
    els.next.disabled = els.track.scrollLeft >= max - 1;
    updateDots();
  }

  // Dots (phones): one per stop the row can actually snap to. Cards near the end share the last stop
  // (the row can't scroll further), so a wide screen gets fewer dots than cards. The active dot is
  // the stop nearest to the current scroll. A visual aid for touch; keyboard users have the cards.
  let stops = [];
  function snapStops() {
    const max = els.track.scrollWidth - els.track.clientWidth;
    const pad = parseFloat(getComputedStyle(els.track).scrollPaddingLeft) || 0;
    const origin = els.track.getBoundingClientRect().left - els.track.scrollLeft + pad;
    const positions = [...els.track.children].map((card) =>
      Math.max(0, Math.min(max, Math.round(card.getBoundingClientRect().left - origin))));
    return positions.filter((position, i) => i === 0 || position - positions[i - 1] > 2);
  }

  function updateDots() {
    if (getComputedStyle(els.dots).display === "none") return;
    const next = snapStops();
    if (next.length !== stops.length || next.some((position, i) => position !== stops[i])) {
      stops = next;
      els.dots.innerHTML = stops.length < 2 ? "" : stops.map((position, i) => `
        <button class="topic-panel__dot" type="button" tabindex="-1" aria-label="Show position ${i + 1} of ${stops.length}"></button>`).join("");
    }
    const left = els.track.scrollLeft;
    const active = stops.reduce((best, position, i) => (Math.abs(position - left) < Math.abs(stops[best] - left) ? i : best), 0);
    [...els.dots.children].forEach((dot, i) => {
      dot.classList.toggle("is-active", i === active);
      if (i === active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  els.dots.addEventListener("click", (event) => {
    const dot = event.target.closest(".topic-panel__dot");
    if (!dot) return;
    const left = stops[[...els.dots.children].indexOf(dot)];
    els.track.scrollTo({ left, behavior: reducedMotion.matches ? "auto" : "smooth" });
  });

  [els.prev, els.next].forEach((button) => button.addEventListener("click", () => {
    els.track.scrollBy({ left: Number(button.dataset.scroll) * cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" });
  }));

  els.track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  showTopic(topicIndex);
})();
