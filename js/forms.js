// Client-side validation for [data-validate] forms (contact, newsletter).
// No submission service is connected yet, so a valid submit sends nothing
// and says so instead of showing a success message.
(function () {
  const NOT_CONNECTED = "This form isn’t connected yet, so nothing was sent.";

  function messageFor(input) {
    const v = input.validity;
    if (v.valueMissing) {
      return input.type === "email" ? "Enter your email address." : `Enter your ${input.name}.`;
    }
    if (v.typeMismatch) return "Enter a valid email address.";
    return "";
  }

  // Each input gets an error element: #<id>-error if present, else one inside its .field.
  function errorFor(input) {
    const id = `${input.id}-error`;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("p");
      el.className = "field__error";
      el.id = id;
      el.hidden = true;
      input.closest(".field").appendChild(el);
    }
    const describedBy = (input.getAttribute("aria-describedby") || "").split(" ").filter(Boolean);
    if (!describedBy.includes(id)) input.setAttribute("aria-describedby", [...describedBy, id].join(" "));
    return el;
  }

  function check(input) {
    const message = messageFor(input);
    const el = errorFor(input);
    el.textContent = message;
    el.hidden = !message;
    if (message) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
    return !message;
  }

  document.querySelectorAll("form[data-validate]").forEach((form) => {
    const inputs = [...form.querySelectorAll("input, textarea")].filter((el) => el.willValidate);
    const status = form.querySelector(".form-status");
    let submitted = false;

    // Before the first submit, only check a field once the user leaves it with a value.
    inputs.forEach((input) => {
      input.addEventListener("blur", () => {
        if (submitted || input.value.trim()) check(input);
      });
      input.addEventListener("input", () => {
        if (status) status.textContent = "";
        if (input.hasAttribute("aria-invalid")) check(input);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      submitted = true;
      inputs.forEach((input) => {
        if (input.type !== "email" && !input.value.trim()) input.value = "";
      });
      const invalid = inputs.filter((input) => !check(input));
      if (invalid.length) {
        if (status) status.textContent = "";
        invalid[0].focus();
        return;
      }
      if (status) status.textContent = NOT_CONNECTED;
    });
  });
})();
