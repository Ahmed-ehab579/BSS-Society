// Smooth scrolling on every device: the page glides and slows to a stop instead of moving in steps.
// Mouse wheels and trackpads ease towards where the wheel asked to go. On touch screens the page follows
// the finger exactly, then carries on from the finger's speed when it lifts, so it never feels detached.
// Off for anyone who asked for reduced motion. Sideways swipes, lists that scroll by themselves, pull to
// refresh and open menus or dialogs are left to the browser. Keyboard and scrollbar use stops a glide.
// Loaded last, so a page's own wheel and touch handling (js/about.js) goes first.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const WHEEL_SPEED = 6;    // how quickly the page catches up, per second: lower is slower
  const TOUCH_SPEED = 2.4;  // the same after a swipe, so the page coasts for longer
  const SETTLE = 0.5;       // px from the target that counts as arrived
  const DRIFT = 3;          // px off our own position that means something else moved the page
  const LINE = 16;          // px per wheel line
  const DRAG_START = 4;     // px before a touch counts as a scroll
  const STILL = 90;         // ms without movement before lifting: the finger had stopped
  const FLING_MIN = 0.05;   // px per ms below which a lifted finger just stops

  const root = document.documentElement;
  let target = 0;
  let position = 0;
  let speed = WHEEL_SPEED;
  let raf = null;
  let last = 0;
  let touch = null;

  const maxScroll = () => root.scrollHeight - window.innerHeight;
  const clamp = (value) => Math.max(0, Math.min(maxScroll(), value));
  const pageIsLocked = () => root.classList.contains("is-sheet-open") ||
    root.classList.contains("is-menu-open") || document.querySelector("dialog:modal") !== null;

  function wheelPixels(event) {
    if (event.deltaMode === 1) return event.deltaY * LINE;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  // A list, menu or panel that can still scroll this way keeps the gesture for itself
  function scrollsInside(element, delta) {
    for (let node = element; node && node !== document.body && node !== root; node = node.parentElement) {
      if (node.scrollHeight <= node.clientHeight) continue;
      if (!/(auto|scroll)/.test(getComputedStyle(node).overflowY)) continue;
      if (delta > 0 ? node.scrollTop + node.clientHeight < node.scrollHeight - 1 : node.scrollTop > 0) return true;
    }
    return false;
  }

  function stop() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
  }

  function moveTo(y) {
    position = y;
    window.scrollTo({ top: y, behavior: "instant" });
  }

  function tick(now) {
    if (Math.abs(window.scrollY - position) > DRIFT) {
      raf = null;
      return;
    }
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    const next = position + (target - position) * (1 - Math.exp(-speed * dt));
    moveTo(Math.abs(target - next) < SETTLE ? target : next);
    raf = position === target ? null : requestAnimationFrame(tick);
  }

  function glide() {
    if (raf !== null) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  window.addEventListener("wheel", (event) => {
    if (!finePointer.matches || reduceMotion.matches) return;
    if (event.defaultPrevented || event.ctrlKey || !event.deltaY) return;   // ctrl + wheel is browser zoom
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || pageIsLocked()) return;
    const delta = wheelPixels(event);
    if (scrollsInside(event.target, delta)) return;
    event.preventDefault();
    if (raf === null) {
      position = window.scrollY;
      target = position;
    }
    speed = WHEEL_SPEED;
    target = clamp(target + delta);
    glide();
  }, { passive: false });

  window.addEventListener("touchstart", (event) => {
    stop();   // a finger on the screen catches a coasting page
    touch = null;
    if (event.touches.length !== 1 || reduceMotion.matches || pageIsLocked()) return;
    const { clientX: x, clientY: y } = event.touches[0];
    touch = { x, y, lastY: y, lastTime: event.timeStamp, start: window.scrollY, velocity: 0, scrolling: false };
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (!touch) return;
    if (event.touches.length !== 1 || event.defaultPrevented) {
      touch = null;
      return;
    }
    const { clientX: x, clientY: y } = event.touches[0];
    const dx = x - touch.x;
    const dy = y - touch.y;
    if (!touch.scrolling) {
      if (Math.abs(dx) < DRAG_START && Math.abs(dy) < DRAG_START) return;
      // Sideways (card rows), inner lists and pull to refresh at the top stay with the browser
      if (Math.abs(dx) > Math.abs(dy) || scrollsInside(event.target, -dy) ||
        (dy > 0 && window.scrollY <= 0) || !event.cancelable) {
        touch = null;
        return;
      }
      touch.scrolling = true;
      touch.start = window.scrollY + dy;   // no jump from the distance already moved
    }
    event.preventDefault();
    const elapsed = event.timeStamp - touch.lastTime;
    if (elapsed > 0) {
      touch.velocity = touch.velocity * 0.7 + ((touch.lastY - y) / elapsed) * 0.3;   // px per ms, smoothed
      touch.lastY = y;
      touch.lastTime = event.timeStamp;
    }
    moveTo(clamp(touch.start - dy));
  }, { passive: false });

  function endTouch(event) {
    const ended = touch;
    touch = null;
    if (!ended || !ended.scrolling) return;
    const velocity = event.timeStamp - ended.lastTime > STILL ? 0 : ended.velocity;
    if (Math.abs(velocity) < FLING_MIN) return;
    speed = TOUCH_SPEED;
    target = clamp(position + (velocity * 1000) / TOUCH_SPEED);   // starts at the finger's own speed
    glide();
  }

  window.addEventListener("touchend", endTouch, { passive: true });
  window.addEventListener("touchcancel", () => { touch = null; }, { passive: true });

  ["keydown", "mousedown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
})();
