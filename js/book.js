// Book details page: share, save on this device, download and listen, and the soft reveal on scroll.
(function () {
  const BSS = window.BSS;
  const book = document.querySelector("[data-book]");
  if (!book) return;

  const NOTE_TIME = 2400;   // ms a confirmation stays up
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

  // Save: kept in this browser until accounts exist (js/saved.js)
  const entry = () => ({
    key: id, path: "library", type: "book",
    title: book.querySelector(".book__title").textContent.trim(),
    image: book.querySelector("img").getAttribute("src"),
    url: "book.html",
  });

  const showSaved = () => saveButton.setAttribute("aria-pressed", String(BSS.saved.has(id)));

  saveButton.addEventListener("click", () => {
    const { saved, stored } = BSS.saved.toggle(entry());
    showSaved();
    saveButton.classList.remove("is-popping");
    saveButton.getBoundingClientRect();   // restart the animation on quick repeat presses
    saveButton.classList.add("is-popping");
    if (!stored) say("Couldn’t save on this device", saveButton);
    else say(saved ? "Saved" : "Removed from saved", saveButton);
  });

  showSaved();
  BSS.saved.refresh(entry());
  BSS.saved.onChange(showSaved);   // also when saved or removed in another tab

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
      if (kind === "download" && !window.BSSDownload.play(button)) return;
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
