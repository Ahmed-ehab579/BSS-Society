// Article page: reading progress bar, saved reading progress, completion and next-topic unlock.
(function () {
  const P = window.BSSProgress;
  const bar = document.querySelector(".reading-progress");
  const article = document.querySelector(".article");
  const sections = document.querySelectorAll(".article-section");
  if (!bar || !article || !sections.length) return;

  // Which topic is this? article.html?topic=N (1-6), defaulting to the first.
  const requested = Number(new URLSearchParams(window.location.search).get("topic"));
  const topicId = P && P.topic(requested) ? requested : 1;

  const label = document.querySelector("[data-topic-label]");
  if (label) label.textContent = `Topic 0${topicId}`;

  /* ---- Reading progress bar: 0% when the text reaches the top, 100% at the end of the last section ---- */
  const fill = bar.firstElementChild;
  const last = sections[sections.length - 1];
  const headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 0;
  let frame = null;
  let shown = -1;
  let scrolled = 0;     // 0..1, furthest the reader has got on this visit
  let atEnd = false;

  function update() {
    frame = null;
    const start = article.getBoundingClientRect().top + window.scrollY - headerHeight;
    const end = last.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    const range = Math.max(end - start, 1);
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / range));
    fill.style.transform = `scaleX(${progress})`;

    const percent = Math.round(progress * 100);
    if (percent !== shown) {
      shown = percent;
      bar.setAttribute("aria-valuenow", String(percent));
      bar.classList.toggle("is-complete", percent === 100);
    }
    if (progress > scrolled) scrolled = progress;
    if (percent === 100) atEnd = true;
    if (!P) return;
    saveProgress();
    evaluate();
  }

  function request() {
    if (frame === null) frame = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  new ResizeObserver(request).observe(document.body);

  if (!P) { update(); return; }

  // A locked topic has to be unlocked from the path first ("Unlock this article anyway").
  if (!P.info(topicId).unlocked) {
    window.location.replace("start-here.html");
    return;
  }

  P.start(topicId);   // opened = in progress (blue pin); only finishing completes it

  /* ---- Saved reading progress: "in progress" once the reader is past the first stretch ---- */
  let savedStep = 0;
  function saveProgress() {
    const step = Math.floor((scrolled * 100) / 5) * 5;    // write in 5% steps, not on every scroll event
    if (step > savedStep) {
      savedStep = step;
      P.setProgress(topicId, step);
    }
  }

  /* ---- Completion: end reached AND enough time spent (or the audio finished) ---- */
  const card = document.querySelector("[data-completion]");
  const text = card.querySelector("[data-completion-text]");
  const doneButton = card.querySelector("[data-complete]");
  const undoButton = card.querySelector("[data-unread]");
  const timeLabel = document.querySelector(".article-hero__time");
  const minutes = parseInt(timeLabel ? timeLabel.textContent : "", 10) || 5;
  const MIN_SECONDS = Number(card.dataset.minSeconds) || Math.round(minutes * 60 * 0.4);   // 40% of the stated reading time

  let seconds = 0;       // time with the tab visible
  let audioDone = false;
  let armed = false;     // once armed it stays armed for this visit

  setInterval(() => {
    if (document.visibilityState !== "visible") return;
    seconds += 1;
    evaluate();
  }, 1000);

  // Listening counts as reading: a finished audio track arms completion too.
  document.addEventListener("ended", (event) => {
    if (event.target instanceof HTMLAudioElement) { audioDone = true; evaluate(); }
  }, true);

  const copy = {
    reading: "Read to the end to mark this topic as read.",
    almost: "Almost there. Take a little more time with the text.",
    armed: "Nice work reaching the end. Mark it as read to unlock the next topic.",
    completed: "Marked as read. The next topic is unlocked.",
    completedWaiting: "Marked as read. Finish the earlier topics, in order, to unlock the next one.",
    lastCompleted: "Marked as read. You have reached the end of the path.",
    outOfOrder: "Finish the earlier topics first, in order, to mark this one as read.",
    saveFailed: "We couldn’t save your progress in this browser, so this will be lost when you leave the page.",
  };
  const isLast = topicId === P.TOPICS[P.TOPICS.length - 1].id;

  function evaluate() {
    const status = P.info(topicId).status;
    if (!armed && ((atEnd && seconds >= MIN_SECONDS) || audioDone)) armed = true;

    let state = "reading";
    let message = atEnd ? copy.almost : copy.reading;
    if (status === "completed") {
      state = "completed";
      const nextOpen = isLast || P.info(topicId + 1).unlocked;
      message = !P.canSave() ? copy.saveFailed : isLast ? copy.lastCompleted : nextOpen ? copy.completed : copy.completedWaiting;
    } else if (armed) {
      state = "armed";
      message = copy.armed;
      if (!P.info(topicId).unlocked) {   // read ahead: cannot be completed out of order
        state = "reading";
        message = copy.outOfOrder;
      }
    }

    card.dataset.state = state;
    if (text.textContent !== message) text.textContent = message;
    doneButton.disabled = state !== "armed";
    doneButton.hidden = state === "completed";
    undoButton.hidden = state !== "completed";
    renderNext(status === "completed");
  }

  doneButton.addEventListener("click", () => {
    P.complete(topicId);
    evaluate();
    undoButton.focus();
  });
  undoButton.addEventListener("click", () => {
    P.markUnread(topicId);   // topics that depended on this one lock again (unless started or opened on purpose)
    evaluate();
    doneButton.focus();
  });

  /* ---- Next topic card: dimmed until this topic is completed, then highlighted ---- */
  const next = document.querySelector("[data-next]");
  const nextKicker = document.querySelector("[data-next-kicker]");
  const nextTitle = document.querySelector("[data-next-title]");
  const nextTopic = P.topic(topicId + 1);

  function renderNext(completed) {
    if (!nextTopic) { next.hidden = true; return; }
    const unlocked = P.info(nextTopic.id).unlocked;
    nextTitle.textContent = nextTopic.title;
    nextKicker.textContent = unlocked ? `Next topic • Step 0${nextTopic.id}` : completed ? "Finish the earlier topics to unlock" : "Complete this topic to unlock";
    next.classList.toggle("is-disabled", !unlocked);
    next.classList.toggle("is-recommended", unlocked && completed);
    if (unlocked) {
      next.href = `article.html?topic=${nextTopic.id}`;
      next.removeAttribute("aria-disabled");
    } else {
      next.removeAttribute("href");
      next.setAttribute("aria-disabled", "true");
    }
  }

  P.onChange(evaluate);
  update();
})();
