// New Muslim path: four steps, each with a few topics. Progress ("explored" topics) is kept on this
// device only, separate from the Start here journey. Every step stays open: nobody is ever blocked.
// The topics are placeholder content; their pages do not exist yet, so "Read this topic" only records
// progress for now.
(function () {
  const KEY = "bss.newMuslim.v1";

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
      ["Who is God in Islam?", "Understand how Islam describes God: one, merciful and near, and why that belief sits at the heart of everything else.", "mosque"],
      ["What is the Qur’an?", "Where the Qur’an came from, how it is organised, and how Muslims read it and live with it day to day.", "quran"],
      ["Who is Prophet Muhammad?", "Meet the Prophet through his life, his character and the message he shared, told simply and warmly.", "desert"],
      ["What does it mean to be Muslim?", "The meaning of the testimony of faith, and what it changes, and does not change, in your everyday life.", "courtyard"],
    ] },
    { title: "Build your daily foundation", text: "Prayer, purification and the small habits that shape each day.", topics: [
      ["How to pray, step by step", "A calm guide to the five daily prayers: what to say, how to move, and how to begin even before you know it all.", "garden"],
      ["Wudu: preparing for prayer", "How and why Muslims wash before prayer, with a simple order you can follow from the very first day.", "street"],
      ["Your first Ramadan", "What to expect from the month of fasting, how to prepare, and how to look after yourself along the way.", "caravan"],
      ["Halal food made simple", "What halal means in practice, at home, at work and when eating out with friends and family.", "life"],
    ] },
    { title: "Live with confidence", text: "Bring your faith into family, work and friendships with ease.", topics: [
      ["Sharing the news with family", "Gentle, practical ideas for talking with the people you love about your new faith.", "embrace"],
      ["Muslim manners in daily life", "Greetings, kindness and the small courtesies that carry the spirit of Islam into each day.", "courtyard"],
      ["Answers to common questions", "Clear, honest answers to the questions new Muslims are asked most often by friends and colleagues.", "street"],
      ["Faith at work and study", "Making room for prayer and faith in a busy week, with simple examples that work.", "life"],
    ] },
    { title: "Keep learning with support", text: "Find community, trusted sources and help whenever you need it.", topics: [
      ["Finding a welcoming community", "How to find a mosque or group where you feel at home, and what to expect on your first visit.", "mosque"],
      ["Learning to read the Qur’an", "First steps with the Arabic letters and sounds, at a pace that suits you.", "quran"],
      ["Choosing trustworthy sources", "How to tell reliable teachers and books from confusing or extreme voices online.", "garden"],
      ["Getting help when you need it", "Who to turn to with questions, doubts or hard days, and that asking is always welcome.", "women"],
    ] },
  ].map((step, s) => ({
    ...step,
    id: s + 1,
    topics: step.topics.map(([title, text, image], t) => ({ id: `${s + 1}-${t + 1}`, title, text, image: IMG[image][0], focus: IMG[image][1] })),
  }));

  const list = document.querySelector("[data-path]");
  if (!list) return;
  const notice = document.querySelector("[data-storage-notice]");

  // ---- Saved progress (guarded: the page still works for this visit if storage is blocked) ----

  let memory = { explored: {} };
  let saveFailed = false;

  function read() {
    if (saveFailed) return memory;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(KEY) || "null");
      if (parsed && typeof parsed.explored === "object") return parsed;
    } catch (error) { /* unavailable or corrupt: use this visit's memory */ }
    return memory;
  }

  function write(state) {
    memory = state;
    const json = JSON.stringify(state);
    try {
      window.localStorage.setItem(KEY, json);
      saveFailed = window.localStorage.getItem(KEY) !== json;
    } catch (error) {
      saveFailed = true;
    }
    if (notice) notice.hidden = !saveFailed;
  }

  const isExplored = (topicId) => Boolean(read().explored[topicId]);
  const doneCount = (step) => step.topics.filter((topic) => isExplored(topic.id)).length;
  const stepStatus = (step) => {
    const done = doneCount(step);
    return done === 0 ? "not-started" : done === step.topics.length ? "completed" : "in-progress";
  };

  // ---- Rendering ----------------------------------------------------------------------------

  const escape = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const pad = (n) => String(n).padStart(2, "0");
  const RING = 2 * Math.PI * 26;   // circumference of the progress ring (r = 26)

  function stepHtml(step) {
    return `
      <li class="path-step" data-step="${step.id}">
        <div class="path-step__header">
          <div class="path-step__intro">
            <span class="path-step__number" aria-hidden="true">${pad(step.id)}</span>
            <h3 class="path-step__title"><span class="visually-hidden">Step ${step.id}: </span>${escape(step.title)}</h3>
            <p class="path-step__text">${escape(step.text)}</p>
          </div>
          <div class="path-step__progress" data-progress role="img">
            <svg class="progress-ring" viewBox="0 0 60 60" aria-hidden="true" focusable="false">
              <circle class="progress-ring__track" cx="30" cy="30" r="26"></circle>
              <circle class="progress-ring__value" cx="30" cy="30" r="26" stroke-dasharray="${RING}" stroke-dashoffset="${RING}"></circle>
            </svg>
            <span class="progress-ring__label" data-progress-label></span>
          </div>
          <div class="path-step__actions">
            <button class="btn btn--regular btn--primary path-step__start" type="button" data-start>
              <span data-start-label></span>
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
        <div class="path-step__content" id="step-${step.id}-content" hidden>
          <ul class="topic-list" role="list" aria-label="Topics in step ${step.id}">
            ${step.topics.map((topic) => `
              <li class="topic" role="listitem" data-topic="${topic.id}">
                <button class="topic__row" type="button" aria-expanded="false" aria-controls="topic-${topic.id}">
                  <span class="topic__title">${escape(topic.title)}</span>
                  <span class="topic__status" data-topic-status></span>
                  <img class="topic__chevron" src="assets/icons/row-chevron.svg" width="24" height="24" alt="">
                </button>
                <div class="topic-preview" id="topic-${topic.id}" style="--span: ${step.topics.length + 1}" role="region" aria-label="${escape(topic.title)}" hidden>
                  <img class="topic-preview__image" src="${topic.image}" alt="" loading="lazy" decoding="async" style="object-position: ${topic.focus}" onerror="this.hidden = true">
                  <p class="topic-preview__text">${escape(topic.text)}</p>
                  <!-- No topic page yet: the button records progress; it becomes a link once the page exists. -->
                  <button class="btn btn--regular btn--primary topic-preview__action" type="button" data-read>
                    <span data-read-label>Read this topic</span>
                    <span class="btn__arrow-clip" aria-hidden="true">
                      <span class="btn__arrow-track">
                        <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                        <img src="assets/icons/arrow-up-right.svg" width="24" height="24" alt="">
                      </span>
                    </span>
                  </button>
                </div>
              </li>`).join("")}
          </ul>
        </div>
      </li>`;
  }

  list.innerHTML = STEPS.map(stepHtml).join("");

  const stepEl = (step) => list.querySelector(`[data-step="${step.id}"]`);

  // Ring, labels and explored marks follow the saved progress.
  function sync() {
    STEPS.forEach((step) => {
      const el = stepEl(step);
      const done = doneCount(step);
      const total = step.topics.length;
      const status = stepStatus(step);
      el.dataset.status = status;

      const ring = el.querySelector(".progress-ring__value");
      ring.setAttribute("stroke-dashoffset", String(RING * (1 - done / total)));
      el.querySelector("[data-progress-label]").textContent = `${done}/${total}`;
      el.querySelector("[data-progress]").setAttribute("aria-label", `${done} of ${total} topics explored`);

      el.querySelector("[data-start-label]").textContent =
        status === "not-started" ? `Start step ${step.id}` : status === "in-progress" ? "Continue" : "Review step";

      step.topics.forEach((topic) => {
        const topicEl = el.querySelector(`[data-topic="${topic.id}"]`);
        const explored = isExplored(topic.id);
        topicEl.classList.toggle("is-explored", explored);
        topicEl.querySelector("[data-topic-status]").textContent = explored ? "Explored" : "";
        topicEl.querySelector("[data-read-label]").textContent = explored ? "Read again" : "Read this topic";
      });
    });
  }

  // ---- Behaviour ----------------------------------------------------------------------------

  // One step open at a time keeps the path easy to follow.
  function setOpen(step, open) {
    STEPS.forEach((other) => {
      const el = stepEl(other);
      const isOpen = other === step && open;
      el.classList.toggle("is-open", isOpen);
      el.querySelector(".path-step__content").hidden = !isOpen;
      el.querySelector("[data-toggle]").setAttribute("aria-expanded", String(isOpen));
      el.querySelector("[data-toggle-label]").textContent = isOpen ? "Hide the content" : "Discover the content";
    });
  }

  function selectTopic(step, topic) {
    stepEl(step).querySelectorAll(".topic").forEach((el) => {
      const selected = el.dataset.topic === topic.id;
      el.classList.toggle("is-selected", selected);
      el.querySelector(".topic__row").setAttribute("aria-expanded", String(selected));
      el.querySelector(".topic-preview").hidden = !selected;
    });
  }

  // The topic to point at: the first one not explored yet (or the first when all are done).
  const nextTopic = (step) => step.topics.find((topic) => !isExplored(topic.id)) || step.topics[0];

  STEPS.forEach((step) => {
    const el = stepEl(step);

    el.querySelector("[data-toggle]").addEventListener("click", () => {
      const open = !el.classList.contains("is-open");
      setOpen(step, open);
      if (open) selectTopic(step, nextTopic(step));
    });

    // Until the step page exists, "Start / Continue" opens the step at its next topic.
    el.querySelector("[data-start]").addEventListener("click", () => {
      setOpen(step, true);
      const topic = nextTopic(step);
      selectTopic(step, topic);
      const row = el.querySelector(`[data-topic="${topic.id}"] .topic__row`);
      row.focus({ preventScroll: true });
      el.querySelector(".path-step__content").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    });

    step.topics.forEach((topic) => {
      const topicEl = el.querySelector(`[data-topic="${topic.id}"]`);
      topicEl.querySelector(".topic__row").addEventListener("click", () => selectTopic(step, topic));
      topicEl.querySelector("[data-read]").addEventListener("click", () => {
        const state = read();
        write({ ...state, explored: { ...state.explored, [topic.id]: true } });
        sync();
      });
    });
  });

  // Start where the reader left off: the first step that is not completed (step 1 on a first visit).
  // When everything is done, all steps start closed.
  sync();
  const current = STEPS.find((step) => stepStatus(step) !== "completed");
  if (current) {
    setOpen(current, true);
    selectTopic(current, nextTopic(current));
  }

  // Other tabs keep the page up to date.
  window.addEventListener("storage", (event) => { if (event.key === KEY) sync(); });

  // Storage blocked: say so once, without pretending progress is saved.
  try {
    const probe = `${KEY}.probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
  } catch (error) {
    saveFailed = true;
    if (notice) notice.hidden = false;
  }
})();
