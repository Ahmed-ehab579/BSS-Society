// About us, "Our books journey". Desktop: a dashed path starts under the heading and links the steps, and
// a darker line fills it as the page scrolls: each piece completes when the next step reaches the middle
// of the screen, and that step then counts as reached. Paths are drawn from the real positions of the
// text, so they stay aligned at every width. Phones and tablets: the cards scroll while one number stays
// at the middle of the screen, rolling to the card in view.
(function () {
  const track = document.querySelector("[data-journey]");
  if (!track) return;

  const section = track.closest(".journey");
  const heading = section.querySelector(".about-intro__heading");
  const counter = track.querySelector("[data-journey-counter]");
  const steps = [...track.querySelectorAll(".journey-step")];
  const stacked = window.matchMedia("(max-width: 1099px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG = "http://www.w3.org/2000/svg";
  const RADIUS = 23;     // corner radius of the Figma path
  const GAP = 14;        // space between a path and the text it leaves or reaches
  const HEADING_GAP = 40; // space under the heading
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
    const r = Math.min(RADIUS, (y2 - y1) / 2, Math.abs(x2 - x1) / 2);
    return `M ${x1} ${y1} V ${mid - r} Q ${x1} ${mid} ${x1 + dir * r} ${mid} H ${x2 - dir * r} Q ${x2} ${mid} ${x2} ${mid + r} V ${y2}`;
  }

  function layout() {
    if (!stacked.matches) {
      const box = track.getBoundingClientRect();
      const textBox = (step) => step.querySelector(".journey-step__body").getBoundingClientRect();
      const lineX = (step) => textBox(step).left - box.left + (step.classList.contains("journey-step--right") ? 73 : 140);

      svg.setAttribute("width", box.width);
      svg.setAttribute("height", box.height);

      pieces.forEach((piece, i) => {
        const previous = steps[i - 1];
        const startX = lineX(previous || piece.step);
        const endX = lineX(piece.step);
        const from = previous ? textBox(previous) : heading.getBoundingClientRect();
        const startY = from.bottom - box.top + (previous ? GAP : HEADING_GAP);
        const endY = textBox(piece.step).top - box.top - GAP;
        const d = bend(startX, startY, endX, endY);
        [piece.base, piece.fill, piece.reveal].forEach((path) => path.setAttribute("d", d));
        Object.entries({ x: -20, y: startY - 20, width: box.width + 40, height: endY - startY + 40 })
          .forEach(([key, value]) => piece.mask.setAttribute(key, value));
        piece.top = box.top + window.scrollY + startY;
        piece.bottom = box.top + window.scrollY + endY;
      });
    }
    update();
  }

  let frame = null;

  // The line that drives everything: the middle of the screen
  function update() {
    const middle = window.innerHeight / 2;
    if (stacked.matches) {
      // The card whose centre is nearest the middle of the screen
      let active = 0;
      let nearest = Infinity;
      steps.forEach((step, i) => {
        const card = step.getBoundingClientRect();
        const distance = Math.abs(card.top + card.height / 2 - middle);
        if (distance < nearest) {
          nearest = distance;
          active = i;
        }
      });
      counter.style.setProperty("--step", active);
      steps.forEach((step, i) => step.classList.toggle("is-active", i === active));
      return;
    }
    const line = window.scrollY + middle;
    pieces.forEach((piece) => {
      piece.target = Math.min(1, Math.max(0, (line - piece.top) / (piece.bottom - piece.top)));
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

  // One scroll, one card (phones and tablets): any single wheel scroll or swipe inside this section
  // glides to the next card, centring it level with the number. At the first and last card the
  // page scrolls on normally, so nobody gets stuck. People who prefer reduced motion keep free scrolling.
  const GLIDE = 650;        // ms for one card
  const GESTURE_GAP = 160;  // ms of quiet that ends a wheel gesture (trackpads keep sending events)
  const SWIPE = 24;         // px a finger must travel to count as a swipe
  const TOLERANCE = 4;
  let gliding = false;
  let lastWheel = 0;
  let touchY = null;
  let touchTaken = false;

  const cardStops = () => steps.map((step) => {
    const card = step.getBoundingClientRect();
    return window.scrollY + card.top + card.height / 2 - window.innerHeight / 2;
  });

  const paged = () => stacked.matches && !reducedMotion.matches && !document.documentElement.classList.contains("is-menu-open");

  // Inside the section, with a card still to go in this direction. The section starts half a screen
  // early, so a scroll coming from above lands on the first card rather than past it.
  function inPagedArea(direction) {
    const stops = cardStops();
    const y = window.scrollY;
    const first = stops[0];
    const last = stops[stops.length - 1];
    const reach = window.innerHeight / 2;
    return direction > 0 ? y >= first - reach && y < last - TOLERANCE : y <= last + reach && y > first + TOLERANCE;
  }

  function glideTo(direction) {
    const stops = cardStops();
    const y = window.scrollY;
    const target = direction > 0 ? stops.find((stop) => stop > y + TOLERANCE) : [...stops].reverse().find((stop) => stop < y - TOLERANCE);
    if (target === undefined) return;
    gliding = true;
    const start = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
    const step = (now) => {
      const t = Math.min(1, (now - start) / GLIDE);
      window.scrollTo(0, y + (target - y) * ease(t));
      if (t < 1) requestAnimationFrame(step);
      else {
        gliding = false;
        update();   // the number always lands on the card that ends up centred
      }
    };
    requestAnimationFrame(step);
  }

  window.addEventListener("wheel", (event) => {
    if (!paged() || !event.deltaY) return;
    const direction = Math.sign(event.deltaY);
    const now = performance.now();
    const newGesture = now - lastWheel > GESTURE_GAP;
    lastWheel = now;
    if (!gliding && !inPagedArea(direction)) return;
    event.preventDefault();
    if (newGesture && !gliding) glideTo(direction);
  }, { passive: false });

  window.addEventListener("touchstart", (event) => {
    touchY = event.touches.length === 1 ? event.touches[0].clientY : null;
    touchTaken = false;
  }, { passive: true });

  window.addEventListener("touchmove", (event) => {
    if (touchY === null || !paged() || !event.cancelable) return;
    const direction = Math.sign(touchY - event.touches[0].clientY);
    if (!direction) return;
    if (touchTaken || gliding || inPagedArea(direction)) {
      touchTaken = true;
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener("touchend", (event) => {
    if (touchY === null) return;
    const travel = touchY - event.changedTouches[0].clientY;
    if (touchTaken && !gliding && Math.abs(travel) >= SWIPE) glideTo(Math.sign(travel));
    touchY = null;
  }, { passive: true });

  section.classList.add("has-path");
  layout();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", layout);
  stacked.addEventListener("change", layout);
  window.addEventListener("load", layout);
  if (document.fonts) document.fonts.ready.then(layout);
  if ("ResizeObserver" in window) new ResizeObserver(layout).observe(track);
})();
