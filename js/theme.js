// Light / dark theme (homepage trial). Loaded in the <head> so the saved theme is applied before anything is
// drawn: no flash of the light page. Light is the default; the visitor's choice is remembered on this device.
(() => {
  const KEY = "bss.theme";
  const root = document.documentElement;
  const meta = () => document.querySelector('meta[name="theme-color"]');
  const BAR = { light: "#f5f2eb", dark: "#151713" };

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (error) { /* storage blocked: light */ }
  apply(saved === "dark" ? "dark" : "light");

  function apply(theme) {
    root.dataset.theme = theme;
    const bar = meta();
    if (bar) bar.content = BAR[theme];
  }

  function sync(button) {
    const dark = root.dataset.theme === "dark";
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  }

  function toggle(button) {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem(KEY, next); } catch (error) { /* this visit only */ }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      apply(next);
      sync(button);
      return;
    }

    // The new theme spreads out in a circle from the switch, like a light being turned on (or off)
    const box = button.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("is-theme-switching");
    const transition = document.startViewTransition(() => { apply(next); sync(button); });
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 700, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(() => {});
    transition.finished.finally(() => root.classList.remove("is-theme-switching"));
  }

  function setup() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      sync(button);
      button.addEventListener("click", () => toggle(button));
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
