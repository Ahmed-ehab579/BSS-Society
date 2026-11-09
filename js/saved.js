// Saved items, shared by every page: books, audio books, videos, articles and New Muslim steps.
// Kept in this browser only (this mockup has no accounts), so every read and write is guarded and the
// pages say so when a save could not be stored. Each entry keeps enough to be listed on any page
// (title, type, picture, link) and the path it belongs to, so the Saved menu can group and label it.
//
// entry = { key, path: "start-here" | "new-muslim" | "library", type, title, label, image, url, savedAt }
(function () {
  const KEY = "bss.saved.v2";
  const OLD_KEY = "bss.saved.v1";   // v1 was a plain list of keys from the book page and the previews
  const PATHS = {
    "start-here": "Start here",
    "new-muslim": "New muslim",
    library: "Library",
  };

  // The one book page so far, so its v1 save can still be listed
  const KNOWN = {
    "beginners-journey": { type: "book", title: "A Beginner’s Journey into Understanding Islam", image: "assets/images/book-beginners-journey.jpg", url: "book.html" },
  };

  let memory = [];
  let saveFailed = false;
  const listeners = new Set();

  const valid = (entry) => entry && typeof entry.key === "string" && PATHS[entry.path];

  function migrate() {
    try {
      const old = JSON.parse(window.localStorage.getItem(OLD_KEY));
      if (!Array.isArray(old)) return null;
      const now = Date.now();
      const list = old.filter((key) => typeof key === "string")
        .map((key, index) => ({ key, path: "library", type: "book", title: "", ...KNOWN[key], savedAt: now - index }));
      window.localStorage.setItem(KEY, JSON.stringify(list));
      window.localStorage.removeItem(OLD_KEY);
      return list;
    } catch (error) {
      return null;
    }
  }

  function read() {
    if (saveFailed) return memory;
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(valid);
      } else {
        const moved = migrate();
        if (moved) return moved;
      }
    } catch (error) { /* storage unavailable: fall back to memory */ }
    return memory;
  }

  // Writes, then reads back to confirm it really was stored (private windows can fail silently)
  function write(list) {
    memory = list;
    const json = JSON.stringify(list);
    try {
      window.localStorage.setItem(KEY, json);
      saveFailed = window.localStorage.getItem(KEY) !== json;
    } catch (error) {
      saveFailed = true;
    }
    listeners.forEach((listener) => listener());
    return !saveFailed;
  }

  // Newest first
  const list = () => read().slice().sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  const has = (key) => read().some((entry) => entry.key === key);

  // Returns true when stored in this browser, false when only kept for this visit
  function add(entry, savedAt = Date.now()) {
    const others = read().filter((item) => item.key !== entry.key);
    return write([...others, { ...entry, savedAt }]);
  }

  function remove(key) {
    return write(read().filter((entry) => entry.key !== key));
  }

  // Saves or unsaves; returns { saved, stored }
  function toggle(entry) {
    if (has(entry.key)) return { saved: false, stored: remove(entry.key) };
    return { saved: true, stored: add(entry) };
  }

  // A page that shows an item refreshes its stored title and picture, in case they changed
  function refresh(entry) {
    const all = read();
    const found = all.find((item) => item.key === entry.key);
    if (!found) return;
    const next = { ...found, ...entry, savedAt: found.savedAt, path: found.path, url: found.url || entry.url };
    if (JSON.stringify(next) === JSON.stringify(found)) return;
    write(all.map((item) => (item.key === entry.key ? next : item)));
  }

  function onChange(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // Another tab saved or removed something
  window.addEventListener("storage", (event) => {
    if (event.key === KEY) listeners.forEach((listener) => listener());
  });

  window.BSS = window.BSS || {};
  window.BSS.saved = { PATHS, list, has, add, remove, toggle, refresh, onChange, failed: () => saveFailed };
})();
