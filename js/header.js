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

// Header links: every link opens a page, so the active one never changes while on a page. Also the
// smooth scroll for in-page links (offset by the fixed header through scroll-margin-top).
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navLinks = [...document.querySelectorAll(".site-nav__link")];

  const pagePath = (path) => path.replace(/index\.html$/, "");
  const isThisPage = (link) =>
    link.origin === location.origin && pagePath(link.pathname) === pagePath(location.pathname);
  // The link for this page, or for pages with no link of their own the section their markup marks
  // active (New muslim on the step pages, Start here on articles).
  const activeLink = navLinks.find(isThisPage) || navLinks.find((link) => link.classList.contains("is-active")) || null;

  navLinks.forEach((link) => link.classList.toggle("is-active", link === activeLink));
  if (activeLink && !activeLink.hasAttribute("aria-current")) activeLink.setAttribute("aria-current", "page");

  // One underline for the whole nav (desktop) that slides to the active link. Clicking a link to
  // another page slides it there first, then opens the page with the underline already in place; other
  // arrivals (back button, footer links) slide from where it was on the previous page.
  const LAST_KEY = "bss.nav.last";
  const list = document.querySelector(".site-nav__links");
  const indicator = document.createElement("span");
  indicator.className = "site-nav__indicator";
  indicator.setAttribute("aria-hidden", "true");
  if (list) list.appendChild(indicator);
  let indicatorLink = null;

  function moveIndicator(link, { instant = false } = {}) {
    if (!list) return;
    indicatorLink = link || null;
    if (instant) indicator.style.transition = "none";
    if (link) {
      const box = link.getBoundingClientRect();
      const origin = list.getBoundingClientRect();   // exact sub-pixel position inside the nav list
      indicator.style.width = `${box.width}px`;
      indicator.style.transform = `translate(${box.left - origin.left}px, ${box.bottom - origin.top + 4}px)`;
    }
    indicator.classList.toggle("is-visible", Boolean(link));
    if (instant) {
      indicator.getBoundingClientRect();   // apply the jump before transitions come back
      indicator.style.transition = "";
    }
  }

  const startLink = activeLink;
  let fromLink = null;
  try {
    const label = sessionStorage.getItem(LAST_KEY);
    fromLink = navLinks.find((link) => link.dataset.label === label) || null;
  } catch (error) { /* storage unavailable: no slide between pages */ }
  // Web fonts change the link widths: start the slide once they are in (or after a short wait)
  const fontsIn = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 400)),
  ]);
  if (fromLink && startLink && fromLink !== startLink && !reduceMotion.matches) {
    moveIndicator(fromLink, { instant: true });
    fontsIn.then(() => {
      moveIndicator(fromLink, { instant: true });
      requestAnimationFrame(() => requestAnimationFrame(() => moveIndicator(indicatorLink === fromLink ? startLink : indicatorLink)));
    });
  } else {
    moveIndicator(startLink, { instant: true });
    fontsIn.then(() => moveIndicator(indicatorLink, { instant: true }));
  }

  // Clicking a nav link to another page: slide first, then go
  const desktopNav = window.matchMedia("(min-width: 900px)");
  let leaving = false;
  navLinks.forEach((link) => link.addEventListener("click", (event) => {
    if (isThisPage(link) || event.defaultPrevented || event.button !== 0 ||
      event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    try { sessionStorage.setItem(LAST_KEY, link.dataset.label); } catch (error) { /* storage unavailable */ }
    if (!desktopNav.matches || reduceMotion.matches || link === indicatorLink) return;
    event.preventDefault();
    leaving = true;
    moveIndicator(link);
    let gone = false;
    const go = () => { if (!gone) { gone = true; window.location.href = link.href; } };
    indicator.addEventListener("transitionend", go, { once: true });
    setTimeout(go, 500);
  }));

  // Back to this page from the browser's cache: put the underline back on this page's link
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    leaving = false;
    moveIndicator(activeLink, { instant: true });
  });

  // Remember where the underline was when leaving for another page
  window.addEventListener("pagehide", () => {
    if (leaving) return;   // a nav click already stored the destination
    try {
      if (indicatorLink) sessionStorage.setItem(LAST_KEY, indicatorLink.dataset.label);
      else sessionStorage.removeItem(LAST_KEY);
    } catch (error) { /* storage unavailable */ }
  });

  window.addEventListener("resize", () => moveIndicator(indicatorLink, { instant: true }));

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !isThisPage(link) || event.defaultPrevented ||
      event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = link.hash ? document.getElementById(link.hash.slice(1)) : document.body;
    if (!target) return; // "#" placeholders and missing targets keep default behaviour

    event.preventDefault();
    const behavior = reduceMotion.matches ? "auto" : "smooth";
    if (target === document.body) window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior, block: "start" });
    history.pushState(null, "", link.hash || pagePath(location.pathname));
  });
})();
