// Smooth scrolling for mouse wheels and trackpads: the page eases towards where the wheel asked to go.
// Touch screens keep the phone's own scrolling: it runs apart from the page, so script can't match it, and
// a touch listener here would slow every swipe. Off for anyone who asked for reduced motion. Lists that
// scroll by themselves and open menus or dialogs are left alone. Keyboard and scrollbar use stops a glide.
// Loaded last, so a page's own wheel handling (js/about.js) goes first.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const WHEEL_SPEED = 6;    // how quickly the page catches up, per second: lower is slower
  const SETTLE = 0.5;       // px from the target that counts as arrived
  const DRIFT = 3;          // px off our own position that means something else moved the page
  const LINE = 16;          // px per wheel line

  const root = document.documentElement;
  let target = 0;
  let position = 0;
  let raf = null;
  let last = 0;

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
    const next = position + (target - position) * (1 - Math.exp(-WHEEL_SPEED * dt));
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
    target = clamp(target + delta);
    glide();
  }, { passive: false });

  ["keydown", "mousedown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
})();
