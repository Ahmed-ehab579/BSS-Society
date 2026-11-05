// Skeleton loading: a photo slot shimmers until its image has really arrived, then the image fades in.
// Images already in the browser's cache skip it, and a failed image leaves the slot's own fallback.
// Styles: css/base.css. New images (Library results, journey cards) are picked up as they are added.
(function () {
  const SLOTS = ".hero__media, .guide-card__media, .new-muslim__photo, .topic-card__bg, .resource-card__media, .resource-card__frame, .book__cover, .journey-card__media, .who__media, .article-hero, .topic-preview";

  function watch(image) {
    const slot = image.parentElement;
    if (!slot || !slot.matches(SLOTS) || image.src.endsWith(".svg") || image.complete) return;
    slot.classList.add("is-skeleton");
    const done = (event) => {
      slot.classList.remove("is-skeleton");
      if (event.type === "load") image.classList.add("is-fading-in");
    };
    image.addEventListener("load", done, { once: true });
    image.addEventListener("error", done, { once: true });
  }

  document.querySelectorAll("img").forEach(watch);

  new MutationObserver((changes) => {
    changes.forEach((change) => change.addedNodes.forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.matches("img")) watch(node);
      node.querySelectorAll("img").forEach(watch);
    }));
  }).observe(document.body, { childList: true, subtree: true });
})();
