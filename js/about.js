// About us: the dashed path through "Our books journey". It starts under the heading and links the steps,
// and a darker line fills it as the page scrolls: each piece completes when the next step reaches the
// middle of the screen, and that step then counts as reached. Paths are drawn from the real positions
// of the text, so they stay aligned at every width.
(function () {
  const track = document.querySelector("[data-journey]");
  if (!track) return;

  const section = track.closest(".journey");
  const heading = section.querySelector(".about-intro__heading");
  const intro = section.querySelector(".about-intro");   // stacked: the text sits under the heading
  const steps = [...track.querySelectorAll(".journey-step")];
  const stacked = window.matchMedia("(max-width: 1099px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG = "http://www.w3.org/2000/svg";
  const RADIUS = 23;     // corner radius of the Figma path
  const GAP = 14;        // space between a path and the text or card it leaves or reaches
  const HEADING_GAP = 40; // space under the heading (desktop)
  const EASE = 0.14;     // how quickly the fill catches up with the scroll, per frame

  const svg = document.createElementNS(SVG, "svg");
  svg.classList.add("journey-path");
  svg.setAttribute("aria-hidden", "true");
  track.prepend(svg);

  function shape(name, attributes = {}) {
    const element = document.createElementNS(SVG, name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  // One piece per link (heading to step 1, then step to step): a light dashed path, the same path in
  // dark, and a solid mask that uncovers the dark one.
  const pieces = steps.map((step, i) => {
    const mask = shape("mask", { id: `journey-mask-${i}`, maskUnits: "userSpaceOnUse" });
    const reveal = shape("path", { class: "journey-path__reveal", pathLength: 1, "stroke-dashoffset": 1 });
    mask.append(reveal);
    const base = shape("path", { class: "journey-path__base" });
    const fill = shape("path", { class: "journey-path__fill", mask: `url(#journey-mask-${i})` });
    svg.append(mask, base, fill);
    return { step, mask, reveal, base, fill, top: 0, bottom: 0, target: 0, current: 0 };
  });

  // Vertical, across with rounded corners, vertical again
  function bend(x1, y1, x2, y2) {
    if (Math.abs(x2 - x1) < 1) return `M ${x1} ${y1} V ${y2}`;
    const mid = (y1 + y2) / 2;
    const dir = x2 > x1 ? 1 : -1;
    const r = Math.min(stacked.matches ? 12 : RADIUS, (y2 - y1) / 2, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} V ${mid - r} Q ${x1} ${mid} ${x1 + dir * r} ${mid} H ${x2 - dir * r} Q ${x2} ${mid} ${x2} ${mid + r} V ${y2}`;
  }

  function layout() {
    const box = track.getBoundingClientRect();
    const x = (rect, offset) => rect.left - box.left + offset;
    const textBox = (step) => step.querySelector(".journey-step__body").getBoundingClientRect();
    // Where the path runs on each side (desktop), or from the middle of each card (stacked)
    const lineX = (step) => {
      if (stacked.matches) {
        const card = step.getBoundingClientRect();
        return card.left - box.left + card.width / 2;
      }
      return x(textBox(step), step.classList.contains("journey-step--right") ? 73 : 140);
    };

    svg.setAttribute("width", box.width);
    svg.setAttribute("height", box.height);

    pieces.forEach((piece, i) => {
      const previous = steps[i - 1];
      const startX = lineX(previous || piece.step);
      const endX = lineX(piece.step);
      const from = previous
        ? (stacked.matches ? previous.getBoundingClientRect() : textBox(previous))
        : (stacked.matches ? intro : heading).getBoundingClientRect();
      const startY = from.bottom - box.top + (previous || stacked.matches ? GAP : HEADING_GAP);
      const target = stacked.matches ? piece.step.getBoundingClientRect() : textBox(piece.step);
      const endY = target.top - box.top - GAP;
      const d = bend(startX, startY, endX, endY);
      [piece.base, piece.fill, piece.reveal].forEach((path) => path.setAttribute("d", d));
      Object.entries({ x: -20, y: startY - 20, width: box.width + 40, height: endY - startY + 40 })
        .forEach(([key, value]) => piece.mask.setAttribute(key, value));
      piece.top = box.top + window.scrollY + startY;
      piece.bottom = box.top + window.scrollY + endY;
    });
    update();
  }

  let frame = null;

  // The line that drives the fill: the middle of the screen
  function update() {
    const middle = window.scrollY + window.innerHeight / 2;
    pieces.forEach((piece) => {
      piece.target = Math.min(1, Math.max(0, (middle - piece.top) / (piece.bottom - piece.top)));
      piece.step.classList.toggle("is-reached", piece.target >= 1);
    });
    if (!frame) frame = requestAnimationFrame(animate);
  }

  function animate() {
    frame = null;
    let moving = false;
    pieces.forEach((piece) => {
      const distance = piece.target - piece.current;
      if (reducedMotion.matches || Math.abs(distance) < 0.002) piece.current = piece.target;
      else {
        piece.current += distance * EASE;
        moving = true;
      }
      piece.reveal.setAttribute("stroke-dashoffset", String(1 - piece.current));
    });
    if (moving) frame = requestAnimationFrame(animate);
  }

  section.classList.add("has-path");
  layout();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", layout);
  stacked.addEventListener("change", layout);
  window.addEventListener("load", layout);
  if (document.fonts) document.fonts.ready.then(layout);
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(track);
})();
