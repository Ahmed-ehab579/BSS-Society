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
  // paragraph moves up the screen; scrolling back empties them again.
  const FAINT = 0.2;   // a word's opacity before it fills
  const EDGE = 8;      // how many words are part-filled at once: a soft front, not a hard line

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

    let frame = null;
    function paint() {
      frame = null;
      const rect = block.getBoundingClientRect();
      const vh = window.innerHeight;
      // Starts as the paragraph's top passes 85% down the screen, done as its bottom reaches the middle
      const progress = Math.min(1, Math.max(0, (vh * 0.85 - rect.top) / (rect.height + vh * 0.35)));
      const front = progress * (words.length + EDGE);
      words.forEach((word, i) => {
        const fill = Math.min(1, Math.max(0, (front - i) / EDGE));
        word.style.opacity = (FAINT + (1 - FAINT) * fill).toFixed(3);
      });
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    paint();
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
