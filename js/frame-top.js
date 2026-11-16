// A page that opens inside another page (an embedded preview) starts at its top. The outer page keeps its
// own scroll position between pages, so without this a new page could open part-way down. Loaded in the
// <head> so it runs before anything is drawn: no jump. Going back and links to a #section keep their position.
(() => {
  if (window.top === window || location.hash) return;
  const nav = performance.getEntriesByType("navigation")[0];
  if (nav && nav.type === "back_forward") return;
  const toTop = () => {
    try {
      document.documentElement.scrollIntoView({ block: "start", behavior: "instant" });
    } catch (error) {
      // a host page may not allow it: the page itself still opens at its top
    }
  };
  toTop();
  document.addEventListener("DOMContentLoaded", toTop, { once: true });
})();
