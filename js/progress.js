// Journey progress shared by the Start Here and article pages.
// State lives in localStorage (this mockup has no accounts); every read and write is guarded
// so the pages still work, for the current visit only, when storage is blocked.
(function () {
  const KEY = "bss.journey.v1";
  const START_PCT = 12;   // reading further than this marks a topic "in progress"

  // Photos come from the project's own assets; `focus` is the object-position used when the photo is
  // cropped to the card.
  const TOPICS = [
    { id: 1, title: "Deep questions, clear answers", image: "assets/images/topic-life.jpg", imageSize: [512, 286], focus: "50% 40%",
      text: "Start with the questions people ask most, and find simple, honest answers without any pressure." },
    { id: 2, title: "Answers that build understanding", image: "assets/images/article-resource-1.jpg", imageSize: [736, 1240], focus: "50% 72%",
      text: "See how each answer connects to the next, so the ideas make sense together and not in pieces." },
    { id: 3, title: "Exploring the bigger picture", image: "assets/images/article-resource-3.jpg", imageSize: [736, 916], focus: "50% 82%",
      text: "Step back and look at the purpose, meaning and direction that all the smaller details belong to." },
    { id: 4, title: "Understanding the heart and mind", image: "assets/images/topic-women.jpg", imageSize: [736, 1104], focus: "50% 58%",
      text: "Explore how faith speaks to both reason and feeling, and why each of them matters on the journey." },
    { id: 5, title: "Questions that come next", image: "assets/images/article-resource-4.jpg", imageSize: [736, 1308], focus: "50% 50%",
      text: "Meet the deeper questions that naturally follow, and learn to hold them with patience and calm." },
    { id: 6, title: "Communicating with care", image: "assets/images/new-muslim.jpg", imageSize: [688, 1024], focus: "50% 62%",
      text: "Learn to share and discuss what you have learned with kindness, clarity and respect for others." },
  ];

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

  // status: not-started | in-progress | completed. A topic is unlocked when all earlier ones are
  // completed, or when the reader unlocks it on purpose.
  function info(id) {
    const topics = read().topics;
    const topic = topics[id] || {};
    const status = topic.status || "not-started";
    // Strict order: every earlier topic must be completed, not only the one just before.
    const previousDone = TOPICS.every((other) => other.id >= id || (topics[other.id] && topics[other.id].status === "completed"));
    return {
      id,
      status,
      pct: topic.pct || 0,
      // Its turn has come: every earlier topic is completed.
      inSequence: Boolean(previousDone),
      // Open to read: its turn has come, or the reader unlocked it on purpose ("Unlock this article anyway").
      // Completing a topic out of order never opens the next one: that still needs all earlier topics.
      unlocked: Boolean(previousDone || topic.manual),
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
    // Opening a topic marks it in progress straight away (never touches a completed one).
    start(id) {
      if (info(id).status === "not-started") update(id, { status: "in-progress", pct: 0 });
    },
    unlock: (id) => update(id, { manual: true }),
    // Only a topic whose turn has come can be completed; reading ahead is saved as progress only.
    complete(id) {
      if (!info(id).unlocked) return;
      update(id, { status: "completed", pct: 100, completedAt: Date.now() });
    },
    markUnread: (id) => update(id, { status: "not-started", pct: 0, completedAt: null }),
    // The one card to point the reader at: first unlocked topic that is not completed yet.
    recommended() {
      const topics = all();
      const next = topics.find((topic) => topic.unlocked && topic.status !== "completed");
      if (!next) return null;
      const label = next.status === "in-progress" ? "Continue" : "Start here";
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
