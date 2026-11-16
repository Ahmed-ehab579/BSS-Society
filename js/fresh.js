// Always show the latest version of a page. A browser (or the preview host) can hand back a stored copy of
// the page on the first visit, with its old styles and scripts; only a refresh then shows the latest edits.
// Once the page is drawn, ask the server for the page again; if its styles or scripts changed, reload once.
(() => {
  const GUARD = "bss.fresh.reloaded";
  const assets = (doc) => [...doc.querySelectorAll('link[rel="stylesheet"][href^="css/"], script[src^="js/"]')]
    .map((el) => el.getAttribute("href") || el.getAttribute("src")).join("|");

  function check() {
    if (!window.fetch || !window.DOMParser) return;
    fetch(location.href, { cache: "reload", credentials: "same-origin" })
      .then((response) => (response.ok ? response.text() : null))
      .then((html) => {
        if (!html) return;
        const latest = assets(new DOMParser().parseFromString(html, "text/html"));
        let reloaded = null;
        try { reloaded = sessionStorage.getItem(GUARD); } catch (error) { /* storage blocked */ }
        if (latest && latest !== assets(document) && reloaded !== latest) {
          try { sessionStorage.setItem(GUARD, latest); } catch (error) { return; }   // no guard: never risk a loop
          location.reload();
        }
      })
      .catch(() => { /* offline or blocked: keep the page as it is */ });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", check, { once: true });
  else check();
  // Restored from the browser's back/forward memory: check again
  window.addEventListener("pageshow", (event) => { if (event.persisted) check(); });
})();
