// About page support band: "Contact us" opens the ways to reach the team, "Partner with us" opens a short
// form to say how someone would like to help. Desktop: a dialog in the middle of the screen. Phones: a
// sheet from the bottom that can be dragged down to close (like the language picker).
// No form service is connected yet, so a valid form says so plainly instead of pretending it was sent.
(function () {
  const openers = document.querySelectorAll("[data-support-open]");
  if (!openers.length || typeof HTMLDialogElement === "undefined") return;

  const CONNECTED = false;          // true once a form service receives the partner form
  const NOT_CONNECTED = "This form isn’t connected yet, so nothing was sent.";
  const COPIED_TIME = 2000;         // ms "Copied" stays on the button
  const RESET_TIME = 300;           // ms, matches the fade in css/support.css
  const DISMISS_DISTANCE = 110;     // px dragged down that closes the sheet
  const DISMISS_SPEED = 0.6;        // px per ms: a quick flick closes it from any distance
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const phone = window.matchMedia("(max-width: 767px)");

  // ---- Opening and closing ------------------------------------------------------------------------

  function setUp(dialog) {
    const sheet = dialog.querySelector(".support-sheet");
    const head = dialog.querySelector(".support-sheet__head");
    const backdrop = dialog.querySelector(".support-dialog__backdrop");
    let opener = null;
    let closeTimer = null;

    function open(from) {
      if (dialog.open) return;
      clearTimeout(closeTimer);
      opener = from;
      root.classList.add("is-sheet-open");
      dialog.showModal();
      sheet.scrollTop = 0;
      sheet.focus({ preventScroll: true });
      sheet.getBoundingClientRect();   // start from the closed position
      dialog.classList.add("is-open");
    }

    function close() {
      if (!dialog.open || !dialog.classList.contains("is-open")) return;
      dialog.classList.remove("is-open");
      sheet.classList.remove("is-dragging");
      sheet.style.removeProperty("transform");
      backdrop.style.removeProperty("opacity");
      const duration = parseFloat(getComputedStyle(root).getPropertyValue("--motion-duration-sheet-out")) || 0;
      closeTimer = setTimeout(() => {
        dialog.close();
        root.classList.remove("is-sheet-open");
        opener?.focus({ preventScroll: true });
      }, reducedMotion.matches ? 0 : duration);
    }

    backdrop.addEventListener("click", close);
    dialog.querySelector(".support-sheet__close").addEventListener("click", close);
    dialog.addEventListener("cancel", (event) => {   // Esc and the Android back gesture
      event.preventDefault();
      close();
    });

    // Phones: drag the top of the sheet down to dismiss it
    let drag = null;
    head.addEventListener("pointerdown", (event) => {
      if (!phone.matches || event.target.closest("button") || !dialog.classList.contains("is-open")) return;
      drag = { startY: event.clientY, lastY: event.clientY, lastTime: event.timeStamp, speed: 0, distance: 0 };
      head.setPointerCapture(event.pointerId);
      sheet.classList.add("is-dragging");
    });
    head.addEventListener("pointermove", (event) => {
      if (!drag) return;
      const distance = Math.max(0, event.clientY - drag.startY);
      const elapsed = event.timeStamp - drag.lastTime;
      if (elapsed > 0) drag.speed = (event.clientY - drag.lastY) / elapsed;
      drag.lastY = event.clientY;
      drag.lastTime = event.timeStamp;
      drag.distance = distance;
      sheet.style.transform = `translateY(${distance}px)`;
      backdrop.style.opacity = String(1 - Math.min(1, distance / sheet.offsetHeight));
    });
    function endDrag(event) {
      if (!drag) return;
      const { distance, speed } = drag;
      drag = null;
      sheet.classList.remove("is-dragging");
      if (event.type === "pointerup" && (distance > DISMISS_DISTANCE || (distance > 8 && speed > DISMISS_SPEED))) {
        close();
      } else {
        sheet.style.removeProperty("transform");   // settles back into place
        backdrop.style.removeProperty("opacity");
      }
    }
    head.addEventListener("pointerup", endDrag);
    head.addEventListener("pointercancel", endDrag);

    // Back to this page from the browser's cache with the panel still open
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && dialog.open) {
        dialog.classList.remove("is-open");
        dialog.close();
        root.classList.remove("is-sheet-open");
      }
    });

    return { open, close };
  }

  const panels = new Map();
  openers.forEach((button) => {
    const dialog = document.getElementById(button.dataset.supportOpen);
    if (!dialog) return;
    if (!panels.has(dialog)) panels.set(dialog, setUp(dialog));
    button.addEventListener("click", (event) => {
      event.preventDefault();   // without this script, the link still goes to the contact form
      panels.get(dialog).open(button);
    });
  });

  // ---- Contact: copy an email address or phone number --------------------------------------------

  const contactStatus = document.querySelector("[data-support-status]");

  function copyTheOldWay(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;opacity:0;";
    (document.querySelector("dialog[open]") || document.body).append(field);
    field.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (error) { ok = false; }
    field.remove();
    return ok;
  }
  document.querySelectorAll("[data-copy]").forEach((button) => {
    let timer = null;
    button.addEventListener("click", async () => {
      let copied = false;
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        copied = true;
      } catch (error) {
        copied = copyTheOldWay(button.dataset.copy);   // older browsers, or the clipboard is blocked
      }
      clearTimeout(timer);
      button.classList.remove("is-resetting", "is-copied");
      button.getBoundingClientRect();   // a second press runs the fill again from the left
      button.textContent = copied ? "Copied" : "Couldn’t copy";
      button.classList.toggle("is-copied", copied);
      if (contactStatus) contactStatus.textContent = copied ? `${button.dataset.copy} copied` : "Couldn’t copy. Select the text instead.";
      timer = setTimeout(() => {
        button.classList.add("is-resetting");   // the green fades, then the label returns
        timer = setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied", "is-resetting");
        }, reducedMotion.matches ? 0 : RESET_TIME);
      }, COPIED_TIME);
    });
  });

  // ---- Partner form -------------------------------------------------------------------------------

  const form = document.querySelector("[data-partner-form]");
  if (!form) return;

  const areas = [...form.querySelectorAll('input[name="areas"]')];
  const areasError = form.querySelector("#partner-areas-error");
  const email = form.querySelector("#partner-email");
  const emailError = form.querySelector("#partner-email-error");
  const status = form.querySelector(".partner-form__status");
  const submit = form.querySelector(".partner-form__submit");
  let submitted = false;

  // Extra questions appear only when they apply: languages for translators, a name for organisations
  function showFollowUps() {
    const chosen = new Set(areas.filter((box) => box.checked).map((box) => box.value));
    chosen.add(form.querySelector('input[name="as"]:checked').value);
    form.querySelectorAll("[data-show-when]").forEach((field) => {
      field.hidden = !chosen.has(field.dataset.showWhen);
    });
  }

  function checkAreas() {
    const ok = areas.some((box) => box.checked);
    areasError.textContent = ok ? "" : "Choose at least one way to help.";
    areasError.hidden = ok;
    return ok;
  }

  function checkEmail() {
    const value = email.value.trim();
    const message = !value ? "Enter your email address." : email.validity.typeMismatch ? "Enter a valid email address." : "";
    emailError.textContent = message;
    emailError.hidden = !message;
    if (message) email.setAttribute("aria-invalid", "true");
    else email.removeAttribute("aria-invalid");
    email.setAttribute("aria-describedby", "partner-email-error");
    return !message;
  }

  form.addEventListener("change", (event) => {
    window.BSSSend?.reset(submit);   // changing the form after a send makes Send ready again
    showFollowUps();
    if (event.target.name === "areas" && submitted) checkAreas();
    status.textContent = "";
  });
  email.addEventListener("blur", () => {
    if (submitted || email.value.trim()) checkEmail();
  });
  form.addEventListener("input", () => window.BSSSend?.reset(submit));
  email.addEventListener("input", () => {
    status.textContent = "";
    if (email.hasAttribute("aria-invalid")) checkEmail();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submitted = true;
    const areasOk = checkAreas();
    const emailOk = checkEmail();
    if (!areasOk) {
      areas[0].focus();
      return;
    }
    if (!emailOk) {
      email.focus();
      return;
    }
    if (!CONNECTED) {
      status.textContent = NOT_CONNECTED;   // nothing was sent, so the button stays as it is
      return;
    }
    if (window.BSSSend?.isSent(submit)) return;
    window.BSSSend?.play(submit, "Sent");
    status.textContent = "Thank you. Our team will email you within a week.";
  });

  showFollowUps();
})();
