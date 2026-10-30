// Start Here journey: renders each card from the saved progress (locked, available, in progress,
// completed), keeps the connector segments in step, and runs the cursor badges (mouse only).
(function () {
  const journey = document.querySelector(".journey");
  const P = window.BSSProgress;
  if (!journey || !P) return;

  const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const articleUrl = (id) => `article.html?topic=${id}`;

  const media = (topic, lazy) =>
    `<div class="journey-card__media"><img src="${topic.image}" width="${topic.imageSize[0]}" height="${topic.imageSize[1]}" alt="" style="object-position: ${topic.focus}"${lazy ? ' loading="lazy"' : ""}></div>`;
  const body = (topic, inner = "") =>
    `<div class="journey-card__body"><span class="journey-card__number" aria-hidden="true">0${topic.id}</span><h3 class="journey-card__title">${escape(topic.title)}</h3>${inner}</div>`;

  // Topics go in order: a locked card points at the first topic that is not completed yet (not at
  // the step just before it). "Unlock this article anyway" opens only that card: it is then active,
  // but its pin stays gray until the reader opens it (blue) or its turn comes.
  function locked(topic, target) {
    const previous = target;
    return `<div class="journey-card is-locked" tabindex="0" role="group" aria-label="Locked topic: ${escape(topic.title)}">
      ${body(topic, revealBlock(topic))}${media(topic, true)}
      <img class="journey-card__lock" src="assets/icons/lock.svg" width="36" height="42" alt="">
      <div class="journey-card__locked-panel">
        <div class="journey-card__locked-copy">
          <p class="journey-card__locked-title">This topic builds on earlier steps</p>
          <p class="journey-card__locked-text">Start with Step ${previous.id}, or explore this topic now.</p>
        </div>
        <div class="journey-card__locked-actions">
          <a class="btn btn--primary btn--regular" href="${articleUrl(previous.id)}">Go to Topic ${previous.id}</a>
          <button class="btn btn--secondary btn--small journey-card__unlock" type="button" data-unlock="${topic.id}">Unlock this article anyway</button>
        </div>
      </div>
    </div>`;
  }

  // Description block: shown on available cards, and kept (hidden) on locked and completed cards so
  // every card has the same size.
  const revealBlock = (topic) =>
    `<div class="journey-card__reveal"><div class="journey-card__reveal-inner"><p class="journey-card__text">${escape(topic.text)}</p><span class="journey-card__go" aria-hidden="true"><img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt=""></span></div></div>`;

  function available(topic) {
    const reveal = revealBlock(topic);
    const state = topic.status === "in-progress" ? " is-in-progress" : "";
    return `<a class="journey-card${state}" href="${articleUrl(topic.id)}">
      ${body(topic, reveal)}${media(topic, topic.id > 1)}
      <span class="visually-hidden">${topic.status === "in-progress" ? "Continue reading" : "Start reading"}</span>
    </a>`;
  }

  function completed(topic) {
    return `<div class="journey-card is-completed" tabindex="0" role="group" aria-label="Completed topic: ${escape(topic.title)}">
      ${body(topic, revealBlock(topic))}${media(topic, topic.id > 1)}
      <span class="journey-card__wash" aria-hidden="true"></span>
      <svg class="journey-card__done-icon" viewBox="0 0 74 73" width="74" height="73" fill="none" aria-hidden="true"><circle cx="37" cy="36.5" r="34.5" stroke="currentColor" stroke-width="5"/><path d="M22 37.5l10.5 10.5L52 26" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <div class="journey-card__done-panel">
        <p class="journey-card__done-title">You’ve finished this article</p>
        <div class="journey-card__locked-actions">
          <a class="btn btn--primary btn--regular" href="${articleUrl(topic.id)}">Read again</a>
          <button class="btn btn--secondary btn--small" type="button" data-unread="${topic.id}">Mark as Unread</button>
        </div>
      </div>
    </div>`;
  }

  const stateName = (topic) => (topic.unlocked ? "active" : "locked");

  function render(focusId) {
    const topics = P.all();
    const recommended = P.recommended();
    topics.forEach((topic) => {
      const step = journey.querySelector(`.journey__step[data-step="${topic.id}"]`);
      const slot = step && step.querySelector(".journey__slot");
      if (!slot) return;
      step.dataset.state = stateName(topic);
      step.dataset.status = topic.unlocked ? topic.status : "locked";   // a locked card never shows progress
      step.dataset.turn = topic.inSequence ? "now" : "later";
      slot.innerHTML = !topic.unlocked ? locked(topic, P.topic(recommended ? recommended.id : topic.id - 1)) : topic.status === "completed" ? completed(topic) : available(topic);

      // Pin above the card: colours come from data-status / data-turn in CSS; the card whose turn it is
      // (and that is not started) gets pulse waves. Only touched when it changes, so the animation is not restarted.
      const item = step.querySelector(".journey__item");
      const pin = item.querySelector(".journey__pin");
      const pulses = topic.unlocked && topic.inSequence && topic.status === "not-started";
      if (pulses && !pin.firstElementChild) {
        pin.innerHTML = '<span class="pin-pulse" aria-hidden="true"></span><span class="pin-pulse pin-pulse--late" aria-hidden="true"></span>';
      } else if (!pulses && pin.firstElementChild) {
        pin.innerHTML = "";
      }

      // "Start here" / "Continue" sits above the pin of the recommended card only
      let label = item.querySelector(".journey__start-label");
      if (recommended && recommended.id === topic.id) {
        if (!label) {
          label = document.createElement("p");
          label.className = "journey__start-label";
          item.prepend(label);
        }
        label.textContent = recommended.label;
      } else if (label) {
        label.remove();
      }
    });
    updateSegments();
    matchLabelBackground();
    const notice = document.querySelector("[data-storage-notice]");
    if (notice) notice.hidden = P.canSave();
    if (focusId) {
      const card = journey.querySelector(`.journey__step[data-step="${focusId}"] .journey-card`);
      if (card) card.focus({ preventScroll: true });
    }
  }

  // The label frame takes the exact colour of the panel behind it, so it never looks like a second surface.
  // The panel fades from the card colour to the page colour from top to bottom.
  function matchLabelBackground() {
    const label = journey.querySelector(".journey__start-label");
    const panel = journey.closest(".section-panel");
    if (!label || !panel) return;
    const l = label.getBoundingClientRect();
    const p = panel.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (l.top + l.height / 2 - p.top) / p.height));
    label.style.background = `color-mix(in srgb, var(--surface-cards) ${((1 - f) * 100).toFixed(1)}%, var(--color-page-bg))`;
  }

  // A dashed segment is dark only when both cards it connects are unlocked.
  const isActive = (step) => journey.querySelector(`.journey__step[data-step="${step}"]`)?.dataset.state === "active";
  function updateSegments() {
    journey.querySelectorAll(".journey__segment").forEach((segment) => {
      segment.classList.toggle("is-active", isActive(segment.dataset.from) && isActive(segment.dataset.to));
    });
  }

  journey.addEventListener("click", (event) => {
    const unlock = event.target.closest("[data-unlock]");
    if (unlock) {
      const id = Number(unlock.dataset.unlock);
      P.unlock(id);
      render(id);
      return;
    }
    const unread = event.target.closest("[data-unread]");
    if (unread) {
      const id = Number(unread.dataset.unread);
      P.markUnread(id);
      render(id);
    }
  });

  P.onChange(() => render());
  render();
  window.addEventListener("load", matchLabelBackground);
  new ResizeObserver(matchLabelBackground).observe(journey.closest(".section-panel") || journey);

  // Cursor badges (mouse only): "Start reading" over an available card, "Locked" over a locked
  // card. The locked badge hides over the card's two buttons and returns on the rest of the card.
  const readBadge = journey.querySelector('[data-badge="read"]');
  const lockedBadge = journey.querySelector('[data-badge="locked"]');
  const pointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!readBadge || !lockedBadge) return;

  const OFFSET = 6;
  let frame;
  let x = 0;
  let y = 0;

  function place() {
    frame = null;
    const move = `translate(${x + OFFSET}px, ${y + OFFSET}px)`;
    readBadge.style.transform = move;
    lockedBadge.style.transform = move;
  }

  function badgeFor(target) {
    if (!target.closest) return null;
    if (target.closest('.journey__step[data-state="active"] a.journey-card')) return readBadge;
    if (target.closest(".journey-card.is-locked") && !target.closest(".journey-card__locked-actions")) return lockedBadge;
    return null;
  }

  function hideBadges() {
    readBadge.classList.remove("is-visible");
    lockedBadge.classList.remove("is-visible");
  }

  function track(event) {
    if (event.pointerType !== "mouse" || !pointerQuery.matches) return;
    x = event.clientX;
    y = event.clientY;
    const active = badgeFor(event.target);
    [readBadge, lockedBadge].forEach((badge) => badge.classList.toggle("is-visible", badge === active));
    if (active && !frame) frame = requestAnimationFrame(place);
  }

  journey.addEventListener("pointerover", (event) => {
    track(event);
    if (badgeFor(event.target)) place();
  });
  journey.addEventListener("pointermove", track);
  journey.addEventListener("pointerleave", hideBadges);
  // Cards are re-rendered after an unlock or an unread: drop the badge straight away.
  journey.addEventListener("click", hideBadges);
})();
