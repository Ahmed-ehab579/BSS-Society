// Journey progress shared by the Start Here and article pages.
// State lives in localStorage (this mockup has no accounts); every read and write is guarded
// so the pages still work, for the current visit only, when storage is blocked.
(function () {
  const KEY = "bss.journey.v1";
  const START_PCT = 12;   // reading further than this marks a topic "in progress"

  const TOPICS = [
    { id: 1, title: "Deep questions, clear answers", image: "assets/images/journey-mosque.jpg", imageSize: [620, 930],
      text: "You do not need to know everything to begin. Start with a simple, thoughtful introduction." },
    { id: 2, title: "Answers that build understanding" },
    { id: 3, title: "Exploring the bigger picture" },
    { id: 4, title: "Understanding the heart and mind" },
    { id: 5, title: "Questions that come next" },
    { id: 6, title: "Communicating with care" },
  ].map((topic) => ({
    image: "assets/images/journey-desert.jpg",
    imageSize: [620, 772],
    text: "You do not need to know everything to begin. Explore a simple, thoughtful starting point",
    ...topic,
  }));

  let memory = { topics: {} };
  let saveFailed = false;   // true when the last write could not be stored in this browser
  const listeners = new Set();

  function read() {
    if (saveFailed) return memory;   // storage is not trustworthy: use what this visit has done
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.topics === "object") return parsed;
      }
    } catch (error) { /* storage unavailable: fall back to memory */ }
    return memory;
  }

  // Writes, then reads back to confirm it really was stored (private windows and full or blocked
  // storage fail silently in some browsers). The pages use saveFailed to say so, not to pretend.
  function write(state) {
    memory = state;
    const json = JSON.stringify(state);
    try {
      window.localStorage.setItem(KEY, json);
      saveFailed = window.localStorage.getItem(KEY) !== json;
    } catch (error) {
      saveFailed = true;
    }
    listeners.forEach((listener) => listener());
  }

  function probeStorage() {
    try {
      const probe = `${KEY}.probe`;
      window.localStorage.setItem(probe, "1");
      const ok = window.localStorage.getItem(probe) === "1";
      window.localStorage.removeItem(probe);
      return ok;
    } catch (error) {
      return false;
    }
  }
  saveFailed = !probeStorage();

  function update(id, change) {
    const state = read();
    const topics = { ...state.topics };
    topics[id] = { ...(topics[id] || {}), ...change };
    write({ ...state, topics });
  }

  // status: not-started | in-progress | completed. A topic is unlocked when the previous one is
  // completed, when the reader opened it on purpose ("Read this topic anyway"), or once started.
  function info(id) {
    const topics = read().topics;
    const topic = topics[id] || {};
    const status = topic.status || "not-started";
    const previousDone = id === 1 || (topics[id - 1] && topics[id - 1].status === "completed");
    return {
      id,
      status,
      pct: topic.pct || 0,
      unlocked: Boolean(previousDone || topic.manual || status !== "not-started"),
    };
  }

  const all = () => TOPICS.map((topic) => ({ ...topic, ...info(topic.id) }));

  window.BSSProgress = {
    TOPICS,
    START_PCT,
    info,
    all,
    // false when progress cannot be stored in this browser (it then only lasts for this visit)
    canSave: () => !saveFailed,
    topic: (id) => TOPICS.find((topic) => topic.id === id),
    // Only ever moves forward, and never downgrades a completed topic.
    setProgress(id, pct) {
      const current = info(id);
      if (current.status === "completed" || pct < START_PCT || pct <= current.pct) return;
      update(id, { status: "in-progress", pct: Math.round(pct) });
    },
    complete: (id) => update(id, { status: "completed", pct: 100, completedAt: Date.now() }),
    markUnread: (id) => update(id, { status: "not-started", pct: 0, completedAt: null }),
    unlock: (id) => update(id, { manual: true }),
    // The one card to point the reader at: first unlocked topic that is not completed yet.
    recommended() {
      const topics = all();
      const next = topics.find((topic) => topic.unlocked && topic.status !== "completed");
      if (!next) return null;
      const anyStarted = topics.some((topic) => topic.status !== "not-started");
      const label = next.status === "in-progress" ? "Continue" : anyStarted ? "Start with this card" : "";   // no label on a fresh path
      return { id: next.id, label };
    },
    onChange(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };

  // Other tabs, and pages restored from the back/forward cache, pick up the latest state.
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) listeners.forEach((listener) => listener());
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) listeners.forEach((listener) => listener());
  });
})();
