// Resource card markup (Figma 984:2777), shared by the Library and the New Muslim step pages.
// Styles: css/resource-card.css. An item is { title, text, format, image, focus, dir }.
(function () {
  // The one article so far; "from" gives the page its way back to the Library
  const ARTICLE_URL = "article.html?topic=1&amp;from=library";

  // One entry per material type (Figma 984:2777): badge text and icon, action label, how the media is
  // shown ("photo" fills the frame, "book" sits on a light board) and the icon laid over it.
  const TYPES = {
    book: { badge: "Book", icon: "assets/icons/badge-book.svg", iconSize: [10.5322, 10.97], action: "Preview", media: "book" },
    audio: { badge: "Audio book", icon: "assets/icons/badge-audio.svg", iconSize: [15.303, 12.7575], action: "Listen", media: "book", overlay: "audio" },
    article: { badge: "Article", icon: "assets/icons/badge-article.svg", iconSize: [10.5322, 10.97], action: "Read article", media: "photo" },
    video: { badge: "Video", icon: "assets/icons/badge-video.svg", iconSize: [10.5325, 10.9704], action: "Watch", media: "photo", overlay: "play" },
  };

  const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Every card can find its item again: js/preview.js opens the overlay from this key
  const items = new Map();

  function register(item) {
    const text = `${item.format}:${item.title}`;
    let hash = 0;
    for (const char of text) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    item.key = hash.toString(36);
    items.set(item.key, item);
    return item.key;
  }

  const ARROW = `<span class="btn__arrow-clip" aria-hidden="true">
              <span class="btn__arrow-track">
                <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
              </span>
            </span>`;
  const DOWNLOAD_ICON = '<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3v10m0 0 4-4m-4 4L6 9M3.500 16.500h13"/></svg>';

  // Articles open the article page. The others open a preview (js/preview.js); books add a quick download.
  function actionsHtml(item, type, title) {
    const label = `aria-label="${type.action}: ${title}"`;
    if (item.format === "article") {
      return `<a class="btn btn--primary resource-card__action" href="${ARTICLE_URL}" ${label}>${type.action}${ARROW}</a>`;
    }
    const open = `<button class="btn btn--primary resource-card__action" type="button" data-preview-open ${label}>${type.action}${ARROW}</button>`;
    if (item.format !== "book") return open;
    return `<div class="resource-card__actions">${open}<button class="resource-card__download" type="button" data-preview-download aria-label="Download PDF: ${title}">${DOWNLOAD_ICON}</button></div>`;
  }

  function resourceCardHtml(item) {
    const type = TYPES[item.format];
    const key = register(item);
    const picture = type.media === "book"
      ? `<img class="resource-card__book" src="${item.image}" alt="" loading="lazy" decoding="async" onerror="this.hidden = true">`
      : `<img class="resource-card__photo" src="${item.image}" alt="" loading="lazy" decoding="async"
          style="object-position: ${item.focus}" onerror="this.hidden = true">`;
    const overlay = {
      play: `<img class="resource-card__play" src="assets/icons/media-play-lg.svg" width="112.864" height="112.864" alt="">`,
      audio: `<span class="resource-card__listen"><img src="assets/icons/media-audio-book.svg" width="35" height="35" alt=""></span>`,
    }[type.overlay] || "";
    return `
      <li class="resource-card resource-card--${item.format}" data-resource="${key}">
        <div class="resource-card__media">
          <div class="resource-card__frame resource-card__frame--${type.media}">
            ${picture}
            ${overlay}
            <span class="resource-card__badge">
              <img src="${type.icon}" width="${type.iconSize[0]}" height="${type.iconSize[1]}" alt="">${type.badge}
            </span>
          </div>
        </div>
        <div class="resource-card__body">
          <div class="resource-card__text">
            <span class="resource-card__type" aria-hidden="true">
              <img src="${type.icon}" width="${type.iconSize[0]}" height="${type.iconSize[1]}" alt="">${type.badge}
            </span>
            <h4 class="resource-card__title" dir="${item.dir}">${escape(item.title)}</h4>
            <p class="resource-card__desc" dir="${item.dir}">${escape(item.text)}</p>
          </div>
          ${actionsHtml(item, type, escape(item.title))}
        </div>
      </li>`;
  }

  window.BSS = window.BSS || {};
  window.BSS.RESOURCE_TYPES = TYPES;
  window.BSS.resourceCardHtml = resourceCardHtml;
  window.BSS.registerResources = (list) => list.forEach(register);
  window.BSS.resourceItem = (key) => items.get(key);
})();
