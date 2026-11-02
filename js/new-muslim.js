// New Muslim path: four steps, each with a few topics. Progress ("explored" topics) is kept on this
// device only, separate from the Start here journey. Every step stays open: nobody is ever blocked.
// The topics are placeholder content and their pages do not exist yet, so a topic counts as explored once
// its preview has been opened. The start buttons stay static until the step page exists.
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
                  <span class="topic__status" data-topic-status></span>
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

      step.topics.forEach((topic) => {
        const topicEl = el.querySelector(`[data-topic="${topic.id}"]`);
        const explored = isExplored(topic.id);
        topicEl.classList.toggle("is-explored", explored);
        topicEl.querySelector("[data-topic-status]").textContent = explored ? "Explored" : "";
      });
    });
  }

  // ---- Behaviour ----------------------------------------------------------------------------

  // One step open at a time keeps the path easy to follow. Open and close animate in CSS.
  function setOpen(step, open) {
    STEPS.forEach((other) => {
      const el = stepEl(other);
      const isOpen = other === step && open;
      el.classList.toggle("is-open", isOpen);
      el.querySelector("[data-toggle]").setAttribute("aria-expanded", String(isOpen));
      el.querySelector("[data-toggle-label]").textContent = isOpen ? "Hide the content" : "Discover the content";
    });
  }

  // Showing a topic's preview marks it explored (until topic pages exist).
  const selected = {};
  function selectTopic(step, topic) {
    selected[step.id] = topic;
    stepEl(step).querySelectorAll(".topic").forEach((el) => {
      const isSelected = el.dataset.topic === topic.id;
      el.classList.toggle("is-selected", isSelected);
      el.querySelector(".topic__row").setAttribute("aria-expanded", String(isSelected));
    });
    if (!isExplored(topic.id)) {
      const state = read();
      write({ ...state, explored: { ...state.explored, [topic.id]: true } });
      sync();
    }
  }

  STEPS.forEach((step) => {
    const el = stepEl(step);

    el.querySelector("[data-toggle]").addEventListener("click", () => {
      const open = !el.classList.contains("is-open");
      setOpen(step, open);
      if (open) selectTopic(step, selected[step.id] || step.topics[0]);
    });

    step.topics.forEach((topic) => {
      el.querySelector(`[data-topic="${topic.id}"] .topic__row`).addEventListener("click", () => selectTopic(step, topic));
    });
  });

  // Every step starts closed.
  sync();

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
