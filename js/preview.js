// Material previews: pressing a book, audio book or video card opens an overlay with what someone needs
// to decide, in the book details layout (css/book.css, css/preview.css). 90% of the screen on desktop, the
// full screen on phones. Articles have no preview: their card opens the article. The overlay has its own
// address (#preview=...), so it can be shared, and the phone's back gesture closes it.
(function () {
  const BSS = window.BSS;
  if (!BSS || !BSS.resourceItem) return;

  // Real content goes here. Every button works by itself once its address is filled in; until then it
  // says plainly that the file isn't available. An item can carry its own pdf, audio, soundcloud or youtube.
  const SAMPLES = {
    pdf: "",          // e.g. "assets/samples/book.pdf"
    pdfSize: "",      // e.g. "4.2 MB"
    audio: "",        // e.g. "assets/samples/audio.mp3"
    soundcloud: "",   // the full SoundCloud link
    youtube: "",      // the full YouTube link
  };

  const SAVED_KEY = "bss.saved.v1";
  const NOTE_TIME = 2400;      // ms a confirmation stays up
  const CLOSE_TIME = 260;      // ms, matches css/preview.css
  const SKIP = 15;             // seconds the skip buttons and lock-screen controls move
  const SPEEDS = [1, 1.25, 1.5, 2];
  const TOPICS = { belief: "Belief & Faith", quran: "The Qur’an", prophet: "Prophet Muhammad", women: "Women in Islam", life: "Life & Questions" };
  const LANGUAGES = { en: "English", ar: "Arabic" };
  const MISSING = {
    pdf: "The PDF isn’t available yet. It will be here to download soon.",
    audio: "The audio isn’t available yet. It will be here to listen to soon.",
    soundcloud: "The SoundCloud link isn’t available yet.",
    youtube: "The video isn’t available yet. It will be here to watch soon.",
  };
  const AUDIENCE = [
    "Anyone meeting this topic for the first time",
    "Readers who want a calm, clear explanation",
    "Students looking for a trusted starting point",
    "People with questions who prefer plain language",
  ];

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const escape = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const backLabel = location.pathname.includes("library") ? "Back to library" : "Back";

  const dialog = document.createElement("dialog");
  dialog.className = "preview";
  dialog.setAttribute("aria-labelledby", "preview-title");
  dialog.innerHTML = `
    <div class="preview__backdrop"></div>
    <div class="preview__sheet" tabindex="-1">
      <div class="preview__bar">
        <button class="preview__back" type="button" data-preview-close>
          <img src="assets/icons/arrow-left.svg" width="22" height="22" alt="">
          <span>${backLabel}</span>
        </button>
      </div>
      <div class="preview__scroll"></div>
    </div>`;
  document.body.append(dialog);

  const sheet = dialog.querySelector(".preview__sheet");
  const scroller = dialog.querySelector(".preview__scroll");
  const backdrop = dialog.querySelector(".preview__backdrop");

  let current = null;       // the open item
  let opener = null;        // gets focus back on closing
  let pushed = false;       // this overlay added a history entry
  let closeTimer = null;
  let noteTimer = null;
  let teardown = null;      // stops the audio when the overlay closes

  const sourceFor = (item, key) => item[key] || SAMPLES[key] || "";

  function factsHtml(item, type) {
    const facts = [
      ["Type", type.badge],
      ["Topic", TOPICS[item.category]],
      ["Level", item.level && item.level[0].toUpperCase() + item.level.slice(1)],
      ["Language", LANGUAGES[item.language]],
    ].filter(([, value]) => value);
    return `<dl class="preview__facts">${facts.map(([term, value]) =>
      `<div><dt>${term}</dt><dd>${escape(value)}</dd></div>`).join("")}</dl>`;
  }

  // An address opens as a link; without one the button explains instead of pretending
  function linkHtml(item, kind, className, inner) {
    const address = sourceFor(item, kind);
    if (!address) return `<button class="${className}" type="button" data-preview-missing="${kind}">${inner}</button>`;
    const how = kind === "pdf" ? "download" : 'target="_blank" rel="noopener"';
    return `<a class="${className}" href="${escape(address)}" ${how}>${inner}</a>`;
  }

  function downloadHtml(item) {
    const size = sourceFor(item, "pdf") && SAMPLES.pdfSize ? ` <span class="book__size">(${escape(SAMPLES.pdfSize)})</span>` : "";
    return linkHtml(item, "pdf", "btn btn--regular btn--primary",
      `<img class="book__download" src="assets/icons/download.svg" width="16" height="16" alt="">Download PDF${size}`);
  }

  function detailsHtml(item, type, cta, extra = "") {
    const topic = TOPICS[item.category];
    return `<div class="book__details">
      <header class="book__head">
        <p class="book__tag">${escape(type.badge)}${topic ? ` · ${escape(topic)}` : ""}</p>
        <h2 class="book__title" id="preview-title" dir="${item.dir || "auto"}">${escape(item.title)}</h2>
        <div class="book__actions">
          <button class="book__icon-btn" type="button" data-preview-share aria-label="Share">
            <img src="assets/icons/share.svg" width="14.4" height="16" alt="">
          </button>
          <button class="book__icon-btn" type="button" data-book-save data-preview-save aria-pressed="false" aria-label="Save">
            <img src="assets/icons/bookmark.svg" width="11.55" height="14.85" alt="" data-icon="off">
            <img src="assets/icons/bookmark-filled.svg" width="11.55" height="14.85" alt="" data-icon="on">
          </button>
          <p class="book__note" role="status"></p>
        </div>
      </header>
      <section class="book__section">
        <h3 class="book__heading">Summary</h3>
        <p class="book__summary" dir="${item.dir || "auto"}">${escape(item.text)}</p>
      </section>
      ${extra}
      ${factsHtml(item, type)}
      <div class="book__cta">${cta}<p class="book__unavailable" role="status"></p></div>
    </div>`;
  }

  function coverHtml(item) {
    return `<figure class="book__cover">
      <img src="${escape(item.image)}" alt="" onerror="this.parentElement.classList.add('is-missing')">
      <figcaption class="book__cover-fallback" aria-hidden="true">${escape(item.title)}</figcaption>
    </figure>`;
  }

  function bookHtml(item, type) {
    const audience = `<section class="book__section book__section--audience">
      <h3 class="book__heading">Who it’s for</h3>
      <ul class="book__audience">${AUDIENCE.map((line) => `<li>${line}</li>`).join("")}</ul>
    </section>`;
    return `<article class="book">${coverHtml(item)}${detailsHtml(item, type, downloadHtml(item), audience)}</article>`;
  }

  function audioHtml(item, type) {
    const icon = (path) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${path}</svg>`;
    const player = `<div class="preview__media">
      ${coverHtml(item)}
      <div class="player${sourceFor(item, "audio") ? "" : " is-empty"}" data-player>
        <input class="player__seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
        <div class="player__times"><span data-player-time>0:00</span><span data-player-length>--:--</span></div>
        <div class="player__controls">
          <button class="player__speed" type="button" data-player-speed aria-label="Playback speed: normal">1×</button>
          <button class="player__skip" type="button" data-player-skip="-${SKIP}" aria-label="Back ${SKIP} seconds">
            <span aria-hidden="true">${SKIP}</span>${icon('<path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/>')}
          </button>
          <button class="player__play" type="button" data-player-play aria-label="Play">
            ${icon('<path class="player__icon-play" d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5Z"/><path class="player__icon-pause" d="M7 5h3.5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm6.500 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.500a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>')}
          </button>
          <button class="player__skip" type="button" data-player-skip="${SKIP}" aria-label="Forward ${SKIP} seconds">
            <span aria-hidden="true">${SKIP}</span>${icon('<path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8Z"/>')}
          </button>
          <span class="player__spacer" aria-hidden="true"></span>
        </div>
        <audio preload="metadata"></audio>
      </div>
    </div>`;
    const cta = downloadHtml(item) + linkHtml(item, "soundcloud", "btn btn--regular btn--secondary",
      '<img src="assets/icons/soundcloud.svg" width="30" height="30" alt="">Listen on SoundCloud');
    return `<article class="book">${player}${detailsHtml(item, type, cta)}</article>`;
  }

  // The YouTube player only loads when someone presses play: a much lighter overlay, and no YouTube
  // cookies for people who never watch.
  function youtubeId(link) {
    const found = /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/.exec(link);
    return found ? found[1] : "";
  }

  function videoHtml(item, type) {
    const media = `<div class="preview__media">
      <div class="preview__video" data-video>
        <img src="${escape(item.image)}" alt="" style="object-position: ${escape(item.focus || "50% 50%")}">
        <button class="preview__video-play" type="button" data-video-play aria-label="Play video: ${escape(item.title)}">
          <img src="assets/icons/media-play-lg.svg" width="112.864" height="112.864" alt="">
        </button>
      </div>
    </div>`;
    const cta = linkHtml(item, "youtube", "btn btn--regular btn--secondary",
      '<img src="assets/icons/youtube.svg" width="22" height="22" alt="">Watch on YouTube');
    return `<article class="book">${media}${detailsHtml(item, type, cta)}</article>`;
  }

  // ---- The player: on the page, and on the lock screen through the Media Session API ----------------

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "--:--";
    const whole = Math.floor(seconds);
    const hours = Math.floor(whole / 3600);
    const minutes = String(Math.floor(whole / 60) % 60);
    const rest = String(whole % 60).padStart(2, "0");
    return hours ? `${hours}:${minutes.padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
  }

  function setUpPlayer(item) {
    const box = scroller.querySelector("[data-player]");
    if (!box) return;
    const audio = box.querySelector("audio");
    const seek = box.querySelector(".player__seek");
    const time = box.querySelector("[data-player-time]");
    const length = box.querySelector("[data-player-length]");
    const play = box.querySelector("[data-player-play]");
    const speed = box.querySelector("[data-player-speed]");
    const source = sourceFor(item, "audio");
    let dragging = false;
    let speedIndex = 0;

    function showPosition() {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      if (!dragging) seek.value = Math.round(ratio * 1000);
      seek.style.setProperty("--progress", `${(seek.value / 10).toFixed(2)}%`);
      time.textContent = formatTime(audio.currentTime);
    }

    function showLockScreenPosition() {
      if (!("mediaSession" in navigator) || !Number.isFinite(audio.duration)) return;
      navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: audio.playbackRate, position: audio.currentTime });
    }

    function skip(by) {
      audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + by));
    }

    function showMissing() {
      showNote(MISSING.audio);
    }

    play.addEventListener("click", () => {
      if (!source) showMissing();
      else if (audio.paused) audio.play().catch(() => showNote("The audio couldn’t start. Please try again."));
      else audio.pause();
    });

    box.querySelectorAll("[data-player-skip]").forEach((button) => button.addEventListener("click", () => {
      if (source) skip(Number(button.dataset.playerSkip));
      else showMissing();
    }));

    speed.addEventListener("click", () => {
      speedIndex = (speedIndex + 1) % SPEEDS.length;
      audio.playbackRate = SPEEDS[speedIndex];
      speed.textContent = `${SPEEDS[speedIndex]}×`;
      speed.setAttribute("aria-label", `Playback speed: ${SPEEDS[speedIndex] === 1 ? "normal" : SPEEDS[speedIndex]}`);
    });

    seek.addEventListener("input", () => {
      dragging = true;
      seek.style.setProperty("--progress", `${(seek.value / 10).toFixed(2)}%`);
      time.textContent = formatTime((seek.value / 1000) * (audio.duration || 0));
    });

    seek.addEventListener("change", () => {
      dragging = false;
      if (audio.duration) audio.currentTime = (seek.value / 1000) * audio.duration;
      else seek.value = 0;
      showPosition();
    });

    audio.addEventListener("loadedmetadata", () => {
      length.textContent = formatTime(audio.duration);
      showPosition();
    });
    audio.addEventListener("timeupdate", showPosition);
    audio.addEventListener("seeked", showLockScreenPosition);
    audio.addEventListener("ratechange", showLockScreenPosition);
    audio.addEventListener("error", () => showNote("The audio couldn’t load. Please try again later."));

    const setPlaying = (playing) => {
      box.classList.toggle("is-playing", playing);
      play.setAttribute("aria-label", playing ? "Pause" : "Play");
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    };
    audio.addEventListener("play", () => {
      setPlaying(true);
      showLockScreenPosition();
    });
    audio.addEventListener("pause", () => setPlaying(false));
    audio.addEventListener("ended", () => {
      setPlaying(false);
      audio.currentTime = 0;
    });

    if ("mediaSession" in navigator && source) {
      const session = navigator.mediaSession;
      const art = new URL(item.image, location.href).href;
      session.metadata = new MediaMetadata({ title: item.title, artist: "Best Speech Society", album: "Library", artwork: [{ src: art, sizes: "512x512" }] });
      session.setActionHandler("play", () => audio.play());
      session.setActionHandler("pause", () => audio.pause());
      session.setActionHandler("seekbackward", (event) => skip(-(event.seekOffset || SKIP)));
      session.setActionHandler("seekforward", (event) => skip(event.seekOffset || SKIP));
      session.setActionHandler("seekto", (event) => { audio.currentTime = event.seekTime; });
    }

    if (source) audio.src = source;

    teardown = () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.metadata = null;
      ["play", "pause", "seekbackward", "seekforward", "seekto"].forEach((action) => navigator.mediaSession.setActionHandler(action, null));
    };
  }

  // ---- Share, save and messages ------------------------------------------------------------------

  function showNote(message) {
    const line = scroller.querySelector(".book__unavailable");
    if (!line) return;
    line.textContent = message;
    line.classList.add("is-visible");
    line.scrollIntoView({ block: "nearest", behavior: reduceMotion.matches ? "auto" : "smooth" });
  }

  function say(message, button) {
    const note = scroller.querySelector(".book__note");
    note.style.setProperty("--note-top", `${button.offsetTop}px`);
    note.textContent = message;
    note.classList.add("is-visible");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => note.classList.remove("is-visible"), NOTE_TIME);
  }

  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  async function share(button) {
    if (navigator.share) {
      try {
        await navigator.share({ title: current.title, url: location.href });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;   // closing the share sheet is not a failure
      }
    }
    try {
      await navigator.clipboard.writeText(location.href);
      say("Link copied", button);
    } catch (error) {
      say("Couldn’t copy. Use the address bar", button);
    }
  }

  function toggleSave(button) {
    const key = current.key;
    const saved = readSaved();
    const next = saved.includes(key) ? saved.filter((entry) => entry !== key) : [...saved, key];
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch (error) {
      say("Couldn’t save on this device", button);
      return;
    }
    button.setAttribute("aria-pressed", String(next.includes(key)));
    button.classList.remove("is-popping");
    button.getBoundingClientRect();   // restart the animation on quick repeat presses
    button.classList.add("is-popping");
    say(next.includes(key) ? "Saved" : "Removed from saved", button);
  }

  // ---- Opening and closing -----------------------------------------------------------------------

  function open(item, { from = null, remember = true, message = "" } = {}) {
    if (dialog.open) return;
    clearTimeout(closeTimer);
    const type = BSS.RESOURCE_TYPES[item.format];
    current = item;
    opener = from;
    dialog.className = `preview preview--${item.format}`;
    scroller.innerHTML = { book: bookHtml, audio: audioHtml, video: videoHtml }[item.format](item, type);
    scroller.scrollTop = 0;
    scroller.querySelector("[data-preview-save]").setAttribute("aria-pressed", String(readSaved().includes(item.key)));
    setUpPlayer(item);
    if (remember) {
      history.pushState({ preview: item.key }, "", `#preview=${item.key}`);
      pushed = true;
    }
    root.classList.add("is-sheet-open");
    dialog.showModal();
    sheet.focus({ preventScroll: true });
    sheet.getBoundingClientRect();   // start from the closed position
    dialog.classList.add("is-open");
    if (message) showNote(message);
  }

  function finish() {
    dialog.close();
    scroller.innerHTML = "";          // also stops a playing YouTube video
    root.classList.remove("is-sheet-open");
    if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    current = null;
  }

  function close() {
    if (!dialog.open || !dialog.classList.contains("is-open")) return;
    dialog.classList.remove("is-open");
    teardown?.();
    teardown = null;
    closeTimer = setTimeout(finish, reduceMotion.matches ? 0 : CLOSE_TIME);
  }

  // Back arrow, Esc and the backdrop leave the same way as the browser's back button
  function leave() {
    if (pushed) {
      history.back();
      return;
    }
    history.replaceState(null, "", location.pathname + location.search);
    close();
  }

  window.addEventListener("popstate", () => {
    pushed = false;
    if (dialog.open) close();
    else openFromAddress();
  });

  function openFromAddress() {
    const found = /^#preview=(\w+)$/.exec(location.hash);
    const item = found && BSS.resourceItem(found[1]);
    if (item) open(item, { remember: false });
  }

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    leave();
  });
  backdrop.addEventListener("click", leave);

  dialog.addEventListener("click", (event) => {
    const target = event.target;
    if (target.closest("[data-preview-close]")) leave();
    else if (target.closest("[data-preview-share]")) share(target.closest("button"));
    else if (target.closest("[data-preview-save]")) toggleSave(target.closest("button"));
    else if (target.closest("[data-preview-missing]")) showNote(MISSING[target.closest("[data-preview-missing]").dataset.previewMissing]);
    else if (target.closest("[data-video-play]")) {
      const id = youtubeId(sourceFor(current, "youtube"));
      if (!id) {
        showNote(MISSING.youtube);
        return;
      }
      const frame = document.createElement("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      frame.title = current.title;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      scroller.querySelector("[data-video]").replaceChildren(frame);
    }
  });

  // Cards: the button's area covers the whole card. The download icon saves the file straight away.
  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-resource]");
    if (!card || event.defaultPrevented || !event.target.closest("[data-preview-open], [data-preview-download]")) return;
    const item = BSS.resourceItem(card.dataset.resource);
    if (!item) return;
    event.preventDefault();
    const from = event.target.closest("button");
    if (!event.target.closest("[data-preview-download]")) {
      open(item, { from });
      return;
    }
    const address = sourceFor(item, "pdf");
    if (!address) {
      open(item, { from, message: MISSING.pdf });
      return;
    }
    const link = document.createElement("a");
    link.href = address;
    link.download = "";
    link.click();
  });

  // Back to this page from the browser's cache with the overlay still open
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && dialog.open) {
      dialog.classList.remove("is-open");
      teardown?.();
      teardown = null;
      finish();
    }
  });

  openFromAddress();
})();
