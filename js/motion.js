// Motion (css/motion.css): reveals items marked data-reveal as they reach the screen, once each.
// Load it in <head> without defer, so content is hidden before the first paint and never flashes.
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("motion-ready");

  const MAX_STEPS = 4;

  function setup() {
    const items = document.querySelectorAll("[data-reveal]");
    document.querySelectorAll("[data-reveal-group]").forEach((group) => {
      group.querySelectorAll("[data-reveal]").forEach((item, i) => {
        item.style.setProperty("--reveal-i", Math.min(i, MAX_STEPS - 1));
      });
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px" });

    items.forEach((item) => observer.observe(item));

    // Printing or "find in page" should never meet hidden text
    window.addEventListener("beforeprint", () => items.forEach((item) => item.classList.add("is-revealed")));
  }

  // Scroll fill (data-scroll-fill): the words start faint and fill in, one after another, as the page
  // scrolls. One way only: once filled, a word stays filled, so scrolling back up changes nothing.
  // Hold (data-fill-hold on a parent): that block stops in the middle of the screen while its text fills,
  // and the page moves on once the fill is done, so the text can be read where it is. Once filled and
  // scrolled past, the hold is gone for this visit: scrolling back up meets an ordinary section. The fill follows
  // the scroll at its own calm pace, so a quick scroll still fills the words one after another.
  const FAINT = 0.2;      // a word's opacity before it fills
  const EDGE = 10;        // how many words are part-filled at once: a soft front, not a hard line
  const CATCH_UP = 3.5;   // how quickly the fill closes the gap to the scroll, per second
  const MIN_TIME = 1.6;   // seconds, the least the whole paragraph takes to fill, however fast the scroll
  const HOLD = 0.9;       // scroll held for the fill, in screen heights
  const DONE_AT = 0.8;    // the fill completes at this share of the hold; the rest shows the full text

  function setupFill(block) {
    const words = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach((text) => {
      const parts = text.textContent.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { fragment.append(part); return; }
        const word = document.createElement("span");
        word.className = "fill-word";
        word.textContent = part;
        words.push(word);
        fragment.append(word);
      });
      text.replaceWith(fragment);
    });
    block.classList.add("is-filling");

    // The held block, and a spacer after it that gives the scroll to hold it for
    const held = block.closest("[data-fill-hold]");
    const space = held ? document.createElement("div") : null;
    if (held) {
      space.className = "fill-hold__space";
      space.setAttribute("aria-hidden", "true");
      held.after(space);
    }
    let holdTop = 0;     // where the held block stops, from the top of the screen
    let holdLength = 0;  // how much scroll it is held for (0: not held)

    function layout() {
      if (!held) return;
      const vh = window.innerHeight;
      const height = held.offsetHeight;
      // Too tall to sit in the screen with room around it: no hold, the text fills as it passes
      const fits = height < vh * 0.86;
      holdLength = fits ? Math.round(vh * HOLD) : 0;
      holdTop = fits ? Math.max(16, Math.round((vh - height) / 2)) : 0;
      held.classList.toggle("is-held", fits);
      held.style.setProperty("--hold-top", `${holdTop}px`);
      space.style.height = `${holdLength}px`;
    }

    const total = words.length + EDGE;
    let target = 0;     // how far the scroll has asked the fill to go (never goes back)
    let shown = 0;      // how far the fill has got
    let frame = null;
    let last = 0;

    function draw() {
      words.forEach((word, i) => {
        const fill = Math.min(1, Math.max(0, (shown - i) / EDGE));
        word.style.opacity = (FAINT + (1 - FAINT) * fill).toFixed(3);
      });
    }

    function measure() {
      const vh = window.innerHeight;
      let progress;
      if (holdLength) {
        // From the block's top passing 90% down the screen, through the block arriving in the middle,
        // to DONE_AT of the hold. The space after the block keeps moving while the block is held.
        const arrived = space.getBoundingClientRect().top - held.offsetHeight;   // the block's top, unheld
        const travelled = vh * 0.9 - arrived;
        progress = travelled / (vh * 0.9 - holdTop + holdLength * DONE_AT);
      } else {
        const rect = block.getBoundingClientRect();
        progress = (vh * 0.9 - rect.top) / (rect.height + vh * 0.55);
      }
      target = Math.max(target, Math.min(1, Math.max(0, progress)) * total);
    }

    function step(now) {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      const gap = target - shown;
      shown += Math.min(gap * (1 - Math.exp(-CATCH_UP * dt)) + 0.4 * dt, gap, (total / MIN_TIME) * dt);
      draw();
      if (target - shown > 0.01) frame = requestAnimationFrame(step);
      else { shown = target; draw(); frame = null; last = 0; if (shown >= total) request(); }
    }

    // Filled and scrolled past: take the hold away while the page is still, so nothing jumps. The space it
    // used sits above the screen, so the page is moved up by exactly what was removed.
    let released = false;
    let idle = null;
    function release() {
      idle = null;
      if (released || !holdLength || shown < total || held.getBoundingClientRect().bottom > 0) return;
      released = true;
      const anchor = space.nextElementSibling || held.parentElement.nextElementSibling;
      const before = anchor ? anchor.getBoundingClientRect().top : 0;
      held.classList.remove("is-held");
      space.remove();
      holdLength = 0;
      if (anchor) window.scrollBy({ top: anchor.getBoundingClientRect().top - before, behavior: "instant" });
    }

    function request() {
      if (released) return;
      measure();
      if (!frame && target > shown) frame = requestAnimationFrame(step);
      clearTimeout(idle);
      if (holdLength && target >= total) idle = setTimeout(release, 200);
    }
    window.addEventListener("scroll", request, { passive: true });
    // Phones fire resize when the address bar hides: only a real width change lays the hold out again
    let width = window.innerWidth;
    window.addEventListener("resize", () => {
      if (released) return;
      if (window.innerWidth !== width) { width = window.innerWidth; layout(); }
      request();
    });
    layout();
    draw();
    request();
  }

  function setupFills() {
    document.querySelectorAll("[data-scroll-fill]").forEach(setupFill);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup);
    document.addEventListener("DOMContentLoaded", setupFills);
  } else {
    setup();
    setupFills();
  }
})();
