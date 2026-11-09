// Saved menu in the site header: the bookmark button and its count (js/saved.js keeps the list).
(function () {
  const BSS = window.BSS;
  const toggle = document.querySelector("[data-saved-toggle]");
  if (!toggle || !BSS || !BSS.saved) return;

  const count = toggle.querySelector("[data-saved-count]");
  let shown = -1;

  function showCount() {
    const total = BSS.saved.list().length;
    if (total === shown) return;
    const grew = shown >= 0 && total > shown;
    shown = total;
    count.hidden = total === 0;
    count.textContent = total > 99 ? "99+" : String(total);
    toggle.setAttribute("aria-label", total ? `Saved, ${total} ${total === 1 ? "item" : "items"}` : "Saved");
    if (grew) {
      count.classList.remove("is-bumping");
      count.getBoundingClientRect();   // restart the animation on quick repeat saves
      count.classList.add("is-bumping");
    }
  }

  showCount();
  BSS.saved.onChange(showCount);
})();
