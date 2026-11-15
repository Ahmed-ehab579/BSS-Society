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
    progress: document.querySelector("[data-topic-progress]"),
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

  // Every topic's materials get their keys now, so progress can be counted for topics not yet shown
  step.topics.forEach((topic) => window.BSS.registerResources(topic.resources));
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
    els.topicText.textContent = topic.short || topic.text;   // two lines here; the path page has the longer text
    els.track.innerHTML = topic.resources.map(cardHtml).join("");
    paintProgress();
  }

  // ---- Progress (js/done.js): a check on each finished topic's tab, "x of n done" for the open topic --

  const TAB_CHECK = '<svg class="topic-tab__done" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3.5 8.5l3 3 6-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function paintProgress() {
    const done = window.BSS.done;
    if (!done) return;
    step.topics.forEach((topic, i) => {
      const keys = [...new Set(topic.resources.map((item) => item.key))];
      const complete = keys.length > 0 && done.count(keys) === keys.length;
      const tab = tabs[i];
      const mark = tab.querySelector(".topic-tab__done");
      if (complete && !mark) tab.insertAdjacentHTML("beforeend", TAB_CHECK + '<span class="visually-hidden topic-tab__done-text"> (done)</span>');
      if (!complete && mark) {
        mark.remove();
        tab.querySelector(".topic-tab__done-text")?.remove();
      }
    });
    const keys = [...new Set(step.topics[topicIndex].resources.map((item) => item.key))];
    if (!els.progress.firstElementChild) els.progress.outerHTML = done.ringHtml("data-topic-progress");
    els.progress = document.querySelector("[data-topic-progress]");
    done.paintRing(els.progress, done.count(keys), keys.length, "topic");
  }

  window.BSS.done?.onChange(paintProgress);

  // ---- Phones: the materials in the Library's layouts, cards (one a row) or a list --------------
  // The track takes the Library's grid class on phones only (css/library.css); desktop keeps its row.
  const phoneView = matchMedia("(max-width: 767px)");
  const VIEW_KEY = "bss.step.view.v1";
  const viewButtons = [...document.querySelectorAll("[data-step-views] [data-view]")];
  let view = "one";
  try {
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "one" || saved === "list") view = saved;
  } catch (error) { /* storage blocked: keep the default */ }

  function applyLayout() {
    const track = els.track;
    const phone = phoneView.matches;
    track.classList.toggle("topic-panel__track", !phone);
    track.classList.toggle("resource-grid", phone);
    if (phone) track.dataset.layout = view; else delete track.dataset.layout;
    viewButtons.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
  }

  viewButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.view === view) return;
    view = button.dataset.view;
    try { window.localStorage.setItem(VIEW_KEY, view); } catch (error) { /* not remembered: fine */ }
    if (document.startViewTransition && !reducedMotion.matches) {
      const cards = [...els.track.children];
      cards.forEach((card, index) => { card.style.viewTransitionName = `step-resource-${index}`; });
      document.startViewTransition(applyLayout).finished.finally(() => cards.forEach((card) => card.style.removeProperty("view-transition-name")));
    } else {
      applyLayout();
    }
  }));
  phoneView.addEventListener("change", applyLayout);
  applyLayout();

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

  showTopic(topicIndex);
})();
