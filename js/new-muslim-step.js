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
  els.outcomes.innerHTML = step.outcomes.map((text) => `
    <li class="learn__item">
      <img src="assets/icons/check.svg" width="24" height="24" alt="">${escape(text)}
    </li>`).join("");

  // ---- Topic tabs -------------------------------------------------------------------------------

  els.tabs.innerHTML = step.topics.map((topic, i) => `
    <button class="topic-tab" type="button" role="tab" id="topic-tab-${i + 1}" aria-controls="topic-panel"
      aria-selected="false" tabindex="-1">Topic ${i + 1}<span class="visually-hidden">: ${escape(topic.title)}</span></button>`).join("");
  const tabs = [...els.tabs.querySelectorAll('[role="tab"]')];

  // `reveal` (user actions only): bring the tab into view in the row, which scrolls sideways on phones
  function showTopic(index, { focusTab = false, reveal = false } = {}) {
    topicIndex = index;
    const topic = step.topics[index];
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    if (focusTab) tabs[index].focus();
    if (reveal) tabs[index].scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion.matches ? "auto" : "smooth" });

    els.panel.setAttribute("aria-labelledby", tabs[index].id);
    els.number.textContent = pad(index + 1);
    els.topicTitle.textContent = topic.title;
    els.topicText.textContent = topic.text;
    els.track.innerHTML = topic.resources.map(cardHtml).join("");
    els.track.scrollLeft = 0;
    updateArrows();

    // Keep the view in the URL without adding a history entry for every tab
    const url = new URL(location.href);
    url.searchParams.set("step", step.id);
    url.searchParams.set("topic", index + 1);
    history.replaceState(null, "", url);
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => showTopic(i, { reveal: true })));

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation)
  els.tabs.addEventListener("keydown", (event) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const move = moves[event.key];
    const last = tabs.length - 1;
    const target = move === -Infinity ? 0 : move === Infinity ? last : (topicIndex + move + tabs.length) % tabs.length;
    showTopic(target, { focusTab: true, reveal: true });
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
  }

  [els.prev, els.next].forEach((button) => button.addEventListener("click", () => {
    els.track.scrollBy({ left: Number(button.dataset.scroll) * cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" });
  }));

  els.track.addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);

  showTopic(topicIndex);
})();
