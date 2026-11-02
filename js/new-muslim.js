// New Muslim path: four steps, each with a few topics. Every step stays open: nobody is ever blocked.
// The topics are placeholder content. The progress rings stay at 0 and the start buttons stay static
// until the step pages and the progress rules exist.
(function () {
  const IMG = {
    mosque: ["assets/images/article-hero.jpg", "50% 56%"],
    quran: ["assets/images/library-quran.jpg", "50% 50%"],
    desert: ["assets/images/library-desert.jpg", "50% 50%"],
    caravan: ["assets/images/library-caravan.jpg", "50% 71%"],
    courtyard: ["assets/images/library-courtyard.jpg", "50% 66%"],
    embrace: ["assets/images/library-embrace.jpg", "50% 67%"],
    garden: ["assets/images/library-garden.jpg", "50% 45%"],
    street: ["assets/images/library-article-street.jpg", "50% 41%"],
    women: ["assets/images/topic-women.jpg", "50% 45%"],
    life: ["assets/images/topic-life.jpg", "50% 45%"],
  };

  const STEPS = [
    { title: "Begin with the essentials", text: "The core beliefs of Islam, explained simply and without pressure.", topics: [
      ["Who is God in Islam?", "Understand how Islam describes God: one, without partner, merciful and always near. See why this belief, called tawhid, sits at the heart of everything else, and how it shapes the way Muslims pray, give thanks and face hard days.", "mosque"],
      ["What is the Qur’an?", "Where the Qur’an came from, how its chapters and verses are organised, and why Muslims see it as the word of God. Learn how it is read aloud, studied and lived with day to day, even before you know any Arabic.", "quran"],
      ["Who is Prophet Muhammad?", "Meet the Prophet through his life in Makkah and Madinah, his character and the message he shared. Discover why Muslims love him, follow his example and send blessings on him, told simply and warmly.", "desert"],
      ["What does it mean to be Muslim?", "The meaning of the testimony of faith and the five pillars that grow from it. Learn what becoming Muslim changes in your everyday life, what it does not change, and why there is no rush to know everything at once.", "courtyard"],
    ] },
    { title: "Build your daily foundation", text: "Prayer, purification and the small habits that shape each day.", topics: [
      ["How to pray, step by step", "A calm guide to the five daily prayers: when they happen, what to say and how to move. Start with the simplest version you can manage, and grow into the full prayer at your own pace, without worrying about mistakes.", "garden"],
      ["Wudu: preparing for prayer", "How and why Muslims wash before prayer, with a simple order you can follow from the very first day. Learn what breaks wudu, when a full wash is needed, and how to keep it easy at home, at work or while travelling.", "street"],
      ["Your first Ramadan", "What to expect from the month of fasting, from the pre-dawn meal to breaking the fast at sunset. Practical ideas to prepare, look after your health and share the month with others, plus who is excused from fasting.", "caravan"],
      ["Halal food made simple", "What halal means in practice, at home, at work and when eating out with friends and family. Learn which foods and drinks to avoid, how to read labels, and how to explain your choices kindly without making things awkward.", "life"],
    ] },
    { title: "Live with confidence", text: "Bring your faith into family, work and friendships with ease.", topics: [
      ["Sharing the news with family", "Gentle, practical ideas for talking with the people you love about your new faith. When to share, what to say, how to answer worries with patience, and how Islam asks you to keep treating your family with kindness.", "embrace"],
      ["Muslim manners in daily life", "Greetings, kindness and the small courtesies that carry the spirit of Islam into each day. From saying salam to how you eat, speak and treat neighbours, see how good character is part of worship itself.", "courtyard"],
      ["Answers to common questions", "Clear, honest answers to the questions new Muslims are asked most often by friends and colleagues. Topics include women in Islam, the hijab, fasting and what Muslims believe about Jesus, explained without jargon.", "street"],
      ["Faith at work and study", "Making room for prayer and faith in a busy week, with simple examples that work. How to find a quiet place to pray, talk to a manager or teacher, handle Fridays and keep your faith steady during exams and deadlines.", "life"],
    ] },
    { title: "Keep learning with support", text: "Find community, trusted sources and help whenever you need it.", topics: [
      ["Finding a welcoming community", "How to find a mosque or group where you feel at home, and what to expect on your first visit. Learn about new Muslim circles, women’s groups and online communities, and how to build friendships that support you.", "mosque"],
      ["Learning to read the Qur’an", "First steps with the Arabic letters and sounds, at a pace that suits you. Start with the short chapters used in prayer, find a patient teacher or app, and remember that every effort to read is rewarded.", "quran"],
      ["Choosing trustworthy sources", "How to tell reliable teachers and books from confusing or extreme voices online. Simple questions to ask about any source, why scholarship matters, and a short list of trusted places to start your reading.", "garden"],
      ["Getting help when you need it", "Who to turn to with questions, doubts or hard days, and why asking is always welcome. Find mentors, helplines and our own team, and know that struggling at times is a normal part of every believer’s journey.", "women"],
    ] },
  ].map((step, s) => ({
    ...step,
    id: s + 1,
    topics: step.topics.map(([title, text, image], t) => ({ id: `${s + 1}-${t + 1}`, title, text, image: IMG[image][0], focus: IMG[image][1] })),
  }));

  const list = document.querySelector("[data-path]");
  if (!list) return;

  // ---- Rendering ----------------------------------------------------------------------------

  const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const RING = 2 * Math.PI * 26;   // circumference of the progress ring (r = 26)

  function stepHtml(step) {
    return `
      <li class="path-step" data-step="${step.id}" data-status="not-started">
        <div class="path-step__header">
          <div class="path-step__intro">
            <span class="path-step__number" aria-hidden="true">${pad(step.id)}</span>
            <h3 class="path-step__title"><span class="visually-hidden">Step ${step.id}: </span>${escape(step.title)}</h3>
            <p class="path-step__text">${escape(step.text)}</p>
          </div>
          <div class="path-step__progress" role="img" aria-label="0 of ${step.topics.length} topics completed">
            <svg class="progress-ring" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
              <circle class="progress-ring__track" cx="30" cy="30" r="26"></circle>
              <circle class="progress-ring__value" cx="30" cy="30" r="26" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"></circle>
            </svg>
            <span class="progress-ring__label">0/${step.topics.length}</span>
          </div>
          <div class="path-step__actions">
            <button class="btn btn--regular btn--primary path-step__start" type="button" data-start>
              <span>Start step ${step.id}</span>
              <span class="btn__arrow-clip" aria-hidden="true">
                <span class="btn__arrow-track">
                  <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                  <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                </span>
              </span>
            </button>
            <button class="btn btn--regular btn--secondary path-step__toggle" type="button" aria-expanded="false" aria-controls="step-${step.id}-content" data-toggle>
              <span data-toggle-label>Discover the content</span>
              <img class="path-step__chevron" src="assets/icons/chevron-down-solid.svg" width="16" height="10" alt="">
            </button>
          </div>
        </div>
        <div class="path-step__content" id="step-${step.id}-content">
          <div class="path-step__clip">
          <div class="path-step__body">
          <ul class="topic-list" role="list" aria-label="Topics in step ${step.id}">
            ${step.topics.map((topic) => `
              <li class="topic" role="listitem" data-topic="${topic.id}">
                <button class="topic__row" type="button" aria-expanded="false" aria-controls="topic-${topic.id}">
                  <span class="topic__title">${escape(topic.title)}</span>
                  <img class="topic__chevron" src="assets/icons/row-chevron.svg" width="24" height="24" alt="">
                </button>
                <div class="topic-preview" id="topic-${topic.id}" style="--span: ${step.topics.length + 1}" role="region" aria-label="${escape(topic.title)}">
                  <div class="topic-preview__clip">
                    <div class="topic-preview__card">
                      <img class="topic-preview__image" src="${topic.image}" alt="" loading="lazy" decoding="async" style="object-position: ${topic.focus}" onerror="this.hidden = true">
                      <p class="topic-preview__text">${escape(topic.text)}</p>
                    </div>
                  </div>
                </div>
              </li>`).join("")}
          </ul>
          </div>
          </div>
        </div>
      </li>`;
  }

  list.innerHTML = STEPS.map(stepHtml).join("");

  const stepEl = (step) => list.querySelector(`[data-step="${step.id}"]`);

  // ---- Behaviour ----------------------------------------------------------------------------

  // One step open at a time keeps the path easy to follow. Open and close animate in CSS.
  function setOpen(step, open) {
    STEPS.forEach((other) => {
      const el = stepEl(other);
      const isOpen = other === step && open;
      el.classList.toggle("is-open", isOpen);
      el.querySelector("[data-toggle]").setAttribute("aria-expanded", String(isOpen));
      setToggleLabel(el.querySelector("[data-toggle]"), isOpen ? "Hide the content" : "Discover the content");
    });
  }

  function expandTiming() {
    const styles = getComputedStyle(document.documentElement);
    return { duration: parseFloat(styles.getPropertyValue("--motion-duration-expand")) || 700, easing: styles.getPropertyValue("--motion-ease-expand").trim() || "ease-in-out" };
  }

  // Keep the clicked element still on screen while things around it animate, so everything opens
  // downwards. Stops as soon as the reader scrolls themselves.
  let stopHolding = null;
  function holdInPlace(target) {
    if (stopHolding) stopHolding();
    const top = target.getBoundingClientRect().top;
    const end = performance.now() + expandTiming().duration + 100;
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      ["wheel", "touchmove", "keydown"].forEach((type) => window.removeEventListener(type, stop));
      stopHolding = null;
    };
    const tick = () => {
      const shift = target.getBoundingClientRect().top - top;
      if (Math.abs(shift) > 0.5) window.scrollBy(0, shift);
      if (performance.now() < end) frame = requestAnimationFrame(tick); else stop();
    };
    ["wheel", "touchmove", "keydown"].forEach((type) => window.addEventListener(type, stop, { passive: true }));
    stopHolding = stop;
    frame = requestAnimationFrame(tick);
  }

  // The toggle's width follows its label; animate it so the start button beside it glides instead of jumping.
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const stacked = matchMedia("(max-width: 1099px)");   /* previews open under their rows */
  function setToggleLabel(toggle, text) {
    const label = toggle.querySelector("[data-toggle-label]");
    if (label.textContent === text) return;
    const from = toggle.getBoundingClientRect().width;
    label.textContent = text;
    const to = toggle.getBoundingClientRect().width;
    if (reducedMotion.matches || from === to) return;
    const timing = expandTiming();
    toggle.animate([{ width: `${from}px` }, { width: `${to}px` }], timing);
    label.animate([{ opacity: 0 }, { opacity: 1 }], { ...timing, duration: timing.duration * 0.6 });
  }

  // The topic whose preview is showing in each step (null: none, possible on narrow screens only).
  const selected = {};
  function selectTopic(step, topic) {
    selected[step.id] = topic;
    stepEl(step).querySelectorAll(".topic").forEach((el) => {
      const isSelected = Boolean(topic) && el.dataset.topic === topic.id;
      el.classList.toggle("is-selected", isSelected);
      el.querySelector(".topic__row").setAttribute("aria-expanded", String(isSelected));
    });
  }

  // Something above the clicked element closing would shrink for the whole animation while the page
  // scrolls back, which reads as several motions at once. Close it instantly instead, keeping the clicked
  // element still, so only the newly opened part animates.
  function closeAboveInstantly(closing, clicked, change) {
    const top = clicked.getBoundingClientRect().top;
    closing.classList.add("is-closing-instantly");
    change();
    window.scrollBy(0, clicked.getBoundingClientRect().top - top);
    requestAnimationFrame(() => closing.classList.remove("is-closing-instantly"));
  }

  STEPS.forEach((step, index) => {
    const el = stepEl(step);

    el.querySelector("[data-toggle]").addEventListener("click", () => {
      const open = !el.classList.contains("is-open");
      const change = () => {
        setOpen(step, open);
        if (open) selectTopic(step, selected[step.id] || step.topics[0]);
      };
      const openAbove = STEPS.slice(0, index).map(stepEl).find((other) => other.classList.contains("is-open"));
      if (open && openAbove) closeAboveInstantly(openAbove, el, change);
      else {
        holdInPlace(el);
        change();
      }
    });

    step.topics.forEach((topic, topicIndex) => {
      const topicEl = el.querySelector(`[data-topic="${topic.id}"]`);
      const row = topicEl.querySelector(".topic__row");
      row.addEventListener("click", () => {
        const previous = selected[step.id];
        if (previous === topic) {
          // Narrow screens: tapping the open topic closes it. Desktop always shows one preview.
          if (stacked.matches) selectTopic(step, null);
          return;
        }
        if (previous && stacked.matches && step.topics.indexOf(previous) < topicIndex) {
          closeAboveInstantly(el.querySelector(`[data-topic="${previous.id}"]`), row, () => selectTopic(step, topic));
          return;
        }
        holdInPlace(row);
        selectTopic(step, topic);
      });
    });
  });

  // Back on desktop width, an open step always shows a preview.
  stacked.addEventListener("change", () => {
    if (stacked.matches) return;
    STEPS.forEach((step) => {
      if (stepEl(step).classList.contains("is-open") && !selected[step.id]) selectTopic(step, step.topics[0]);
    });
  });
})();
