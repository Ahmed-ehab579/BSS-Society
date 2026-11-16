// "Contact us" anywhere on the site. A page that has the contact form (the home page, the New Muslim step
// pages) scrolls to it: js/header.js handles those #contact links. Every other page opens the same form in
// a dialog over the page, so the visitor never loses their place: centred on desktop, a sheet from the
// bottom on phones. What was typed stays if the dialog is closed; ×, Esc or a click outside closes it and
// focus returns to the button. A link to …#contact opens it straight away.
(() => {
  const ARROW = '<span class="btn__arrow-clip" aria-hidden="true"><span class="btn__arrow-track"><img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt=""><img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt=""></span></span>';
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = window.matchMedia("(max-width: 767px)");

  let dialog = null;
  let opener = null;

  const pageHasForm = () => Boolean(document.getElementById("contact"));

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "contact-dialog";
    dialog.setAttribute("aria-labelledby", "contact-modal-title");
    dialog.innerHTML = `
      <div class="contact-dialog__panel" tabindex="-1">
        <button class="contact-dialog__close" type="button" aria-label="Close" data-contact-close>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
        <div class="contact-dialog__intro">
          <p class="section-label">Contact us</p>
          <h2 class="contact-dialog__title" id="contact-modal-title">We’re here to help.</h2>
          <p class="contact-dialog__text">Whether you are learning about Islam for the first time or taking your next step as a new Muslim, we are here to help.</p>
        </div>
        <!-- Not connected to a service yet: validation only, nothing is sent (js/forms.js) -->
        <form class="contact-dialog__form" data-validate novalidate>
          <div class="contact-dialog__row">
            <div class="field">
              <label class="field__label" for="contact-modal-name">Name</label>
              <input class="field__input" id="contact-modal-name" name="name" type="text" autocomplete="name" placeholder="Your name" required>
            </div>
            <div class="field">
              <label class="field__label" for="contact-modal-email">Email</label>
              <input class="field__input" id="contact-modal-email" name="email" type="email" autocomplete="email" spellcheck="false" placeholder="email@example.com" required>
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="contact-modal-subject">Subject</label>
            <input class="field__input" id="contact-modal-subject" name="subject" type="text" placeholder="How can we help?">
          </div>
          <div class="field">
            <label class="field__label" for="contact-modal-message">Message</label>
            <textarea class="field__input" id="contact-modal-message" name="message" placeholder="Your message..." required></textarea>
          </div>
          <div class="contact-dialog__actions">
            <button class="btn btn--large btn--primary contact-form__submit" type="submit">Send message${ARROW}</button>
            <p class="form-status text-body-xs" role="status"></p>
          </div>
        </form>
      </div>`;
    document.body.append(dialog);
    window.BSSForms?.bind(dialog.querySelector("form"));

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog || event.target.closest("[data-contact-close]")) close();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      close();
    });
  }

  function open(from) {
    if (!dialog) build();
    opener = from || null;
    if (document.documentElement.classList.contains("is-menu-open")) document.querySelector(".menu-toggle")?.click();
    document.documentElement.classList.add("is-contact-open");
    dialog.showModal();
    requestAnimationFrame(() => dialog.classList.add("is-open"));
    // Desktop: straight into the first field. Phones focus the panel itself (no ring on the close
    // button), so the keyboard doesn't jump up before the visitor has seen the form.
    if (!phone.matches) dialog.querySelector("#contact-modal-name").focus({ preventScroll: true });
    else dialog.querySelector(".contact-dialog__panel").focus({ preventScroll: true });
  }

  function close() {
    if (!dialog?.open || dialog.classList.contains("is-closing")) return;
    dialog.classList.remove("is-open");
    dialog.classList.add("is-closing");
    const done = () => {
      dialog.classList.remove("is-closing");
      dialog.close();
      document.documentElement.classList.remove("is-contact-open");
      if (location.hash === "#contact") history.replaceState(null, "", location.pathname + location.search);
      // A link inside the closed phone menu can't take focus: the menu button that opened it does
      const target = opener && !opener.closest("[inert]") && opener.offsetParent ? opener : document.querySelector(".menu-toggle");
      target?.focus({ preventScroll: true });
    };
    if (reduceMotion.matches) done();
    else setTimeout(done, parseFloat(getComputedStyle(document.documentElement).getPropertyValue(phone.matches ? "--motion-sheet-out" : "--motion-panel-out")) || 320);
  }

  // Runs before js/header.js: on a page without the form, a Contact link opens the dialog instead of
  // leaving for the home page
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href="#contact"], a[href="index.html#contact"]');
    if (!link || link.hasAttribute("data-support-open") || pageHasForm()) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link);
  }, true);

  if (location.hash === "#contact" && !pageHasForm()) open(null);

  window.BSSContact = { open, close };
})();
