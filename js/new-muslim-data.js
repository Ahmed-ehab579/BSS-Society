// New Muslim path content, shared by the path page (js/new-muslim.js) and the step pages
// (js/new-muslim-step.js). Everything here is placeholder content for the mockup.
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

  // Suggested resources: placeholders in the Library card format (js/resource-card.js). Each topic opens
  // with a short video on the topic itself, followed by four items from this pool.
  const BOOK = (file) => [`assets/images/${file}`, "50% 50%"];
  const POOL = [
    ["The life of the Prophet Muhammad", "From his childhood in Makkah to his final sermon, the key moments of his life told simply.", "book", BOOK("library-book-mockup.png")],
    ["How the Qur’an was preserved", "The careful history of memorising, writing and compiling the Qur’an over the first decades.", "article", ["assets/images/library-article-street.jpg", "50% 41%"]],
    ["Mercy to the worlds", "An audio reflection on the Prophet’s mercy towards people, animals and the world around him.", "audio", BOOK("library-book-3.png")],
    ["Juz ʿAmma: a reading planner", "Read the last part of the Qur’an a little each day, with short notes on every chapter.", "book", BOOK("library-book-2.png")],
    ["Why believe in God?", "Simple, honest reasons people give for belief, and the questions they often start with.", "article", ["assets/images/topic-belief.jpg", "50% 50%"]],
    ["Everyday manners", "Greetings, gratitude, kindness to neighbours: the small daily habits Islam encourages.", "video", ["assets/images/topic-life.jpg", "50% 45%"]],
    ["The six pillars of faith", "Belief in God, the angels, the books, the prophets, the last day and destiny, each explained.", "book", BOOK("library-book-4.png")],
    ["Walking in his footsteps", "A short film retracing the migration from Makkah to Madinah and what it teaches about patience.", "video", ["assets/images/library-caravan.jpg", "50% 71%"]],
    ["Questions women ask", "Honest answers to common questions about hijab, marriage, work and worship.", "audio", BOOK("library-book-5.png")],
  ];

  function resourcesFor(title, [image, focus], offset) {
    const intro = { title, text: "A short, gentle introduction to this topic, to watch before anything else.", format: "video", image, focus };
    const more = [0, 1, 2, 3].map((i) => {
      const [itemTitle, text, format, [itemImage, itemFocus]] = POOL[(offset + i * 2) % POOL.length];
      return { title: itemTitle, text, format, image: itemImage, focus: itemFocus };
    });
    return [intro, ...more].map((item) => ({ dir: "auto", ...item }));
  }

  const STEPS = [
    { title: "Begin with the essentials", text: "The core beliefs of Islam, explained simply and without pressure.",
      intro: "Four short topics on the core beliefs of Islam. Take them in order, or start with the question already on your mind.",
      outcomes: ["Who God is in Islam", "What the Qur’an is and how it is read", "Who the Prophet Muhammad was", "The meaning of the testimony of faith", "What changes in your life, and what stays the same"], topics: [
      ["Who is God in Islam?", "Understand how Islam describes God: one, without partner, merciful and always near. See why this belief, called tawhid, sits at the heart of everything else, and how it shapes the way Muslims pray, give thanks and face hard days.", "mosque"],
      ["What is the Qur’an?", "Where the Qur’an came from, how its chapters and verses are organised, and why Muslims see it as the word of God. Learn how it is read aloud, studied and lived with day to day, even before you know any Arabic.", "quran"],
      ["Who is Prophet Muhammad?", "Meet the Prophet through his life in Makkah and Madinah, his character and the message he shared. Discover why Muslims love him, follow his example and send blessings on him, told simply and warmly.", "desert"],
      ["What does it mean to be Muslim?", "The meaning of the testimony of faith and the five pillars that grow from it. Learn what becoming Muslim changes in your everyday life, what it does not change, and why there is no rush to know everything at once.", "courtyard"],
    ] },
    { title: "Build your daily foundation", text: "Prayer, purification and the small habits that shape each day.",
      intro: "The daily practices of a Muslim, one at a time. Start small, keep it simple and grow at your own pace.",
      outcomes: ["How to pray the five daily prayers", "How to make wudu before prayer", "What fasting in Ramadan involves", "How to eat halal with ease", "Small habits that keep you steady"], topics: [
      ["How to pray, step by step", "A calm guide to the five daily prayers: when they happen, what to say and how to move. Start with the simplest version you can manage, and grow into the full prayer at your own pace, without worrying about mistakes.", "garden"],
      ["Wudu: preparing for prayer", "How and why Muslims wash before prayer, with a simple order you can follow from the very first day. Learn what breaks wudu, when a full wash is needed, and how to keep it easy at home, at work or while travelling.", "street"],
      ["Your first Ramadan", "What to expect from the month of fasting, from the pre-dawn meal to breaking the fast at sunset. Practical ideas to prepare, look after your health and share the month with others, plus who is excused from fasting.", "caravan"],
      ["Halal food made simple", "What halal means in practice, at home, at work and when eating out with friends and family. Learn which foods and drinks to avoid, how to read labels, and how to explain your choices kindly without making things awkward.", "life"],
    ] },
    { title: "Live with confidence", text: "Bring your faith into family, work and friendships with ease.",
      intro: "Practical guidance for living your faith with the people around you: at home, at work and among friends.",
      outcomes: ["How to share your news with family", "Everyday Muslim manners", "Clear answers to common questions", "Keeping your faith at work and study", "Setting boundaries with kindness"], topics: [
      ["Sharing the news with family", "Gentle, practical ideas for talking with the people you love about your new faith. When to share, what to say, how to answer worries with patience, and how Islam asks you to keep treating your family with kindness.", "embrace"],
      ["Muslim manners in daily life", "Greetings, kindness and the small courtesies that carry the spirit of Islam into each day. From saying salam to how you eat, speak and treat neighbours, see how good character is part of worship itself.", "courtyard"],
      ["Answers to common questions", "Clear, honest answers to the questions new Muslims are asked most often by friends and colleagues. Topics include women in Islam, the hijab, fasting and what Muslims believe about Jesus, explained without jargon.", "street"],
      ["Faith at work and study", "Making room for prayer and faith in a busy week, with simple examples that work. How to find a quiet place to pray, talk to a manager or teacher, handle Fridays and keep your faith steady during exams and deadlines.", "life"],
    ] },
    { title: "Keep learning with support", text: "Find community, trusted sources and help whenever you need it.",
      intro: "Find the people, sources and support that will help you keep growing long after your first steps.",
      outcomes: ["Finding a welcoming community", "First steps in reading the Qur’an", "Choosing trustworthy sources", "Where to turn for help", "Planning your next steps"], topics: [
      ["Finding a welcoming community", "How to find a mosque or group where you feel at home, and what to expect on your first visit. Learn about new Muslim circles, women’s groups and online communities, and how to build friendships that support you.", "mosque"],
      ["Learning to read the Qur’an", "First steps with the Arabic letters and sounds, at a pace that suits you. Start with the short chapters used in prayer, find a patient teacher or app, and remember that every effort to read is rewarded.", "quran"],
      ["Choosing trustworthy sources", "How to tell reliable teachers and books from confusing or extreme voices online. Simple questions to ask about any source, why scholarship matters, and a short list of trusted places to start your reading.", "garden"],
      ["Getting help when you need it", "Who to turn to with questions, doubts or hard days, and why asking is always welcome. Find mentors, helplines and our own team, and know that struggling at times is a normal part of every believer’s journey.", "women"],
    ] },
  ].map((step, s) => ({
    ...step,
    id: s + 1,
    topics: step.topics.map(([title, text, image], t) => ({
      id: `${s + 1}-${t + 1}`, title, text, image: IMG[image][0], focus: IMG[image][1],
      resources: resourcesFor(title, IMG[image], s * 4 + t),
    })),
  }));

  window.BSS = window.BSS || {};
  window.BSS.NEW_MUSLIM_STEPS = STEPS;
})();
