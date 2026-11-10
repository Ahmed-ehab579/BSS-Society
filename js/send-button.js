// Send buttons answer a send that really happened: the label fades out and comes back as a checkmark
// that draws itself next to "Sent". Forms that aren't connected to a service yet never call this, so
// the button never claims something was sent when it wasn't. Styles: css/base.css (.btn.is-sent).
(function () {
  const OUT = 160;   // ms, matches the fade in css/base.css
  const CHECK = '<svg class="btn__sent-check" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="m4.500 10.500 3.800 3.800 7.200-8.100"/></svg>';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const original = new WeakMap();

  // Swaps the label for a checkmark and `label`; resolves once the checkmark has drawn
  function play(button, label = "Sent") {
    if (original.has(button)) return Promise.resolve();
    original.set(button, { html: button.innerHTML, minWidth: button.style.minWidth });
    button.style.minWidth = `${button.offsetWidth}px`;   // the shorter label doesn't shrink the button
    const wait = reduceMotion.matches ? 0 : OUT;
    button.classList.add("is-swapping");
    return new Promise((resolve) => {
      setTimeout(() => {
        button.innerHTML = `${CHECK}<span>${label}</span>`;
        button.classList.add("is-sent");
        button.getBoundingClientRect();
        button.classList.remove("is-swapping");
        setTimeout(resolve, reduceMotion.matches ? 0 : 600);
      }, wait);
    });
  }

  // Back to the button's own label (when the form is changed or used again)
  function reset(button) {
    const saved = original.get(button);
    if (!saved) return;
    original.delete(button);
    button.classList.remove("is-sent", "is-swapping");
    button.innerHTML = saved.html;
    button.style.minWidth = saved.minWidth;
    if (reduceMotion.matches) return;
    // The label fades back in rather than snapping
    button.animate([{ color: "transparent" }, {}], { duration: 200, easing: "ease-out" });
    [...button.children].forEach((child) => child.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: "ease-out" }));
  }

  window.BSSSend = { play, reset, isSent: (button) => original.has(button) };
})();
