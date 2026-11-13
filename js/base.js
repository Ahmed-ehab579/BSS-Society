// Shared page behavior.
// iOS Safari only applies :active (pressed feedback) when a touch listener exists.
document.addEventListener("touchstart", () => {}, { passive: true });

// A page that opens inside another page (an embedded preview) starts at its top. The outer page keeps its
// own scroll position between pages, so without this a new page could open part-way down. Going back and
// links to a #section keep their position.
if (window.top !== window && !location.hash) {
  const nav = performance.getEntriesByType("navigation")[0];
  if (!nav || nav.type !== "back_forward") {
    window.addEventListener("load", () => {
      window.scrollTo(0, 0);
      try {
        document.documentElement.scrollIntoView({ block: "start" });
      } catch (error) {
        // a host page may not allow it: the page itself is already at its top
      }
    });
  }
}
