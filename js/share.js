// Share panel: Copy link plus the common places people share to (WhatsApp, Facebook, X, Telegram, Email)
// and "More options" for the device's own share sheet where there is one.
// Desktop: a small panel under the Share button. Phones: a sheet that slides up from the bottom.
// Used by the resource preview (js/preview.js) and the book page (js/book.js): BSS.share.open(button, { title, url }).
(() => {
  window.BSS = window.BSS || {};

  const ICONS = {
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    close: '<svg viewBox="0 0 20 20" fill="none"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    whatsapp: '<svg viewBox="0 0 38 38" fill="none"><g transform="translate(1.23 0.64)"><path d="M9.1 32.73 1.14 34.98l2.26-7.83A17.2 17.2 0 1 1 9.1 32.73Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></g><g transform="translate(9.37 9.975)"><path d="M5 .83C4.65 0 4.29 0 3.81 0h-.95C2.39 0 1.91.24 1.56.71.49 1.78-.1 3.09.01 4.63c.12 2.5 1.9 5.11 3.69 7.13 2.37 2.73 5.34 4.99 8.9 6.06 1.67.59 3.33.83 4.63.24 1.19-.6 2.38-1.9 2.61-3.09.12-.59.12-1.19-.24-1.43l-4.15-2.01c-.6-.24-.95-.24-1.31.35l-1.54 1.9c-.36.36-.6.36-1.07.12a14 14 0 0 1-4.16-2.5 13.5 13.5 0 0 1-2.85-3.56c-.24-.47-.24-.71.12-1.07l1.19-1.42c.36-.48.47-.83.24-1.31L5 .83Z" fill="currentColor"/></g></svg>',
    facebook: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M22 12.3C22 6.75 17.52 2.24 12 2.24S2 6.75 2 12.3c0 5.02 3.66 9.19 8.44 9.94v-7.03H7.9V12.3h2.54v-2.21c0-2.52 1.49-3.92 3.78-3.92 1.09 0 2.24.2 2.24.2v2.48h-1.26c-1.24 0-1.63.77-1.63 1.57v1.88h2.77l-.44 2.91h-2.33v7.03C18.34 21.49 22 17.33 22 12.3Z"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.83L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z"/></svg>',
    telegram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M21.5 3.5 2.8 10.7c-.9.35-.88 1.63.03 1.95l4.67 1.6 1.8 5.6c.25.78 1.23 1.02 1.8.44l2.66-2.66 4.86 3.58c.66.49 1.6.12 1.77-.68L23 4.9c.2-.95-.72-1.75-1.5-1.4Z"/><path d="m7.5 14.25 10-7.25-7.6 8.6"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="m21.5 7-8.6 5.6a1.7 1.7 0 0 1-1.8 0L2.5 7"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  };

  const enc = encodeURIComponent;
  const TARGETS = [
    { key: "whatsapp", label: "WhatsApp", href: (t, u) => `https://wa.me/?text=${enc(`${t} ${u}`)}` },
    { key: "facebook", label: "Facebook", href: (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
    { key: "x", label: "X", href: (t, u) => `https://x.com/intent/post?text=${enc(t)}&url=${enc(u)}` },
    { key: "telegram", label: "Telegram", href: (t, u) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
    { key: "email", label: "Email", href: (t, u) => `mailto:?subject=${enc(t)}&body=${enc(`${t}\n${u}`)}` },
  ];

  const PHONE = window.matchMedia("(max-width: 767px)");
  const COPIED_TIME = 2000;

  let panel = null;
  let opener = null;
  let data = { title: "", url: "" };
  let copiedTimer = 0;

  function build() {
    panel = document.createElement("dialog");
    panel.className = "share";
    panel.setAttribute("aria-labelledby", "share-title");
    panel.innerHTML = `
      <div class="share__panel">
        <div class="share__head">
          <h2 class="share__title" id="share-title">Share</h2>
          <button class="share__close" type="button" aria-label="Close" data-share-close>${ICONS.close}</button>
        </div>
        <div class="share__link">
          <span class="share__url" data-share-url></span>
          <button class="share__copy" type="button" data-share-copy>
            <span class="share__copy-icon" aria-hidden="true">${ICONS.link}</span>
            <span data-share-copy-label>Copy link</span>
          </button>
        </div>
        <ul class="share__targets" role="list">
          ${TARGETS.map((t) => `<li><a class="share__target" data-share-target="${t.key}" target="_blank" rel="noopener noreferrer"><span class="share__icon" aria-hidden="true">${ICONS[t.key]}</span><span class="share__label">${t.label}</span></a></li>`).join("")}
          <li data-share-more-item hidden><button class="share__target" type="button" data-share-more><span class="share__icon" aria-hidden="true">${ICONS.more}</span><span class="share__label">More</span></button></li>
        </ul>
        <p class="visually-hidden" role="status" aria-live="polite" data-share-status></p>
      </div>`;
    document.body.append(panel);

    panel.addEventListener("click", (event) => {
      if (event.target === panel || event.target.closest("[data-share-close]")) close();
      else if (event.target.closest("[data-share-copy]")) copy();
      else if (event.target.closest("[data-share-more]")) more();
      else if (event.target.closest("[data-share-target]")) setTimeout(close, 150);
    });
    panel.addEventListener("cancel", (event) => { event.preventDefault(); close(); });
    window.addEventListener("resize", () => { if (panel.open) place(); });
  }

  // Desktop: under the button, right edges lined up, kept inside the window
  function place() {
    if (PHONE.matches || !opener) {
      panel.style.removeProperty("--share-top");
      panel.style.removeProperty("--share-left");
      return;
    }
    const b = opener.getBoundingClientRect();
    const w = panel.querySelector(".share__panel").offsetWidth;
    const left = Math.min(Math.max(12, b.right - w), window.innerWidth - w - 12);
    panel.style.setProperty("--share-top", `${Math.round(b.bottom + 8)}px`);
    panel.style.setProperty("--share-left", `${Math.round(left)}px`);
  }

  function open(button, { title, url } = {}) {
    if (!panel) build();
    opener = button;
    data = { title: title || document.title, url: url || location.href };
    panel.querySelector("[data-share-url]").textContent = data.url.replace(/^https?:\/\//, "");
    panel.querySelectorAll("[data-share-target]").forEach((a) => {
      a.href = TARGETS.find((t) => t.key === a.dataset.shareTarget).href(data.title, data.url);
    });
    panel.querySelector("[data-share-more-item]").hidden = !navigator.share;
    resetCopy();
    button?.setAttribute("aria-expanded", "true");
    panel.showModal();
    place();
    requestAnimationFrame(() => panel.classList.add("is-open"));
    panel.querySelector("[data-share-copy]").focus();
  }

  function close() {
    if (!panel?.open || panel.classList.contains("is-closing")) return;
    panel.classList.remove("is-open");
    panel.classList.add("is-closing");
    opener?.setAttribute("aria-expanded", "false");
    const done = () => {
      panel.classList.remove("is-closing");
      panel.close();
      opener?.focus({ preventScroll: true });
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) done();
    else setTimeout(done, PHONE.matches ? 360 : 220);
  }

  function resetCopy() {
    clearTimeout(copiedTimer);
    const button = panel.querySelector("[data-share-copy]");
    button.classList.remove("is-copied");
    button.querySelector(".share__copy-icon").innerHTML = ICONS.link;
    button.querySelector("[data-share-copy-label]").textContent = "Copy link";
  }

  async function copy() {
    const button = panel.querySelector("[data-share-copy]");
    const status = panel.querySelector("[data-share-status]");
    try {
      await navigator.clipboard.writeText(data.url);
      button.classList.add("is-copied");
      button.querySelector(".share__copy-icon").innerHTML = ICONS.check;
      button.querySelector("[data-share-copy-label]").textContent = "Copied";
      status.textContent = "Link copied";
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(resetCopy, COPIED_TIME);
    } catch (error) {
      button.querySelector("[data-share-copy-label]").textContent = "Copy failed";
      status.textContent = "Couldn’t copy. Use the address bar";
      clearTimeout(copiedTimer);
      copiedTimer = setTimeout(resetCopy, COPIED_TIME);
    }
  }

  async function more() {
    try {
      await navigator.share({ title: data.title, url: data.url });
      close();
    } catch (error) {
      // closing the device's share sheet is not a failure: the panel stays open
    }
  }

  window.BSS.share = { open, close };
})();
