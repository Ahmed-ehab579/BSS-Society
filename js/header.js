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

// In-page navigation: smooth scrolling to sections (offset by the fixed header
// through scroll-margin-top) and the active header link for the current section.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const navLinks = [...document.querySelectorAll(".site-nav__link")];
  const SETTLE_DELAY = 150; // ms without scroll events before a click-scroll counts as finished

  const pagePath = (path) => path.replace(/index\.html$/, "");
  const isThisPage = (link) =>
    link.origin === location.origin && pagePath(link.pathname) === pagePath(location.pathname);
  // The link for the current page itself (Home on the homepage, Start here on its own page), or for a
  // sub-page the section link its markup marks active (New muslim on the step pages).
  const homeLink = navLinks.find((link) => !link.hash && isThisPage(link))
    || navLinks.find((link) => !link.hash && link.classList.contains("is-active"));

  // Sections in page order, each with its header link (null when it has none, e.g. Contact).
  const sections = [...document.querySelectorAll("main section[id]")].map((section) => ({
    section,
    link: navLinks.find((link) => link.hash === `#${section.id}`) || null,
  }));

  let lockedLink;
  let settleTimer;
  let frame;

  function setActive(active) {
    navLinks.forEach((link) => {
      const isActive = link === active;
      link.classList.toggle("is-active", isActive);
      if (link !== homeLink) {
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      }
    });
    moveIndicator(active);
  }

  // One underline for the whole nav (desktop) that slides to the active link. Between pages it starts
  // under the link of the page you came from, then slides to this page's link.
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
      indicator.style.width = `${link.offsetWidth}px`;
      indicator.style.transform = `translate(${link.offsetLeft}px, ${link.offsetTop + link.offsetHeight + 4}px)`;
    }
    indicator.classList.toggle("is-visible", Boolean(link));
    if (instant) {
      indicator.getBoundingClientRect();   // apply the jump before transitions come back
      indicator.style.transition = "";
    }
  }

  const startLink = navLinks.find((link) => link.classList.contains("is-active")) || null;
  let fromLink = null;
  try {
    const label = sessionStorage.getItem(LAST_KEY);
    fromLink = navLinks.find((link) => link.dataset.label === label) || null;
  } catch (error) { /* storage unavailable: no slide between pages */ }
  if (fromLink && startLink && fromLink !== startLink && !reduceMotion.matches) {
    moveIndicator(fromLink, { instant: true });
    requestAnimationFrame(() => requestAnimationFrame(() => moveIndicator(startLink)));
  } else {
    moveIndicator(startLink, { instant: true });
  }

  // Remember where the underline was when leaving for another page
  window.addEventListener("pagehide", () => {
    try {
      if (indicatorLink) sessionStorage.setItem(LAST_KEY, indicatorLink.dataset.label);
      else sessionStorage.removeItem(LAST_KEY);
    } catch (error) { /* storage unavailable */ }
  });

  // Fonts and resizes change link positions: re-place the underline without animating
  if (document.fonts) document.fonts.ready.then(() => moveIndicator(indicatorLink, { instant: true }));

  // Active section: the last one whose top has passed a line a third of the
  // way down the visible area below the header.
  function currentLink() {
    const header = document.querySelector(".site-header");
    const line = header.offsetHeight + (window.innerHeight - header.offsetHeight) / 3;
    let active = homeLink;
    sections.forEach(({ section, link }) => {
      if (section.getBoundingClientRect().top <= line) active = link;
    });
    return active;
  }

  function update() {
    frame = null;
    if (!lockedLink) setActive(currentLink());
  }

  // A click-triggered scroll keeps the clicked link active until scrolling settles.
  function release() {
    lockedLink = null;
    update();
  }

  window.addEventListener("scroll", () => {
    if (lockedLink) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(release, SETTLE_DELAY);
    } else if (!frame) {
      frame = requestAnimationFrame(update);
    }
  }, { passive: true });

  window.addEventListener("resize", () => {
    moveIndicator(indicatorLink, { instant: true });
    if (!frame) frame = requestAnimationFrame(update);
  });

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

    const entry = target === document.body ? { link: homeLink } : sections.find((s) => s.section === target);
    if (entry) {
      lockedLink = entry.link;
      setActive(lockedLink);
      clearTimeout(settleTimer);
      settleTimer = setTimeout(release, SETTLE_DELAY * 4); // in case no scroll is needed
    }
  });

  update();
})();
