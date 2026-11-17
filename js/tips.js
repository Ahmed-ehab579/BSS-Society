// First-visit tips: short tooltips that teach a new visitor the few things they could miss, at the moment
// they reach each one. One tip on screen at a time, each shown once on this device (kept like Saved,
// js/saved.js), and pressing the feature itself counts as seen. "Skip tips" turns them all off;
// "Show tips again" in the footer brings them back. Styles: css/tips.css.
//
// Tips (wording below): path (Start here), listen / ask / read (the article, a three-step tour when read
// from Start here), steps (New Muslim), done (first "Mark as done"), saved (after the first save).
(() => {
  const KEY = "bss.tips";
  const PHONE = window.matchMedia("(max-width: 767px)");

  const TIPS = {
    path: { title: "One topic at a time", text: "Read a topic to unlock the next. Your progress is kept on this device." },
    listen: { title: "Prefer to listen?", text: "Play the article here. Finishing the audio counts as reading it." },
    ask: { title: "Question about this part?", text: "Press ? to ask us. The section you are reading is attached for you." },
    read: { title: "Finished?", text: "Mark as read to unlock your next topic." },
    steps: { title: "Go at your own pace", text: "Every step is open. Start with the one you need most." },
    done: { title: "Track your step", text: "Mark materials as done. Your step shows a check and your progress." },
    saved: { title: "Saved here", text: "Everything you save is in this menu, kept on this device." },
  };

  // ---- Memory: { seen: { id: true }, off: true } ----
  let state = { seen: {}, off: false };
  try { state = { ...state, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (error) { /* this visit only */ }
  state.seen = state.seen || {};
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { /* this visit only */ } }
  const wanted = (id) => !state.off && !state.seen[id];
  function markSeen(id) { if (!state.seen[id]) { state.seen[id] = true; save(); } }

  // ---- One tip at a time ----
  let current = null;           // { id, target, el, shownAt, cleanup }
  const queue = [];             // { id, target, opts } waiting for the current tip to close

  function blocked(target) {
    // A modal (preview, language sheet, Saved menu…) covers the page: wait unless the target is inside it
    const modal = document.querySelector("dialog:modal");
    if (modal && !modal.contains(target)) return true;
    const help = document.querySelector("[data-help-panel]");
    return Boolean(help && !help.hidden);
  }

  function request(id, target, opts = {}) {
    if (!wanted(id) || !target) return;
    if (current?.id === id || queue.some((item) => item.id === id)) return;
    queue.push({ id, target, opts });
    pump();
  }

  let retry = null;
  function pump() {
    if (current || !queue.length) return;
    const index = queue.findIndex((item) => wanted(item.id) && !blocked(item.target) && visible(item.target));
    if (index < 0) {
      // Something is in the way (a dialog, or the target scrolled off): look again shortly
      for (let i = queue.length - 1; i >= 0; i -= 1) if (!wanted(queue[i].id)) queue.splice(i, 1);
      if (queue.length && !retry) retry = setTimeout(() => { retry = null; pump(); }, 700);
      return;
    }
    const [item] = queue.splice(index, 1);
    show(item.id, item.target, item.opts);
  }

  function visible(el) {
    if (!el.isConnected || el.hidden || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }

  // ---- The tooltip ----
  function show(id, target, { step, total, tour } = {}) {
    const tip = TIPS[id];
    const el = document.createElement("div");
    el.className = "tip";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    const dots = total
      ? `<span class="tip__dots" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i${i < step ? ' class="is-on"' : ""}></i>`).join("")}</span><span class="visually-hidden">Tip ${step} of ${total}.</span>`
      : `<span class="visually-hidden">Tip.</span>`;
    const skip = tour && step === 1 ? `<button class="tip__skip" type="button" data-tip-skip>Skip tips</button>` : "";
    el.innerHTML = `
      <span class="tip__arrow" aria-hidden="true"></span>
      <p class="tip__title">${tip.title}</p>
      <p class="tip__text">${tip.text}</p>
      <div class="tip__foot">
        <span class="tip__meta">${dots}${skip}</span>
        <button class="tip__ok" type="button" data-tip-ok>Got it</button>
      </div>`;
    (target.closest("dialog") || document.body).append(el);

    const onKey = (event) => { if (event.key === "Escape" && current?.el === el) close(true); };
    const onMove = () => place();
    const onPress = () => close(true);                      // using the feature counts as seen
    el.querySelector("[data-tip-ok]").addEventListener("click", () => close(true));
    el.querySelector("[data-tip-skip]")?.addEventListener("click", () => { state.off = true; save(); close(true); queue.length = 0; });
    target.addEventListener("click", onPress);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);

    current = {
      id, target, el, shownAt: performance.now(),
      cleanup() {
        target.removeEventListener("click", onPress);
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onMove);
        window.removeEventListener("resize", onMove);
      },
    };
    place();
    requestAnimationFrame(() => el.classList.add("is-shown"));
  }

  function place() {
    if (!current) return;
    const { el, target } = current;
    if (!visible(target) || blocked(target)) {
      // Scrolled away: after a few seconds on screen it counts as seen; sooner, it comes back later
      close(performance.now() - current.shownAt > 2500, true);
      return;
    }
    const gap = 14;
    const margin = 16;
    const r = target.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const width = PHONE.matches ? vw - margin * 2 : Math.min(300, vw - margin * 2);
    el.style.width = `${width}px`;
    const h = el.offsetHeight;
    const below = r.bottom + gap + h <= window.innerHeight - margin;
    const above = r.top - gap - h >= margin;
    const under = below || !above;
    const top = under ? r.bottom + gap : r.top - gap - h;
    const centre = r.left + r.width / 2;
    const left = Math.min(Math.max(centre - width / 2, margin), vw - margin - width);
    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.classList.toggle("is-above", !under);
    el.style.setProperty("--tip-arrow-x", `${Math.round(Math.min(Math.max(centre - left, 20), width - 20))}px`);
  }

  function close(seen, requeue = false) {
    if (!current) return;
    const { id, target, el } = current;
    current.cleanup();
    current = null;
    if (seen) markSeen(id);
    else if (requeue) watch(target, () => request(id, target));
    el.classList.remove("is-shown");
    setTimeout(() => el.remove(), 200);
    setTimeout(pump, 400);
  }

  // ---- Triggers ----
  // Run fn once el has been on screen for `delay` ms (share = how much of it must show)
  function watch(el, fn, { delay = 1000, share = 0.5, margin = "0px" } = {}) {
    if (!el || !("IntersectionObserver" in window)) return;
    let timer = null;
    const io = new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) timer = setTimeout(() => { io.disconnect(); fn(); }, delay);
    }, { threshold: share, rootMargin: margin });
    io.observe(el);
  }

  // Elements added later by other scripts (cards, previews)
  function whenPresent(selector, fn) {
    const found = document.querySelector(selector);
    if (found) { fn(found); return; }
    const mo = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) { mo.disconnect(); fn(el); }
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    if (state.off) { footer(); return; }
    const page = location.pathname.split("/").pop() || "index.html";

    if (page === "start-here.html") {
      whenPresent('.journey__step[data-step="1"] .journey__slot > *', (card) => watch(card, () => request("path", card)));
    }

    if (page === "article.html") {
      const params = new URLSearchParams(location.search);
      const onPath = !params.get("from");
      const listen = document.querySelector("[data-listen]");
      const fab = document.querySelector("[data-help-open]");
      const heading = document.querySelector(".article-section__heading");
      const complete = document.querySelector("[data-complete]");
      const tour = (step) => (onPath ? { step, total: 3, tour: true } : {});

      if (onPath && listen) watch(listen, () => request("listen", listen, tour(1)), { delay: 1500 });
      // The ? button: once the reader reaches the first section
      if (fab && heading) watch(heading, () => request("ask", fab, tour(2)), { delay: 600, share: 0, margin: "0px 0px -40% 0px" });
      // Mark as read: once it is on screen and ready to press
      if (onPath && complete) {
        const ready = () => !complete.disabled && complete.offsetParent;
        const ask = () => request("read", complete, tour(3));
        watch(complete, () => {
          if (ready()) { ask(); return; }
          const mo = new MutationObserver(() => { if (ready()) { mo.disconnect(); watch(complete, ask, { delay: 400 }); } });
          mo.observe(complete, { attributes: true, attributeFilter: ["disabled"] });
        }, { delay: 400 });
      }
    }

    if (page === "new-muslim.html") {
      whenPresent('.path-step[data-step="1"] .path-step__title', (title) => watch(title, () => request("steps", title)));
    }

    // "Mark as done" (previews, material pages, New Muslim articles): the first one reached
    if (wanted("done")) {
      const seenMarks = new WeakSet();
      const scan = () => document.querySelectorAll("[data-done-mark]").forEach((mark) => {
        if (seenMarks.has(mark)) return;
        seenMarks.add(mark);
        watch(mark, () => { if (!mark.hidden) request("done", mark); }, { delay: 800 });
      });
      scan();
      new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
    }

    // The first save anywhere: point at the Saved icon
    const toggle = document.querySelector("[data-saved-toggle]");
    if (toggle && window.BSS?.saved) {
      toggle.addEventListener("click", () => markSeen("saved"));
      let count = BSS.saved.list().length;
      BSS.saved.onChange(() => {
        const now = BSS.saved.list().length;
        if (now > count) setTimeout(() => request("saved", toggle), 3800);   // after the "Saved" note fades (3.5 s)
        count = now;
      });
    }

    footer();
  }

  // ---- "Show tips again" in the footer ----
  function footer() {
    const list = document.querySelector(".footer-col--explore .footer-col__list");
    if (!list || list.querySelector("[data-tips-reset]")) return;
    const item = document.createElement("li");
    item.innerHTML = `<button class="footer-link footer-link--button" type="button" data-tips-reset><span class="footer-link__label">Show tips again</span></button>`;
    list.append(item);
    const button = item.querySelector("button");
    const label = button.querySelector(".footer-link__label");
    button.addEventListener("click", () => {
      state = { seen: {}, off: false };
      save();
      label.textContent = "Tips are back on";
      setTimeout(() => location.reload(), 900);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
