// Article page: reading progress bar, saved reading progress, completion and next-topic unlock.
(function () {
  const P = window.BSSProgress;
  const bar = document.querySelector(".reading-progress");
  const article = document.querySelector(".article");
  const sections = document.querySelectorAll(".article-section");
  if (!bar || !article || !sections.length) return;

  // Which topic is this? article.html?topic=N (1-6), defaulting to the first.
  const params = new URLSearchParams(window.location.search);
  const requested = Number(params.get("topic"));

  // Opened from a Library card or a New Muslim step: the article is read as a standalone resource.
  // The way back, the breadcrumb and the label follow where the reader came from, and the Start here
  // parts (progress, "Mark as read", previous/next topic) are left out, so the path stays untouched
  const from = params.get("from");
  const fromLibrary = from === "library" || from === "new-muslim";
  if (fromLibrary) {
    const step = Math.max(1, Number(params.get("step")) || 1);
    const item = Math.max(1, Number(params.get("item")) || 1);
    const back = from === "library"
      ? { href: "library.html", text: "Back to the library", parent: "Library", parentHref: "library.html", current: "Article" }
      : { href: `new-muslim-step.html?step=${step}&topic=${item}`, text: `Back to step ${step}`, parent: "New Muslim", parentHref: "new-muslim.html", current: `Step 0${step}` };
    const link = document.querySelector(".article-back");
    link.href = back.href;
    link.querySelector("span").textContent = back.text;
    const crumb = document.querySelector(".article-crumbs__parent");
    crumb.href = back.parentHref;
    crumb.textContent = back.parent;
    document.querySelector("[data-topic-label]").textContent = back.current;
    document.body.classList.add("is-standalone-article");
  }
  const topicId = P && P.topic(requested) ? requested : 1;

  const label = document.querySelector("[data-topic-label]");
  if (label && !fromLibrary) label.textContent = `Topic 0${topicId}`;

  // Save this article (js/saved-menu.js): it belongs to the Start here path wherever it was opened from
  const saveButton = document.querySelector("[data-save]");
  if (saveButton && window.BSS?.saveButton) {
    window.BSS.saveButton(saveButton, () => ({
      key: `article-${topicId}`, path: "start-here", type: "article", label: `Topic 0${topicId}`,
      title: document.querySelector(".article-hero__title").textContent.trim(),
      image: document.querySelector(".article-hero__image").getAttribute("src"),
      url: `article.html?topic=${topicId}`,
    }));
  }

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

  // A locked topic has to be unlocked from the path first ("Unlock this article anyway"). Checked before
  // anything starts listening, so nothing runs on a page that is about to leave.
  if (P && !P.info(topicId).unlocked) {
    window.location.replace("start-here.html");
    return;
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  new ResizeObserver(request).observe(document.body);

  if (!P) { update(); return; }

  if (!fromLibrary) P.start(topicId);   // opened = in progress; only finishing completes it

  /* ---- Saved reading progress: "in progress" once the reader is past the first stretch ---- */
  let savedStep = 0;
  function saveProgress() {
    const step = Math.floor((scrolled * 100) / 5) * 5;    // write in 5% steps, not on every scroll event
    if (step > savedStep && !fromLibrary) {
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
    document.dispatchEvent(new CustomEvent("bss:topic-complete", { detail: { topicId } }));   // the check-in below
  });
  undoButton.addEventListener("click", () => {
    P.markUnread(topicId);   // topics that depended on this one lock again (unless started or opened on purpose)
    evaluate();
    doneButton.focus();
    document.dispatchEvent(new CustomEvent("bss:topic-unread", { detail: { topicId } }));
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
    nextKicker.textContent = unlocked ? `Up next • Topic 0${nextTopic.id}` : completed ? "Finish the earlier topics to unlock" : "Complete this topic to unlock";
    next.classList.toggle("is-disabled", !unlocked);
    next.classList.toggle("is-recommended", unlocked && completed);
    next.dataset.tip = completed ? "Finish the earlier topics first" : "Mark this topic as read to unlock the next one";
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

// Article audio: play / pause, position (click, drag or arrow keys), time and speed
(function () {
  const box = document.querySelector("[data-audio-player]");
  if (!box) return;
  const audio = box.querySelector("[data-audio]");
  const play = box.querySelector("[data-audio-play]");
  const icon = play.querySelector("img");
  const bar = box.querySelector("[data-audio-bar]");
  const fill = bar.firstElementChild;
  const thumb = bar.querySelector(".audio-player__thumb");
  const time = box.querySelector("[data-audio-time]");
  const total = box.querySelector("[data-audio-total]");
  const length = box.querySelector("[data-audio-length]");
  const speed = box.querySelector("[data-audio-speed]");
  const SPEEDS = [1, 1.25, 1.5, 2];
  const STEP = 5;   // seconds an arrow key moves

  const clock = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  function show() {
    const share = audio.duration ? audio.currentTime / audio.duration : 0;
    fill.style.width = `${share * 100}%`;
    thumb.style.left = `${share * 100}%`;
    bar.setAttribute("aria-valuenow", String(Math.round(share * 100)));
    bar.setAttribute("aria-valuetext", clock(audio.currentTime));
    time.textContent = clock(audio.currentTime);
  }

  audio.addEventListener("loadedmetadata", () => {
    length.textContent = `${Math.max(1, Math.round(audio.duration / 60))} min`;
    if (total) total.textContent = clock(audio.duration);
    show();
  });
  audio.addEventListener("timeupdate", show);
  audio.addEventListener("play", () => {
    icon.src = "assets/icons/pause-audio.svg";
    play.setAttribute("aria-label", "Pause audio");
  });
  audio.addEventListener("pause", () => {
    icon.src = "assets/icons/play-audio.svg";
    play.setAttribute("aria-label", "Play audio");
  });

  play.addEventListener("click", () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  box.querySelectorAll("[data-audio-skip]").forEach((button) => button.addEventListener("click", () => {
    if (!audio.duration) return;
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + Number(button.dataset.audioSkip)));
    show();
  }));

  speed.addEventListener("click", () => {
    const next = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length];
    audio.playbackRate = next;
    speed.textContent = next === 1 ? "1.0x" : `${next}x`;
    speed.setAttribute("aria-label", `Playback speed: ${next === 1 ? "normal" : `${next} times`}`);
  });

  const seekTo = (clientX) => {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * audio.duration;
    show();
  };
  bar.addEventListener("pointerdown", (event) => {
    bar.setPointerCapture(event.pointerId);
    seekTo(event.clientX);
  });
  bar.addEventListener("pointermove", (event) => {
    if (bar.hasPointerCapture(event.pointerId)) seekTo(event.clientX);
  });
  bar.addEventListener("keydown", (event) => {
    const by = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP }[event.key];
    if (!by || !audio.duration) return;
    event.preventDefault();
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + by));
    show();
  });
})();

// Help button: rides at the bottom of the screen, but never higher than the first section's heading
(function () {
  const rail = document.querySelector(".help-rail");
  const heading = document.querySelector(".article-section__heading");
  if (!rail || !heading) return;
  const fab = rail.querySelector(".help-fab");
  let frame = null;

  function place() {
    frame = null;
    rail.style.transform = "";
    const gap = heading.getBoundingClientRect().top - fab.getBoundingClientRect().top;
    if (gap > 0) rail.style.transform = `translateY(${gap}px)`;
  }

  const request = () => { frame ||= requestAnimationFrame(place); };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  place();
})();

// "Explore this article's resources": Library cards (not articles) in the Related materials panel,
// built by js/preview.js so a card opens the same details as in the Library
document.addEventListener("DOMContentLoaded", () => {
  const slot = document.querySelector("[data-article-related]");
  const BSS = window.BSS;
  if (!slot || !BSS || !BSS.relatedSectionHtml) return;
  const english = BSS.resourceItems().filter((item) => item.format !== "article" && item.dir !== "rtl");
  const picks = [...english.filter((item) => item.category === "belief"), ...english.filter((item) => item.category !== "belief")].slice(0, 6);
  slot.innerHTML = BSS.relatedSectionHtml(picks, { heading: "Explore this article’s resources", id: "resources-heading", level: 2 });
  BSS.startCarousel(slot.querySelector("[data-carousel]"));
});

// Locked next topic: a short tip follows the pointer to say how to unlock it (mouse only; the card's
// own text says the same for touch and screen readers)
(function () {
  const card = document.querySelector("[data-next]");
  if (!card || !window.matchMedia("(hover: hover)").matches) return;
  const tip = document.createElement("span");
  tip.className = "topic-tip";
  tip.setAttribute("aria-hidden", "true");
  document.body.append(tip);

  const move = (event) => {
    tip.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 18}px)`;
  };
  card.addEventListener("pointerenter", (event) => {
    if (!card.classList.contains("is-disabled") || event.pointerType !== "mouse") return;
    tip.textContent = card.dataset.tip;
    move(event);
    tip.classList.add("is-visible");
  });
  card.addEventListener("pointermove", (event) => {
    if (tip.classList.contains("is-visible")) move(event);
  });
  card.addEventListener("pointerleave", () => tip.classList.remove("is-visible"));
  window.addEventListener("scroll", () => tip.classList.remove("is-visible"), { passive: true });
})();

// Listen on the cover: the pill itself grows into a small player (pause, progress, time left, speed)
// while it plays, to the left on desktop and to the full width on phones, and folds back with
// "Resume" and the time left when paused.
(function () {
  const button = document.querySelector("[data-listen]");
  const reveal = document.querySelector("[data-audio-reveal]");
  const audio = document.querySelector("[data-audio]");
  if (!button || !reveal || !audio) return;
  const pill = document.querySelector("[data-hero-player]");
  const word = button.querySelector("[data-listen-word]");
  const length = button.querySelector("[data-listen-length]");
  const lengthBox = button.querySelector(".article-listen__length");
  const bar = document.querySelector("[data-hero-bar]");
  const fill = bar.querySelector("span");
  const thumb = bar.querySelector("i");
  const left = document.querySelector("[data-hero-time]");
  const speed = document.querySelector("[data-hero-speed]");
  const mainSpeed = document.querySelector("[data-audio-speed]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = window.matchMedia("(max-width: 767px)");
  const SPEEDS = [1, 1.25, 1.5, 2];

  const clock = (seconds) => {
    const s = Math.max(0, Math.round(seconds || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const minutes = () => `${Math.max(1, Math.round(audio.duration / 60))} min`;

  reveal.classList.add("is-folded");   // already folded by the inline script in article.html

  // The closed pill is as wide as its content; open, it takes the row
  function measureClosed() {
    pill.style.setProperty("--pill-closed", `${button.scrollWidth + 14}px`);
  }

  function setPillOpen(open) {
    pill.classList.toggle("is-open", open);
    bar.tabIndex = open ? 0 : -1;
    speed.tabIndex = open ? 0 : -1;
  }

  button.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  });

  function show() {
    const playing = !audio.paused && !audio.ended;
    const started = audio.currentTime > 0 && !audio.ended;
    button.classList.toggle("is-playing", playing);
    lengthBox.hidden = playing || started;   // "· 1 min" only before the first play
    if (playing) word.textContent = "Pause";
    else if (started) word.textContent = `Resume · -${clock(audio.duration - audio.currentTime)}`;
    else word.textContent = "Listen to article";
    button.setAttribute("aria-label", playing ? "Pause the article audio" : started ? "Resume the article audio" : "Listen to this article");
    setPillOpen(playing);
    if (!playing) measureClosed();
  }

  function showPosition() {
    const share = audio.duration ? audio.currentTime / audio.duration : 0;
    fill.style.width = `${share * 100}%`;
    thumb.style.left = `${share * 100}%`;
    bar.setAttribute("aria-valuenow", String(Math.round(share * 100)));
    bar.setAttribute("aria-valuetext", clock(audio.currentTime));
    if (audio.duration) left.textContent = `-${clock(audio.duration - audio.currentTime)}`;
  }

  ["play", "pause", "ended"].forEach((name) => audio.addEventListener(name, show));
  audio.addEventListener("timeupdate", showPosition);
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    showPosition();
    show();
  });
  const ready = () => {
    length.textContent = minutes();
    showPosition();
    show();
  };
  audio.addEventListener("loadedmetadata", ready);
  if (audio.readyState >= 1) ready();

  // Seek on the pill's bar: tap or drag, arrow keys
  const seekTo = (clientX) => {
    if (!audio.duration) return;
    const rect = bar.getBoundingClientRect();
    audio.currentTime = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * audio.duration;
    showPosition();
  };
  bar.addEventListener("pointerdown", (event) => {
    bar.setPointerCapture(event.pointerId);
    seekTo(event.clientX);
  });
  bar.addEventListener("pointermove", (event) => {
    if (bar.hasPointerCapture(event.pointerId)) seekTo(event.clientX);
  });
  bar.addEventListener("keydown", (event) => {
    const by = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5 }[event.key];
    if (!by || !audio.duration) return;
    event.preventDefault();
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + by));
    showPosition();
  });

  // One speed for both players
  speed.addEventListener("click", () => {
    audio.playbackRate = SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length];
  });
  audio.addEventListener("ratechange", () => {
    const rate = audio.playbackRate;
    speed.textContent = `${rate}x`;
    speed.setAttribute("aria-label", `Playback speed: ${rate === 1 ? "normal" : `${rate} times`}`);
    if (mainSpeed) {
      mainSpeed.textContent = rate === 1 ? "1.0x" : `${rate}x`;
      mainSpeed.setAttribute("aria-label", `Playback speed: ${rate === 1 ? "normal" : `${rate} times`}`);
    }
  });

  // Between phone and desktop sizes the pill's text size changes: measure it again
  phone.addEventListener("change", () => {
    measureClosed();
    show();
  });

  measureClosed();
  show();
  requestAnimationFrame(() => requestAnimationFrame(() => pill.classList.add("is-ready")));
})();

// Ask about this article: the help button opens a panel beside the article (desktop) or a bottom
// sheet (phones). The section being read is attached to the question, and can be removed.
(function () {
  const panel = document.querySelector("[data-help-panel]");
  const opener = document.querySelector("[data-help-open]");
  if (!panel || !opener) return;
  const scrim = document.querySelector(".help-scrim");
  const title = panel.querySelector("#help-title");
  const context = panel.querySelector("[data-help-context]");
  const contextLabel = panel.querySelector("[data-help-context-label]");
  const contextInput = panel.querySelector("[data-help-context-input]");
  const root = document.documentElement;
  const phone = window.matchMedia("(max-width: 767px)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let closeTimer = null;
  const article = document.querySelector(".article");

  // Desktop: slide the article left just enough to clear the panel, so the text stays readable
  function makeRoom() {
    if (!article) return;
    article.style.transform = "";
    if (panel.hidden || phone.matches) return;
    const clear = window.innerWidth - parseFloat(getComputedStyle(panel).right) - panel.offsetWidth - 32;   // where the panel ends up, not mid-slide
    const shift = Math.max(0, article.getBoundingClientRect().right - clear);
    article.style.transform = shift ? `translateX(${-Math.min(shift, article.getBoundingClientRect().left - 16)}px)` : "";
  }

  // The section whose heading the reader has scrolled to (none while still on the cover)
  function sectionInView() {
    const line = window.innerHeight * 0.45;
    let found = null;
    document.querySelectorAll(".article-section").forEach((section) => {
      if (section.getBoundingClientRect().top < line) found = section;
    });
    return found && found.querySelector(".article-section__heading").textContent.trim();
  }

  function open(chosen) {
    clearTimeout(closeTimer);
    const section = typeof chosen === "string" ? chosen : sectionInView();
    context.hidden = !section;
    contextLabel.textContent = section || "";
    contextInput.value = section || "";
    panel.hidden = false;
    scrim.hidden = false;
    panel.getBoundingClientRect();   // start from the closed position
    panel.classList.add("is-open");
    scrim.classList.add("is-open");
    opener.setAttribute("aria-expanded", "true");
    if (phone.matches) root.classList.add("is-sheet-open");   // the page behind the sheet stays still
    makeRoom();
    title.focus({ preventScroll: true });
  }

  function close() {
    if (panel.hidden) return;
    panel.classList.remove("is-open");
    scrim.classList.remove("is-open");
    opener.setAttribute("aria-expanded", "false");
    root.classList.remove("is-sheet-open");
    if (article) article.style.transform = "";
    closeTimer = setTimeout(() => {
      panel.hidden = true;
      scrim.hidden = true;
    }, reduceMotion.matches ? 0 : 300);
    opener.focus({ preventScroll: true });
  }

  opener.addEventListener("click", () => (panel.hidden ? open() : close()));
  window.BSSHelp = { open };   // the check-in's "Ask our team" opens it with the unclear section attached
  document.querySelectorAll("[data-help-close]").forEach((el) => el.addEventListener("click", close));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) close();
  });
  panel.querySelector("[data-help-context-remove]").addEventListener("click", () => {
    context.hidden = true;
    contextInput.value = "";
    panel.querySelector("#help-question").focus();
  });
  // Phones: drag the sheet down by its grip or title row; past 100px (or a quick flick) it closes,
  // otherwise it springs back
  const handles = [panel.querySelector(".help-panel__grip"), panel.querySelector(".help-panel__head")];
  let drag = null;
  handles.forEach((handle) => handle.addEventListener("pointerdown", (event) => {
    if (!phone.matches || event.target.closest("button") || event.button > 0) return;
    drag = { y: event.clientY, t: event.timeStamp, dy: 0, id: event.pointerId };
    handle.setPointerCapture(event.pointerId);
    panel.classList.add("is-dragging");
  }));
  handles.forEach((handle) => handle.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag.dy = Math.max(0, event.clientY - drag.y);
    panel.style.transform = `translateY(${drag.dy}px)`;
  }));
  const endDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const fast = drag.dy / Math.max(1, event.timeStamp - drag.t) > 0.5;
    const dismiss = drag.dy > 100 || (fast && drag.dy > 20);
    drag = null;
    panel.classList.remove("is-dragging");
    panel.style.transform = "";
    if (dismiss) close();
  };
  handles.forEach((handle) => {
    handle.addEventListener("pointerup", endDrag);
    handle.addEventListener("pointercancel", endDrag);
  });

  phone.addEventListener("change", () => {
    if (panel.hidden) return;
    root.classList.toggle("is-sheet-open", phone.matches);
  });
  window.addEventListener("resize", () => {
    if (!panel.hidden) makeRoom();
  });
})();

// Comprehension check: right after "Mark as read", one question ("Did everything make sense?"). "Mostly"
// or "Some parts didn't" asks which sections, with an optional note and a way to ask the team. Asked
// once per topic; marking it unread clears the answer. Not connected to a service yet, so answers are
// kept in this browser only, and the thank-you says so.
(function () {
  const box = document.querySelector("[data-checkin]");
  if (!box) return;
  const KEY = "bss.checkin.v1";
  const steps = Object.fromEntries([...box.querySelectorAll("[data-checkin-step]")].map((el) => [el.dataset.checkinStep, el]));
  const chips = box.querySelector("[data-checkin-sections]");
  const note = box.querySelector("#checkin-note");
  const error = box.querySelector("[data-checkin-error]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let topic = null;
  let answer = null;

  const read = () => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  };
  const write = (all) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) { /* private mode: nothing kept */ }
  };
  const save = (entry) => write({ ...read(), [topic]: { ...entry, at: new Date().toISOString() } });

  // One chip per section of this article
  document.querySelectorAll(".article-section__heading").forEach((heading) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "checkin__chip";
    chip.setAttribute("aria-pressed", "false");
    chip.textContent = heading.textContent.trim();
    chips.append(chip);
  });
  chips.addEventListener("click", (event) => {
    const chip = event.target.closest(".checkin__chip");
    if (!chip) return;
    chip.setAttribute("aria-pressed", String(chip.getAttribute("aria-pressed") !== "true"));
    error.hidden = true;
  });
  note.addEventListener("input", () => { error.hidden = true; });
  const picked = () => [...chips.querySelectorAll('[aria-pressed="true"]')].map((chip) => chip.textContent);

  function showStep(name) {
    Object.entries(steps).forEach(([key, el]) => { el.hidden = key !== name; });
    steps[name].querySelector(".checkin__title").focus({ preventScroll: true });
  }

  function open() {
    box.hidden = false;
    box.getBoundingClientRect();   // start folded
    box.classList.add("is-open");
    showStep("ask");
    setTimeout(() => {
      const r = box.getBoundingClientRect();
      if (r.bottom > window.innerHeight) box.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
    }, reduceMotion.matches ? 0 : 400);
  }

  function close() {
    box.classList.remove("is-open");
    setTimeout(() => { box.hidden = true; }, reduceMotion.matches ? 0 : 380);
  }

  function reset() {
    answer = null;
    note.value = "";
    error.hidden = true;
    chips.querySelectorAll(".checkin__chip").forEach((chip) => chip.setAttribute("aria-pressed", "false"));
  }

  document.addEventListener("bss:topic-complete", (event) => {
    topic = event.detail.topicId;
    if (read()[topic]) return;   // answered or skipped before
    reset();
    open();
  });

  document.addEventListener("bss:topic-unread", (event) => {
    topic = event.detail.topicId;
    const all = read();
    delete all[topic];
    write(all);
    reset();
    if (!box.hidden) close();
  });

  box.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
    answer = button.dataset.answer;
    if (answer === "clear") {
      save({ answer });
      showStep("thanks");
    } else {
      showStep("details");
    }
  }));

  steps.details.addEventListener("submit", (event) => {
    event.preventDefault();
    const sections = picked();
    if (!sections.length && !note.value.trim()) {
      error.hidden = false;
      return;
    }
    save({ answer, sections, note: note.value.trim() });
    // The answer is stored, so Send can say so before the thank-you replaces it
    const send = steps.details.querySelector('button[type="submit"]');
    const sent = window.BSSSend && send ? window.BSSSend.play(send, "Sent") : Promise.resolve();
    sent.then(() => setTimeout(() => {
      showStep("thanks");
      window.BSSSend?.reset(send);
    }, reduceMotion.matches ? 0 : 500));
  });

  box.querySelectorAll("[data-checkin-skip]").forEach((button) => button.addEventListener("click", () => {
    save({ answer: answer ? `${answer} (no details)` : "skipped" });
    close();
  }));

  box.querySelector("[data-checkin-ask]").addEventListener("click", () => {
    window.BSSHelp?.open(picked()[0]);
  });
})();
