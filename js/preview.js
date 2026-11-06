// Material previews: pressing a book, audio book or video card opens an overlay with what someone needs
// to decide, in the book details layout (css/book.css, css/preview.css). 90% of the screen on desktop, the
// full screen on phones. Articles have no preview: their card opens the article. The overlay has its own
// address (#preview=...), so it can be shared, and the phone's back gesture closes it.
(function () {
  const BSS = window.BSS;
  if (!BSS || !BSS.resourceItem) return;

  // Sample content, shared by every card for now. An item can carry its own pdf, tracks, soundcloud or
  // youtube. An audio book is a list of tracks: `length` is in seconds, so the list can show each track's
  // time and the total before anything has loaded.
  const SAMPLES = {
    pdf: "assets/samples/book-sample.pdf",
    pdfSize: "87 KB",
    tracks: [
      { title: "Introduction", src: "assets/samples/audio-sample.mp3", length: 38 },
      { title: "Chapter 1", src: "assets/samples/audio-sample.mp3", length: 38 },
      { title: "Chapter 2", src: "assets/samples/audio-sample.mp3", length: 38 },
      { title: "Chapter 3", src: "assets/samples/audio-sample.mp3", length: 38 },
      { title: "Closing words", src: "assets/samples/audio-sample.mp3", length: 38 },
    ],
    soundcloud: "https://soundcloud.com/theoasisinitiative/sets/famous-women-in-islam",
    youtube: "https://www.youtube.com/watch?v=O-3_Cki7QmY",
  };

  const SAVED_KEY = "bss.saved.v1";
  const PLACE_KEY = "bss.audio.place.v1";   // where each audio book was left, to carry on from there
  const RESTART_NEAR_START = 3;  // seconds into a track after which "previous" restarts it first
  const NOTE_TIME = 2400;      // ms a confirmation stays up
  const CLOSE_TIME = 260;      // ms, matches css/preview.css
  const VIDEO_WAIT = 5000;     // ms a press waits for the video before showing YouTube's own player
  const SKIP = 15;             // seconds the skip buttons and lock-screen controls move
  const SPEEDS = [1, 1.25, 1.5, 2];
  const TOPICS = { belief: "Belief & Faith", quran: "The Qur’an", prophet: "Prophet Muhammad", women: "Women in Islam", life: "Life & Questions" };
  const MISSING = {
    pdf: "The PDF isn’t available yet. It will be here to download soon.",
    tracks: "The audio isn’t available yet. It will be here to listen to soon.",
    soundcloud: "The SoundCloud link isn’t available yet.",
    youtube: "The video isn’t available yet. It will be here to watch soon.",
  };
  const AUTHOR = "Shaykh Dr. Tariq Al-Hashimi";   // sample, until each item carries its own author
  const OUTCOMES = [
    "A clear picture of the topic’s main ideas",
    "Confidence to explain them in your own words",
    "Answers to the questions people ask most",
    "A trusted next step for going deeper",
  ];
  // Sample text after each item's own description, until each item carries its full summary
  const MORE_SUMMARY = {
    book: "Written in plain language and built around short chapters, it takes you from the first questions to a confident understanding, one idea at a time. Each chapter ends with key points to remember, so you can stop and return whenever you need to.",
    audio: "Told in a calm voice and divided into short chapters, it fits easily into a walk, a commute or a quiet moment. Listen straight through, or go directly to the chapter you need and carry on later from where you stopped.",
    video: "Using simple examples and clear explanations, it gives you a solid starting point in a short time. It needs no background knowledge, and it works well on its own or as an introduction before reading further.",
  };
  const RELATED_COUNT = 6;

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
        <button class="preview__close" type="button" data-preview-close aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
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
  let depth = 0;            // history entries these previews added
  let leaving = false;
  let stopRelated = null;   // stops the related row's timer
  let closeTimer = null;
  let noteTimer = null;
  let teardown = null;      // stops the audio when the overlay closes

  const sourceFor = (item, key) => item[key] || SAMPLES[key] || "";

  // An address opens as a link; without one the button explains instead of pretending
  function linkHtml(item, kind, className, inner, newTab = false) {
    const address = sourceFor(item, kind);
    if (!address) return `<button class="${className}" type="button" data-preview-missing="${kind}">${inner}</button>`;
    const how = kind === "pdf" && !newTab ? "download" : 'target="_blank" rel="noopener"';
    return `<a class="${className}" href="${escape(address)}" ${how}>${inner}</a>`;
  }

  function downloadHtml(item) {
    const size = sourceFor(item, "pdf") && SAMPLES.pdfSize ? ` <span class="book__size">(${escape(SAMPLES.pdfSize)})</span>` : "";
    return linkHtml(item, "pdf", "btn btn--regular btn--primary download-fill",
      `<span class="download-icon"><img class="book__download" src="assets/icons/download.svg" width="16" height="16" alt="">${window.BSSDownload.CHECK_ICON}</span>Download PDF${size}`);
  }

  function detailsHtml(item, type, cta, extra = "") {
    const topic = TOPICS[item.category];
    return `<div class="book__details">
      <header class="book__head">
        <p class="book__tag">${escape(type.badge)}${topic ? ` · ${escape(topic)}` : ""}</p>
        <h2 class="book__title" id="preview-title" dir="${item.dir || "auto"}">${escape(item.title)}</h2>
        <p class="book__author">By ${escape(item.author || AUTHOR)}</p>
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
        ${item.dir === "rtl" ? "" : `<p class="book__summary">${MORE_SUMMARY[item.format]}</p>`}
      </section>
      ${extra}
      <div class="book__cta">${cta}<p class="book__unavailable" role="status"></p></div>
    </div>`;
  }

  function coverHtml(item) {
    return `<figure class="book__cover">
      <img src="${escape(item.image)}" alt="" onerror="this.parentElement.classList.add('is-missing')">
      <figcaption class="book__cover-fallback" aria-hidden="true">${escape(item.title)}</figcaption>
    </figure>`;
  }

  // One heading for every format: the list is the same promise, however the material is taken in
  function outcomesHtml() {
    return `<section class="book__section">
      <h3 class="book__heading">What you’ll gain</h3>
      <ul class="book__audience">${OUTCOMES.map((line) => `<li>${line}</li>`).join("")}</ul>
    </section>`;
  }

  function bookHtml(item, type) {
    const cta = downloadHtml(item) + linkHtml(item, "pdf", "btn btn--regular btn--secondary", "Read sample", true);
    return `<article class="book">${coverHtml(item)}${detailsHtml(item, type, cta, outcomesHtml())}</article>`;
  }

  function audioHtml(item, type) {
    const tracks = sourceFor(item, "tracks") || [];
    const icon = (path) => `<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">${path}</svg>`;
    const player = `<div class="preview__media">
      ${coverHtml(item)}
      <div class="player${tracks.length ? "" : " is-empty"}" data-player>
        <div class="player__top">
          <p class="player__now" data-player-now aria-live="polite"></p>
          <button class="player__speed" type="button" data-player-speed aria-label="Playback speed: normal">1×</button>
        </div>
        <input class="player__seek" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek">
        <div class="player__times">
          <span data-player-time>0:00</span>
          <span class="player__length" data-player-length>--:--</span>
        </div>
        <div class="player__controls">
          <button class="player__step" type="button" data-player-step="-1" aria-label="Previous chapter">
            ${icon('<path d="M6 5a1 1 0 0 1 2 0v5.700l9.500-6.300A1 1 0 0 1 19 5.200v13.600a1 1 0 0 1-1.500.8L8 13.300V19a1 1 0 0 1-2 0V5Z"/>')}
          </button>
          <button class="player__skip" type="button" data-player-skip="-${SKIP}" aria-label="Back ${SKIP} seconds">
            <span aria-hidden="true">${SKIP}</span>${icon('<path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8Z"/>')}
          </button>
          <button class="player__play" type="button" data-player-play aria-label="Play">
            ${icon('<path class="player__icon-play" d="M8 5.500v13a1 1 0 0 0 1.500.86l11-6.500a1 1 0 0 0 0-1.720l-11-6.500A1 1 0 0 0 8 5.500Z"/><path class="player__icon-pause" d="M7 5h3.500a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm6.500 0H17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-3.500a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>')}
          </button>
          <button class="player__skip" type="button" data-player-skip="${SKIP}" aria-label="Forward ${SKIP} seconds">
            <span aria-hidden="true">${SKIP}</span>${icon('<path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8Z"/>')}
          </button>
          <button class="player__step" type="button" data-player-step="1" aria-label="Next chapter">
            ${icon('<path d="M18 5a1 1 0 1 0-2 0v5.700L6.500 4.400A1 1 0 0 0 5 5.200v13.600a1 1 0 0 0 1.500.8L16 13.300V19a1 1 0 1 0 2 0V5Z"/>')}
          </button>
        </div>
        <audio preload="metadata" playsinline></audio>
      </div>
    </div>`;
    const chapters = tracks.length ? `<section class="book__section">
      <h3 class="book__heading">Chapters <span class="tracks__count">${tracks.length}</span></h3>
      <ol class="tracks">${tracks.map((track, index) => `<li>
        <button class="tracks__row" type="button" data-track="${index}">
          <span class="tracks__number"><span>${index + 1}</span><i class="tracks__bars" aria-hidden="true"><b></b><b></b><b></b></i></span>
          <span class="tracks__title">${escape(track.title)}</span>
          <span class="tracks__time">${formatTime(track.length)}</span>
        </button>
      </li>`).join("")}</ol>
    </section>` : "";
    const cta = downloadHtml(item) + linkHtml(item, "soundcloud", "btn btn--regular btn--secondary",
      '<img src="assets/icons/soundcloud.svg" width="30" height="30" alt="">Listen on SoundCloud');
    return `<article class="book">${player}${detailsHtml(item, type, cta, outcomesHtml() + chapters)}</article>`;
  }

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
    return `<article class="book">${media}${detailsHtml(item, type, cta, outcomesHtml())}</article>`;
  }

  // ---- The video ---------------------------------------------------------------------------------

  let youtubeApi = null;

  function loadYouTubeApi() {
    youtubeApi ||= new Promise((resolve, reject) => {
      window.onYouTubeIframeAPIReady = () => resolve(window.YT);
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.onerror = () => {
        youtubeApi = null;
        reject();
      };
      document.head.append(script);
    });
    return youtubeApi;
  }

  // YouTube's player loads with the overlay, hidden under our picture and play button. Once it's ready, a
  // click goes through the picture to YouTube's own play button: browsers only trust a press made inside
  // the player, so that is what starts the video first time, with no black screen while it loads. A press
  // before it's ready, or from the keyboard, asks the player to start, and the picture lifts either way.
  function setUpVideo(item) {
    const box = scroller.querySelector("[data-video]");
    const id = box && youtubeId(sourceFor(item, "youtube"));
    if (!id) return;
    let player = null;
    let ready = false;
    let wanted = false;
    let waitTimer = null;

    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}`;
    frame.title = item.title;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.referrerPolicy = "strict-origin-when-cross-origin";   // YouTube refuses to play without it
    box.prepend(frame);

    const lift = () => {
      clearTimeout(waitTimer);
      box.classList.remove("is-waiting");
      box.classList.add("is-playing");
    };

    box.querySelector("[data-video-play]").addEventListener("click", () => {
      wanted = true;
      box.classList.add("is-waiting");
      if (ready) player.playVideo();
      clearTimeout(waitTimer);
      waitTimer = setTimeout(lift, VIDEO_WAIT);
    });

    loadYouTubeApi().then((YT) => {
      if (!frame.isConnected) return;
      player = new YT.Player(frame, {
        events: {
          onReady() {
            ready = true;
            box.classList.add("is-ready");
            if (wanted) player.playVideo();
          },
          onStateChange({ data }) {
            if (data === YT.PlayerState.PLAYING || data === YT.PlayerState.BUFFERING) lift();
          },
        },
      });
    }).catch(lift);   // no script from YouTube: its own player, in the frame, still works

    teardown = () => {
      clearTimeout(waitTimer);
      player?.destroy?.();
    };
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

  function readPlaces() {
    try {
      return JSON.parse(localStorage.getItem(PLACE_KEY)) || {};
    } catch (error) {
      return {};
    }
  }

  function setUpPlayer(item) {
    const box = scroller.querySelector("[data-player]");
    if (!box) return;
    const audio = box.querySelector("audio");
    const seek = box.querySelector(".player__seek");
    const time = box.querySelector("[data-player-time]");
    const length = box.querySelector("[data-player-length]");
    const now = box.querySelector("[data-player-now]");
    const play = box.querySelector("[data-player-play]");
    const speed = box.querySelector("[data-player-speed]");
    const rows = [...scroller.querySelectorAll("[data-track]")];
    const tracks = sourceFor(item, "tracks") || [];
    let index = 0;
    let dragging = false;
    let speedIndex = 0;
    let resumeAt = 0;
    let lastSaved = 0;
    let active = true;       // clearing the player on close must not overwrite the saved place

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

    function showLockScreenTrack() {
      if (!("mediaSession" in navigator)) return;
      const art = new URL(item.image, location.href).href;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: tracks[index].title,
        artist: "Best Speech Society",
        album: item.title,
        artwork: [{ src: art, sizes: "512x512" }],
      });
    }

    function savePlace() {
      if (!active) return;
      const places = readPlaces();
      places[item.key] = { track: index, time: Math.floor(audio.currentTime) };
      try {
        localStorage.setItem(PLACE_KEY, JSON.stringify(places));
      } catch (error) { /* storage unavailable: it simply starts from the top next time */ }
    }

    // Puts a track in the player. Its speed carries over, so a chosen pace stays through the book.
    function load(next, { startAt = 0, autoplay = false } = {}) {
      index = next;
      resumeAt = startAt;
      audio.src = tracks[index].src;
      audio.playbackRate = SPEEDS[speedIndex];
      seek.value = 0;
      now.textContent = `${index + 1} of ${tracks.length} · ${tracks[index].title}`;
      length.textContent = formatTime(tracks[index].length);
      showPosition();
      time.textContent = formatTime(startAt);
      rows.forEach((row, rowIndex) => {
        if (rowIndex === index) row.setAttribute("aria-current", "true");
        else row.removeAttribute("aria-current");
      });
      box.querySelector('[data-player-step="-1"]').disabled = false;
      box.querySelector('[data-player-step="1"]').disabled = index === tracks.length - 1;
      showLockScreenTrack();
      if (autoplay) start();
    }

    function start() {
      audio.play().catch(() => showNote("The audio couldn’t start. Please try again."));
    }

    function skip(by) {
      audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + by));
    }

    function nextTrack() {
      if (index < tracks.length - 1) load(index + 1, { autoplay: !audio.paused });
    }

    // Like every audio player: "previous" restarts the track, and goes back only from its first seconds
    function previousTrack() {
      if (audio.currentTime > RESTART_NEAR_START || index === 0) audio.currentTime = 0;
      else load(index - 1, { autoplay: !audio.paused });
    }

    const needsAudio = (action) => () => {
      if (tracks.length) action();
      else showNote(MISSING.tracks);
    };

    play.addEventListener("click", needsAudio(() => {
      if (audio.paused) start();
      else audio.pause();
    }));

    box.querySelectorAll("[data-player-skip]").forEach((button) => button.addEventListener("click", needsAudio(() => {
      skip(Number(button.dataset.playerSkip));
    })));

    box.querySelector('[data-player-step="-1"]').addEventListener("click", needsAudio(previousTrack));
    box.querySelector('[data-player-step="1"]').addEventListener("click", needsAudio(nextTrack));

    rows.forEach((row, rowIndex) => row.addEventListener("click", () => {
      if (rowIndex !== index) load(rowIndex, { autoplay: true });
      else if (audio.paused) start();
      else audio.pause();
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
      if (resumeAt && resumeAt < audio.duration - 1) audio.currentTime = resumeAt;
      resumeAt = 0;
      showPosition();
    });
    audio.addEventListener("timeupdate", () => {
      showPosition();
      if (Math.abs(audio.currentTime - lastSaved) > 5) {
        lastSaved = audio.currentTime;
        savePlace();
      }
    });
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
    audio.addEventListener("pause", () => {
      setPlaying(false);
      savePlace();
    });

    // The next chapter follows by itself; the last one ends back at the start of the book
    audio.addEventListener("ended", () => {
      if (index < tracks.length - 1) {
        load(index + 1, { autoplay: true });
        return;
      }
      setPlaying(false);
      load(0);
      savePlace();
    });

    const handlers = {
      play: start,
      pause: () => audio.pause(),
      seekbackward: (event) => skip(-(event.seekOffset || SKIP)),
      seekforward: (event) => skip(event.seekOffset || SKIP),
      seekto: (event) => { audio.currentTime = event.seekTime; },
      previoustrack: previousTrack,
      nexttrack: nextTrack,
    };

    if (tracks.length) {
      if ("mediaSession" in navigator) {
        Object.entries(handlers).forEach(([action, handler]) => navigator.mediaSession.setActionHandler(action, handler));
      }
      const place = readPlaces()[item.key];
      const known = place && tracks[place.track];
      load(known ? place.track : 0, { startAt: known ? place.time : 0 });
    }

    teardown = () => {
      if (tracks.length) savePlace();
      active = false;
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.metadata = null;
      Object.keys(handlers).forEach((action) => navigator.mediaSession.setActionHandler(action, null));
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

  // Same topic first, then the other materials; articles open their own page from here
  function relatedHtml(item) {
    const others = BSS.resourceItems().filter((other) => other.key !== item.key && (other.dir || "auto") === (item.dir || "auto"));
    const sameTopic = others.filter((other) => other.category && other.category === item.category);
    const picks = [...sameTopic, ...others.filter((other) => !sameTopic.includes(other))].slice(0, RELATED_COUNT);
    if (picks.length < 3) return "";
    return `<section class="preview__related" aria-labelledby="preview-related">
      <h3 class="preview__related-heading" id="preview-related">Related materials</h3>
      <div class="carousel" data-carousel role="region" aria-roledescription="carousel" aria-label="Related materials">
        <div class="carousel__controls">
          <button class="icon-btn icon-btn--prev" type="button" data-carousel-prev aria-label="Previous material">
            <img src="assets/icons/arrow-right.svg" width="28" height="28" alt="">
          </button>
          <button class="icon-btn" type="button" data-carousel-next aria-label="Next material">
            <img src="assets/icons/arrow-right.svg" width="28" height="28" alt="">
          </button>
        </div>
        <div class="carousel__viewport">
          <ul class="carousel__track">${picks.map(BSS.resourceCardHtml).join("")}</ul>
        </div>
        <div class="carousel__bar">
          <button class="carousel__toggle" type="button" data-carousel-toggle data-state="playing" aria-label="Pause carousel">
            <img src="assets/icons/carousel-pause.svg" width="20" height="20" alt="" data-icon="pause">
            <img src="assets/icons/carousel-play.svg" width="20" height="20" alt="" data-icon="play">
            <img src="assets/icons/carousel-replay.svg" width="20" height="20" alt="" data-icon="replay">
          </button>
          <div class="carousel__dots" role="group" aria-label="Choose a card" data-carousel-dots></div>
        </div>
      </div>
    </section>`;
  }

  function clearContent() {
    teardown?.();
    teardown = null;
    stopRelated?.();
    stopRelated = null;
  }

  function show(item, message) {
    clearContent();
    const type = BSS.RESOURCE_TYPES[item.format];
    current = item;
    dialog.classList.remove("preview--book", "preview--audio", "preview--video");
    dialog.classList.add(`preview--${item.format}`);
    scroller.innerHTML = { book: bookHtml, audio: audioHtml, video: videoHtml }[item.format](item, type) + relatedHtml(item);
    scroller.scrollTop = 0;
    scroller.querySelector("[data-preview-save]").setAttribute("aria-pressed", String(readSaved().includes(item.key)));
    setUpPlayer(item);
    setUpVideo(item);
    const row = scroller.querySelector("[data-carousel]");
    if (row) stopRelated = BSS.startCarousel(row);
    if (message) showNote(message);
  }

  function remember(item) {
    history.pushState({ preview: item.key }, "", `#preview=${item.key}`);
    depth += 1;
  }

  function open(item, { from = null, address = true, message = "" } = {}) {
    clearTimeout(closeTimer);
    if (address) remember(item);
    if (dialog.open) {
      show(item, message);            // a related card: the overlay stays, its content changes
      sheet.focus({ preventScroll: true });
      return;
    }
    opener = from;
    show(item, message);
    root.classList.add("is-sheet-open");
    dialog.showModal();
    scroller.scrollTop = 0;          // a closed dialog can't scroll, so this has to wait until it's open
    sheet.focus({ preventScroll: true });
    sheet.getBoundingClientRect();   // start from the closed position
    dialog.classList.add("is-open");
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
    clearContent();
    closeTimer = setTimeout(finish, reduceMotion.matches ? 0 : CLOSE_TIME);
  }

  const addressItem = () => {
    const found = /^#preview=(\w+)$/.exec(location.hash);
    return found && BSS.resourceItem(found[1]);
  };

  // Back arrow, close icon, Esc and the backdrop all return to where the visitor was before any preview
  function leave() {
    if (depth) {
      leaving = true;
      history.go(-depth);
      return;
    }
    history.replaceState(null, "", location.pathname + location.search);
    close();
  }

  // The browser's back button steps back through the previews opened from related cards
  window.addEventListener("popstate", () => {
    depth = Math.max(0, depth - 1);
    const item = addressItem();
    if (leaving) {
      leaving = false;
      depth = 0;
      if (item) history.replaceState(null, "", location.pathname + location.search);
      close();
    } else if (!item) close();
    else open(item, { address: false });
  });

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
    else if (target.closest("[data-video-play]") && !youtubeId(sourceFor(current, "youtube"))) showNote(MISSING.youtube);
    else if (target.closest("a.download-fill") && !window.BSSDownload.play(target.closest("a"))) event.preventDefault();
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
    if (!window.BSSDownload.play(event.target.closest("[data-preview-download]"))) return;
    const link = document.createElement("a");
    link.href = address;
    link.download = "";
    link.click();
  });

  // Back to this page from the browser's cache with the overlay still open
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && dialog.open) {
      dialog.classList.remove("is-open");
      clearContent();
      finish();
    }
  });

  const linked = addressItem();
  if (linked) open(linked, { address: false });
})();
