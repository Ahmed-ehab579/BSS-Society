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

  // Scroll fill (data-scroll-fill): the words start faint and fill in, one after another, as the
  // paragraph moves up the screen. One way only: once filled, a word stays filled, so scrolling back up
  // changes nothing. The fill follows the scroll at its own calm pace, so a quick scroll still fills
  // the text gradually instead of all at once.
  const FAINT = 0.2;      // a word's opacity before it fills
  const EDGE = 10;        // how many words are part-filled at once: a soft front, not a hard line
  const CATCH_UP = 2.2;   // how quickly the fill closes the gap to the scroll, per second
  const MIN_TIME = 2.6;   // seconds, the least the whole paragraph takes to fill, however fast the scroll

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
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      // Starts as the paragraph's top passes 90% down the screen, done as its bottom reaches 35% from the top
      const progress = Math.min(1, Math.max(0, (vh * 0.9 - rect.top) / (rect.height + vh * 0.55)));
      target = Math.max(target, progress * total);
    }

    function step(now) {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      const gap = target - shown;
      shown += Math.min(gap * (1 - Math.exp(-CATCH_UP * dt)) + 0.4 * dt, gap, (total / MIN_TIME) * dt);
      draw();
      if (target - shown > 0.01) frame = requestAnimationFrame(step);
      else { shown = target; draw(); frame = null; last = 0; }
    }

    function request() {
      if (shown >= total) {   // fully filled: nothing more to do
        window.removeEventListener("scroll", request);
        window.removeEventListener("resize", request);
        return;
      }
      measure();
      if (!frame && target > shown) frame = requestAnimationFrame(step);
    }
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
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
