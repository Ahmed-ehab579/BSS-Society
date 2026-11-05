// Resource card markup (Figma 984:2777), shared by the Library and the New Muslim step pages.
// Styles: css/resource-card.css. An item is { title, text, format, image, focus, dir }.
(function () {
  // One entry per material type (Figma 984:2777): badge text and icon, action label, how the media is
  // shown ("photo" fills the frame, "book" sits on a light board) and the icon laid over it.
  const TYPES = {
    book: { badge: "Book", icon: "assets/icons/badge-book.svg", iconSize: [10.5322, 10.97], action: "Read book", media: "book" },
    audio: { badge: "Audio book", icon: "assets/icons/badge-audio.svg", iconSize: [15.303, 12.7575], action: "Listen", media: "book", overlay: "audio" },
    article: { badge: "Article", icon: "assets/icons/badge-article.svg", iconSize: [10.5322, 10.97], action: "Read article", media: "photo" },
    video: { badge: "Video", icon: "assets/icons/badge-video.svg", iconSize: [10.5325, 10.9704], action: "Watch video", media: "photo", overlay: "play" },
  };

  function resourceCardHtml(item) {
    const type = TYPES[item.format];
    const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const picture = type.media === "book"
      ? `<img class="resource-card__book" src="${item.image}" alt="" loading="lazy" decoding="async" onerror="this.hidden = true">`
      : `<img class="resource-card__photo" src="${item.image}" alt="" loading="lazy" decoding="async"
          style="object-position: ${item.focus}" onerror="this.hidden = true">`;
    const overlay = {
      play: `<img class="resource-card__play" src="assets/icons/media-play-lg.svg" width="112.864" height="112.864" alt="">`,
      audio: `<span class="resource-card__listen"><img src="assets/icons/media-audio-book.svg" width="35" height="35" alt=""></span>`,
    }[type.overlay] || "";
    return `
      <li class="resource-card resource-card--${item.format}">
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
          <!-- The whole card opens this link. Books and audio books have a page so far; the others follow once theirs exist. -->
          <a class="btn btn--primary resource-card__action" ${type.media === "book" ? 'href="book.html"' : ""} aria-label="${type.action}: ${escape(item.title)}">
            ${type.action}
            <span class="btn__arrow-clip" aria-hidden="true">
              <span class="btn__arrow-track">
                <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
              </span>
            </span>
          </a>
        </div>
      </li>`;
  }

  window.BSS = window.BSS || {};
  window.BSS.RESOURCE_TYPES = TYPES;
  window.BSS.resourceCardHtml = resourceCardHtml;
})();
