// Moving card rows. One card leads for a few seconds while its dot fills, then the row glides on to the
// next. After one full round it comes to rest on the first card and the button offers Replay, so nothing
// moves forever. Pausing, the dots, the arrows, swiping or keyboard focus hand control to the visitor.
// The slide set is cloned once so the row loops without a visible jump; clones are hidden from screen
// readers and keyboard focus.
document.querySelectorAll("[data-carousel]").forEach((root) => {
  const viewport = root.querySelector(".carousel__viewport");
  const track = root.querySelector(".carousel__track");
  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");
  const toggleBtn = root.querySelector("[data-carousel-toggle]");
  const dotsBox = root.querySelector("[data-carousel-dots]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const WAIT = 6000;          // ms each card leads
  const GLIDE = 700;          // ms to move on to the next card
  const DRAG_THRESHOLD = 6;   // px before a pointer move counts as a swipe

  // Clones copy attributes in markup order, so slide images list loading="lazy"
  // before src; otherwise each clone starts an eager download.
  const slides = [...track.children];
  slides.forEach((slide) => {
    const clone = slide.cloneNode(true);
    clone.removeAttribute("role");
    clone.removeAttribute("aria-roledescription");
    clone.removeAttribute("aria-label");
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    track.appendChild(clone);
  });

  const dots = slides.map((slide, i) => {
    const dot = document.createElement("button");
    dot.className = "carousel__dot";
    dot.type = "button";
    dot.setAttribute("aria-label", `Go to card ${i + 1} of ${slides.length}`);
    dot.append(document.createElement("span"));
    dot.addEventListener("click", () => goTo(i));
    dotsBox.append(dot);
    return dot;
  });

  // index grows without bound; render() wraps the position into one set width.
  let index = 0;
  let offset = 0;
  let step = 0;
  let setWidth = 0;
  let state = reduceMotion.matches ? "paused" : "playing";   // playing, paused or ended
  let waited = 0;            // ms the current card has led
  let moved = 0;             // cards passed in this round
  let hoverHold = false;
  let inView = false;
  let isStatic = false;      // every card fits, so there is nothing to move
  let anim = null;
  let drag = null;
  let suppressClick = false;
  let raf = null;
  let lastTime = null;

  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const wrap = (value, size) => ((value % size) + size) % size;
  const activeDot = () => dots[wrap(index, slides.length)];

  function showDot() {
    dots.forEach((dot) => {
      if (dot === activeDot()) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
    showProgress();
  }

  function showProgress() {
    dots.forEach((dot) => {
      const value = dot === activeDot() ? waited / WAIT : 0;
      dot.firstElementChild.style.setProperty("--progress", value.toFixed(4));
    });
  }

  function measure() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    root.classList.remove("is-static");
    step = slides[0].getBoundingClientRect().width + gap;
    setWidth = step * slides.length;
    isStatic = setWidth - gap <= viewport.clientWidth;
    root.classList.toggle("is-static", isStatic);
    anim = null;
    if (isStatic) index = 0;
    offset = index * step;
    render();
    showDot();
    kick();
  }

  function render() {
    track.style.transform = `translate3d(${-wrap(offset, setWidth)}px, 0, 0)`;
  }

  function isCounting() {
    return state === "playing" && !hoverHold && inView && !document.hidden && !isStatic;
  }

  function frame(now) {
    const dt = lastTime === null ? 0 : Math.min(now - lastTime, 100);
    lastTime = now;

    if (anim) {
      const t = anim.duration ? Math.min(1, (now - anim.start) / anim.duration) : 1;
      offset = anim.from + (anim.to - anim.from) * easeInOut(t);
      if (t === 1) anim = null;
      render();
    } else if (!drag && isCounting()) {
      waited += dt;
      if (waited >= WAIT) advance();
      else showProgress();
    }

    if (anim || (!drag && isCounting())) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
      lastTime = null;
    }
  }

  function kick() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  function glideTo(target) {
    index = target;
    waited = 0;
    anim = {
      from: offset,
      to: index * step,
      start: performance.now(),
      duration: reduceMotion.matches ? 0 : GLIDE,
    };
    showDot();
    kick();
  }

  // The timer moves on; a full round rests on the first card
  function advance() {
    moved += 1;
    glideTo(index + 1);
    if (moved >= slides.length) setState("ended");
  }

  function setState(next) {
    state = next;
    toggleBtn.dataset.state = next;
    toggleBtn.setAttribute("aria-label", {
      playing: "Pause carousel",
      paused: "Play carousel",
      ended: "Replay carousel",
    }[next]);
    track.setAttribute("aria-live", next === "playing" ? "off" : "polite");
    kick();
  }

  // The visitor takes over: the row stays put until they press play
  function takeOver() {
    moved = 0;
    if (state !== "paused") setState("paused");
  }

  function move(direction) {
    takeOver();
    glideTo(Math.round((anim ? anim.to : offset) / step) + direction);
  }

  // The dots wrap forwards or backwards, whichever is shorter
  function goTo(slide) {
    takeOver();
    const size = slides.length;
    const from = Math.round((anim ? anim.to : offset) / step);
    const forward = wrap(slide - from, size);
    glideTo(from + (forward <= size / 2 ? forward : forward - size));
  }

  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  toggleBtn.addEventListener("click", () => {
    if (state === "playing") {
      setState("paused");
      return;
    }
    if (state === "ended") waited = 0;
    moved = 0;
    setState("playing");
  });

  // Desktop hover only holds the timer, so a card can be read without losing the place.
  root.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") hoverHold = true;
  });
  root.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") {
      hoverHold = false;
      kick();
    }
  });

  // Keyboard focus entering the row pauses it, except on the row's own controls.
  root.addEventListener("focusin", (e) => {
    if (root.contains(e.relatedTarget) || e.target.closest(".carousel__bar")) return;
    if (e.target.matches(":focus-visible") && state === "playing") setState("paused");
  });

  // Swipe / drag: takes over from the timer, then snaps to a card.
  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || isStatic) return;
    suppressClick = false;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: offset, active: false };
  });

  viewport.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      drag.active = true;
      drag.start = offset;
      drag.x = e.clientX;
      anim = null;
      takeOver();
      viewport.setPointerCapture(drag.id);
      root.classList.add("is-dragging");
      return;
    }
    offset = drag.start - (e.clientX - drag.x);
    render();
  });

  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.active) {
      const dragged = offset - drag.start;
      const threshold = step * 0.15;
      let target = offset / step;
      if (dragged > threshold) target = Math.ceil(target);
      else if (dragged < -threshold) target = Math.floor(target);
      else target = Math.round(target);
      root.classList.remove("is-dragging");
      drag = null;
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 400);
      glideTo(target);
    } else {
      drag = null;
    }
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  // A swipe must not also activate a card link under the pointer.
  viewport.addEventListener("click", (e) => {
    if (!suppressClick) return;
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }, true);

  // The first card's time only starts once the row is really on screen.
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    kick();
  }, { threshold: 0.4 }).observe(root);

  document.addEventListener("visibilitychange", kick);

  reduceMotion.addEventListener("change", (e) => {
    if (e.matches && state === "playing") setState("paused");
  });

  new ResizeObserver(measure).observe(viewport);

  measure();
  setState(state);
});
