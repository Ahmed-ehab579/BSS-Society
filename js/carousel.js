// Library carousel: slow seamless autoplay, arrows, pause/play and swipe.
// The slide set is cloned once so the row loops without a visible reset;
// clones are hidden from screen readers and keyboard focus.
(function () {
  const root = document.querySelector("[data-carousel]");
  if (!root) return;

  const viewport = root.querySelector(".carousel__viewport");
  const track = root.querySelector(".carousel__track");
  const prevBtn = root.querySelector("[data-carousel-prev]");
  const nextBtn = root.querySelector("[data-carousel-next]");
  const toggleBtn = root.querySelector("[data-carousel-toggle]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const SPEED = 24;           // autoplay, px per second
  const STEP_DURATION = 600;  // arrow / snap transition, ms
  const DRAG_THRESHOLD = 6;   // px before a pointer move counts as a swipe

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

  // offset grows without bound; render() wraps it into one set width.
  let offset = 0;
  let step = 0;
  let setWidth = 0;
  let userPaused = reduceMotion.matches; // pause button, arrows, swipe, keyboard focus
  let hoverPaused = false;
  let inView = true;
  let anim = null;
  let drag = null;
  let raf = null;
  let lastTime = null;

  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function measure() {
    const oldStep = step;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    step = slides[0].getBoundingClientRect().width + gap;
    setWidth = step * slides.length;
    if (oldStep) offset = (offset / oldStep) * step;
    if (anim) anim = null;
    render();
  }

  function render() {
    const x = ((offset % setWidth) + setWidth) % setWidth;
    track.style.transform = `translate3d(${-x}px, 0, 0)`;
  }

  function isAutoplaying() {
    return !userPaused && !hoverPaused && inView && !document.hidden;
  }

  function frame(now) {
    const dt = lastTime === null ? 0 : Math.min(now - lastTime, 100) / 1000;
    lastTime = now;

    if (anim) {
      const t = anim.duration ? Math.min(1, (now - anim.start) / anim.duration) : 1;
      offset = anim.from + (anim.to - anim.from) * easeOut(t);
      if (t === 1) anim = null;
    } else if (!drag && isAutoplaying()) {
      offset += SPEED * dt;
    }
    render();

    if (anim || (!drag && isAutoplaying())) {
      raf = requestAnimationFrame(frame);
    } else {
      raf = null;
      lastTime = null;
    }
  }

  function kick() {
    if (raf === null) raf = requestAnimationFrame(frame);
  }

  function animateTo(target) {
    anim = {
      from: offset,
      to: target,
      start: performance.now(),
      duration: reduceMotion.matches ? 0 : STEP_DURATION,
    };
    kick();
  }

  function setPaused(paused) {
    userPaused = paused;
    toggleBtn.dataset.state = paused ? "paused" : "playing";
    toggleBtn.setAttribute("aria-label", paused ? "Play carousel" : "Pause carousel");
    kick();
  }

  function move(dir) {
    setPaused(true);
    const base = anim ? anim.to : offset;
    const index = dir > 0 ? Math.floor(base / step + 0.001) + 1 : Math.ceil(base / step - 0.001) - 1;
    animateTo(index * step);
  }

  prevBtn.addEventListener("click", () => move(-1));
  nextBtn.addEventListener("click", () => move(1));
  toggleBtn.addEventListener("click", () => setPaused(!userPaused));

  // Desktop hover: temporary pause only.
  root.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") hoverPaused = true;
  });
  root.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") {
      hoverPaused = false;
      kick();
    }
  });

  // Keyboard focus entering the carousel pauses until Play is pressed.
  root.addEventListener("focusin", (e) => {
    if (root.contains(e.relatedTarget)) return;
    if (e.target.matches(":focus-visible")) setPaused(true);
  });

  // Swipe / drag: pauses autoplay until Play is pressed, then snaps to a card.
  viewport.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
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
      setPaused(true);
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
      const moved = offset - drag.start;
      const threshold = step * 0.15;
      let index = offset / step;
      if (moved > threshold) index = Math.ceil(index);
      else if (moved < -threshold) index = Math.floor(index);
      else index = Math.round(index);
      root.classList.remove("is-dragging");
      drag = null;
      animateTo(index * step);
    } else {
      drag = null;
    }
  }

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  // Only animate while visible.
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    kick();
  }).observe(root);

  document.addEventListener("visibilitychange", kick);

  reduceMotion.addEventListener("change", (e) => {
    if (e.matches) setPaused(true);
  });

  new ResizeObserver(measure).observe(viewport);

  measure();
  setPaused(userPaused);
})();
