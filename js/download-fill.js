// Download buttons answer the press: a green fill runs across, the icon draws into a checkmark, and the
// button returns to normal. The file itself is saved by the browser, so this is confirmation, not a
// measure of progress. Styles: css/book.css. Used by the cards, the previews and the book page.
(function () {
  const FILL = 1100;    // ms, matches the fill in css/book.css
  const HOLD = 900;     // ms the checkmark stays
  const RESET = 420;    // ms, matches the fade in css/book.css
  const running = new WeakSet();

  // Returns false while the button is already running, so a second press can't save the file twice
  function playDownload(button) {
    if (running.has(button)) return false;
    running.add(button);
    button.classList.add("is-loading");
    setTimeout(() => button.classList.add("is-done"), FILL);
    setTimeout(() => {
      button.classList.remove("is-done");
      button.classList.add("is-resetting");
    }, FILL + HOLD);
    setTimeout(() => {
      button.classList.remove("is-loading", "is-resetting");
      running.delete(button);
    }, FILL + HOLD + RESET);
    return true;
  }

  window.BSSDownload = {
    play: playDownload,
    CHECK_ICON: '<svg class="download-check" viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path pathLength="1" d="m4.500 10.500 3.800 3.800 7.200-8.100"/></svg>',
  };
})();
