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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup);
  else setup();
})();
