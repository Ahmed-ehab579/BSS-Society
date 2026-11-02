// New Muslim path: four steps, each with a few topics, and a link to each step's page. Every step stays
// open: nobody is ever blocked. Progress tracking will come later with its own rules.
(function () {
  const STEPS = window.BSS.NEW_MUSLIM_STEPS;   // js/new-muslim-data.js

  const list = document.querySelector("[data-path]");
  if (!list) return;

  // ---- Rendering ----------------------------------------------------------------------------

  const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");

  function stepHtml(step) {
    return `
      <li class="path-step" data-step="${step.id}">
        <div class="path-step__header">
          <div class="path-step__intro">
            <span class="path-step__number" aria-hidden="true">${pad(step.id)}</span>
            <h3 class="path-step__title"><span class="visually-hidden">Step ${step.id}: </span>${escape(step.title)}</h3>
            <p class="path-step__text">${escape(step.text)}</p>
          </div>
          <div class="path-step__actions">
            <a class="btn btn--regular btn--primary path-step__start" href="new-muslim-step.html?step=${step.id}">
              <span>Start step ${step.id}</span>
              <span class="btn__arrow-clip" aria-hidden="true">
                <span class="btn__arrow-track">
                  <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                  <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                </span>
              </span>
            </a>
            <button class="btn btn--regular btn--secondary path-step__toggle" type="button" aria-expanded="false" aria-controls="step-${step.id}-content" data-toggle>
              <span data-toggle-label>Discover the content</span>
              <img class="path-step__chevron" src="assets/icons/chevron-down-solid.svg" width="16" height="10" alt="">
            </button>
          </div>
        </div>
        <div class="path-step__content" id="step-${step.id}-content">
          <div class="path-step__clip">
          <div class="path-step__body">
          <ul class="topic-list" role="list" aria-label="Topics in step ${step.id}">
            ${step.topics.map((topic) => `
              <li class="topic" role="listitem" data-topic="${topic.id}">
                <button class="topic__row" type="button" aria-expanded="false" aria-controls="topic-${topic.id}">
                  <span class="topic__title">${escape(topic.title)}</span>
                  <img class="topic__chevron" src="assets/icons/row-chevron.svg" width="24" height="24" alt="">
                </button>
                <div class="topic-preview" id="topic-${topic.id}" style="--span: ${step.topics.length + 1}" role="region" aria-label="${escape(topic.title)}">
                  <div class="topic-preview__clip">
                    <div class="topic-preview__card">
                      <img class="topic-preview__image" src="${topic.image}" alt="" loading="lazy" decoding="async" style="object-position: ${topic.focus}" onerror="this.hidden = true">
                      <p class="topic-preview__text">${escape(topic.text)}</p>
                    </div>
                  </div>
                </div>
              </li>`).join("")}
          </ul>
          </div>
          </div>
        </div>
      </li>`;
  }

  list.innerHTML = STEPS.map(stepHtml).join("");

  const stepEl = (step) => list.querySelector(`[data-step="${step.id}"]`);

  // ---- Behaviour ----------------------------------------------------------------------------

  // One step open at a time keeps the path easy to follow. Open and close animate in CSS.
  function setOpen(step, open) {
    STEPS.forEach((other) => {
      const el = stepEl(other);
      const isOpen = other === step && open;
      el.classList.toggle("is-open", isOpen);
      el.querySelector("[data-toggle]").setAttribute("aria-expanded", String(isOpen));
      setToggleLabel(el.querySelector("[data-toggle]"), isOpen ? "Hide the content" : "Discover the content");
    });
  }

  function expandTiming() {
    const styles = getComputedStyle(document.documentElement);
    return { duration: parseFloat(styles.getPropertyValue("--motion-duration-expand")) || 700, easing: styles.getPropertyValue("--motion-ease-expand").trim() || "ease-in-out" };
  }

  // Keep the clicked element still on screen while things around it animate, so everything opens
  // downwards. Stops as soon as the reader scrolls themselves.
  let stopHolding = null;
  function holdInPlace(target) {
    if (stopHolding) stopHolding();
    const top = target.getBoundingClientRect().top;
    const end = performance.now() + expandTiming().duration + 100;
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      ["wheel", "touchmove", "keydown"].forEach((type) => window.removeEventListener(type, stop));
      stopHolding = null;
    };
    const tick = () => {
      const shift = target.getBoundingClientRect().top - top;
      if (Math.abs(shift) > 0.5) window.scrollBy(0, shift);
      if (performance.now() < end) frame = requestAnimationFrame(tick); else stop();
    };
    ["wheel", "touchmove", "keydown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
    stopHolding = stop;
    frame = requestAnimationFrame(tick);
  }

  // The toggle's width follows its label; animate it so the start button beside it glides instead of jumping.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const stacked = matchMedia("(max-width: 1099px)");   /* previews open under their rows */
  function setToggleLabel(toggle, text) {
    const label = toggle.querySelector("[data-toggle-label]");
    if (label.textContent === text) return;
    const from = toggle.getBoundingClientRect().width;
    label.textContent = text;
    const to = toggle.getBoundingClientRect().width;
    if (reducedMotion.matches || from === to) return;
    const timing = expandTiming();
    toggle.animate([{ width: `${from}px` }, { width: `${to}px` }], timing);
    label.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: timing.duration * 0.6 });
  }

  // The topic whose preview is showing in each step (null: none, possible on narrow screens only).
  const selected = {};
  function selectTopic(step, topic) {
    selected[step.id] = topic;
    stepEl(step).querySelectorAll(".topic").forEach((el) => {
      const isSelected = Boolean(topic) && el.dataset.topic === topic.id;
      el.classList.toggle("is-selected", isSelected);
      el.querySelector(".topic__row").setAttribute("aria-expanded", String(isSelected));
    });
  }

  // Something above the clicked element closing would shrink for the whole animation while the page
  // scrolls back, which reads as several motions at once. Close it instantly instead, keeping the clicked
  // element still, so only the newly opened part animates.
  function closeAboveInstantly(closing, clicked, change) {
    const top = clicked.getBoundingClientRect().top;
    closing.classList.add("is-closing-instantly");
    change();
    window.scrollBy(0, clicked.getBoundingClientRect().top - top);
    requestAnimationFrame(() => closing.classList.remove("is-closing-instantly"));
  }

  STEPS.forEach((step, index) => {
    const el = stepEl(step);

    el.querySelector("[data-toggle]").addEventListener("click", () => {
      const open = !el.classList.contains("is-open");
      const change = () => {
        setOpen(step, open);
        if (open) selectTopic(step, selected[step.id] || step.topics[0]);
      };
      const openAbove = STEPS.slice(0, index).map(stepEl).find((other) => other.classList.contains("is-open"));
      if (open && openAbove) closeAboveInstantly(openAbove, el, change);
      else {
        holdInPlace(el);
        change();
      }
    });

    step.topics.forEach((topic, topicIndex) => {
      const topicEl = el.querySelector(`[data-topic="${topic.id}"]`);
      const row = topicEl.querySelector(".topic__row");
      row.addEventListener("click", () => {
        const previous = selected[step.id];
        if (previous === topic) {
          // Narrow screens: tapping the open topic closes it. Desktop always shows one preview.
          if (stacked.matches) selectTopic(step, null);
          return;
        }
        if (previous && stacked.matches && step.topics.indexOf(previous) < topicIndex) {
          closeAboveInstantly(el.querySelector(`[data-topic="${previous.id}"]`), row, () => selectTopic(step, topic));
          return;
        }
        holdInPlace(row);
        selectTopic(step, topic);
      });
    });
  });

  // Back on desktop width, an open step always shows a preview.
  stacked.addEventListener("change", () => {
    if (stacked.matches) return;
    STEPS.forEach((step) => {
      if (stepEl(step).classList.contains("is-open") && !selected[step.id]) selectTopic(step, step.topics[0]);
    });
  });
})();
