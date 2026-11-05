// Book details page: share, save on this device, download and listen, and the soft reveal on scroll.
(function () {
  const book = document.querySelector("[data-book]");
  if (!book) return;

  const NOTE_TIME = 2400;   // ms a confirmation stays up
  const SAVED_KEY = "bss.saved.v1";
  const id = book.dataset.book;
  const note = book.querySelector("[data-book-note]");
  const shareButton = book.querySelector("[data-book-share]");
  const saveButton = book.querySelector("[data-book-save]");
  const unavailable = book.querySelector("[data-book-unavailable]");
  let noteTimer;

  // A short message beside the button that was pressed
  function say(message, button) {
    note.style.setProperty("--note-top", `${button.offsetTop}px`);
    note.textContent = message;
    note.classList.add("is-visible");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => note.classList.remove("is-visible"), NOTE_TIME);
  }

  // Share: the phone's own share sheet where there is one, otherwise copy the link
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(location.href);
      say("Link copied", shareButton);
    } catch (error) {
      say("Couldn’t copy. Use the address bar", shareButton);
    }
  }

  shareButton.addEventListener("click", async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: location.href });
      } catch (error) {
        if (error.name !== "AbortError") copyLink();   // closing the share sheet is not a failure
      }
      return;
    }
    copyLink();
  });

  // Save: kept in this browser until accounts exist
  function readSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  const showSaved = (saved) => saveButton.setAttribute("aria-pressed", String(saved));

  saveButton.addEventListener("click", () => {
    const saved = readSaved();
    const next = saved.includes(id) ? saved.filter((item) => item !== id) : [...saved, id];
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    } catch (error) {
      say("Couldn’t save on this device", saveButton);
      return;
    }
    const isSaved = next.includes(id);
    showSaved(isSaved);
    saveButton.classList.remove("is-popping");
    saveButton.getBoundingClientRect();   // restart the animation on quick repeat presses
    saveButton.classList.add("is-popping");
    say(isSaved ? "Saved" : "Removed from saved", saveButton);
  });

  showSaved(readSaved().includes(id));
  // The same book saved or removed in another tab
  window.addEventListener("storage", (event) => {
    if (event.key === SAVED_KEY) showSaved(readSaved().includes(id));
  });

  // Download and listen: nothing pretends to work until the buttons have a real address
  const MISSING = {
    download: "The PDF isn’t available yet. It will be here to download soon.",
    listen: "The audio isn’t available yet. It will be here to listen to soon.",
  };

  book.querySelectorAll("[data-book-link]").forEach((button) => {
    button.addEventListener("click", () => {
      const { bookLink: kind, src } = button.dataset;
      if (!src) {
        unavailable.textContent = MISSING[kind];
        unavailable.classList.add("is-visible");
        return;
      }
      unavailable.classList.remove("is-visible");
      const link = document.createElement("a");
      link.href = src;
      if (kind === "download") link.download = "";
      else {
        link.target = "_blank";
        link.rel = "noopener";
      }
      link.click();
    });
  });

  // Soft reveal for what starts below the fold
  const reveals = [...document.querySelectorAll("[data-reveal], .resources")];
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px" });

    reveals.forEach((element) => {
      element.classList.add("will-reveal");
      observer.observe(element);
    });
  }
})();
