// Smooth scrolling for mouse wheels and trackpads: the page glides to where the wheel asked it to go.
// Touch screens already have the phone's own momentum, so they are left alone, as is anyone who asked
// for reduced motion. Anything else that scrolls (keyboard, scrollbar, in-page links) stops the glide
// and takes over. Loaded last, so a page's own wheel handling (js/about.js) goes first.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const SPEED = 9;       // how quickly the page catches up, per second: higher is snappier
  const SETTLE = 0.5;    // px from the target that counts as arrived
  const DRIFT = 3;       // px off our own position that means something else moved the page

  const root = document.documentElement;
  let target = 0;
  let position = 0;
  let raf = null;
  let last = 0;

  const maxScroll = () => root.scrollHeight - window.innerHeight;
  const lineHeight = 16;

  function pixels(event) {
    if (event.deltaMode === 1) return event.deltaY * lineHeight;
    if (event.deltaMode === 2) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  // A list, menu or panel that can still scroll this way keeps the wheel for itself
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

  function tick(now) {
    if (Math.abs(window.scrollY - position) > DRIFT) {
      raf = null;
      return;
    }
    const dt = Math.min(now - last, 50) / 1000;
    last = now;
    position += (target - position) * (1 - Math.exp(-SPEED * dt));
    if (Math.abs(target - position) < SETTLE) position = target;
    window.scrollTo({ top: position, behavior: "instant" });
    raf = position === target ? null : requestAnimationFrame(tick);
  }

  window.addEventListener("wheel", (event) => {
    if (!finePointer.matches || reduceMotion.matches) return;
    if (event.defaultPrevented || event.ctrlKey || !event.deltaY) return;   // ctrl + wheel is browser zoom
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    if (root.classList.contains("is-sheet-open") || root.classList.contains("is-menu-open")) return;
    const delta = pixels(event);
    if (scrollsInside(event.target, delta)) return;
    event.preventDefault();
    if (raf === null) {
      position = window.scrollY;
      target = position;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }
    target = Math.max(0, Math.min(maxScroll(), target + delta));
  }, { passive: false });

  ["keydown", "mousedown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
})();
