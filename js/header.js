// Site header: hide on scroll down, reveal on scroll up or when scrolling stops.
// Mobile menu toggle with backdrop.
(function () {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const toggle = header.querySelector(".menu-toggle");
  const nav = header.querySelector(".site-nav");
  const backdrop = document.querySelector(".menu-backdrop");
  const menuQuery = window.matchMedia("(max-width: 899px)");
  const STOP_DELAY = 250;
  const SCROLL_THRESHOLD = 4;

  let lastY = window.scrollY;
  let stopTimer;

  function isMenuOpen() {
    return header.classList.contains("is-menu-open");
  }

  function onScroll() {
    const y = window.scrollY;
    const delta = y - lastY;

    if (!isMenuOpen() && Math.abs(delta) >= SCROLL_THRESHOLD) {
      header.classList.toggle("is-hidden", delta > 0 && y > header.offsetHeight);
    }
    if (Math.abs(delta) >= SCROLL_THRESHOLD) lastY = y;

    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => header.classList.remove("is-hidden"), STOP_DELAY);
  }

  function setMenu(open) {
    header.classList.toggle("is-menu-open", open);
    document.documentElement.classList.toggle("is-menu-open", open);
    backdrop.classList.toggle("is-visible", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // Closed dropdown links must not be reachable by keyboard.
    nav.inert = menuQuery.matches && !open;
    if (open) header.classList.remove("is-hidden");
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  toggle.addEventListener("click", () => setMenu(!isMenuOpen()));

  backdrop.addEventListener("click", () => setMenu(false));

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenu(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen()) {
      setMenu(false);
      toggle.focus();
    }
  });

  menuQuery.addEventListener("change", () => setMenu(false));

  setMenu(false);
})();
