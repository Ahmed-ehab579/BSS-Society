/* Article page: "Listen" reads the article aloud with the browser's speech engine */
(() => {
  const bar = document.querySelector('[data-listen]');
  if (!bar) return;
  const toggle = bar.querySelector('[data-listen-toggle]');
  const speedBtn = bar.querySelector('[data-listen-speed]');
  const track = bar.querySelector('[data-listen-bar]');
  const timeEl = bar.querySelector('[data-listen-time]');
  const synth = window.speechSynthesis;

  const paragraphs = [...document.querySelectorAll('[data-article] .a-section__text p')];
  const lengths = paragraphs.map((p) => p.textContent.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const SPEEDS = [1, 1.25, 1.5, 0.75];
  const SPEED_LABELS = ['1.0x', '1.25x', '1.5x', '0.75x'];
  const CHARS_PER_SEC = 15; // rough speaking pace at 1.0x
  let speed = 0;
  let index = 0;
  let playing = false;
  let charsBefore = 0;
  let charInPara = 0;

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const render = () => {
    const done = charsBefore + charInPara;
    const pct = total ? (done / total) * 100 : 0;
    track.style.setProperty('--progress', `${pct}%`);
    track.setAttribute('aria-valuenow', String(Math.round(pct)));
    timeEl.textContent = fmt(done / CHARS_PER_SEC);
  };
  const highlight = () => paragraphs.forEach((p, i) => p.classList.toggle('is-reading', playing && i === index));
  const setPlaying = (on) => {
    playing = on;
    bar.classList.toggle('is-playing', on);
    toggle.setAttribute('aria-pressed', String(on));
    toggle.setAttribute('aria-label', on ? 'Pause' : 'Listen to this article');
    highlight();
  };

  if (!synth || typeof SpeechSynthesisUtterance === 'undefined' || !paragraphs.length) {
    bar.dataset.unsupported = '';
    toggle.disabled = true;
    toggle.title = 'Listening is not supported in this browser';
    return;
  }

  const speakFrom = (i) => {
    synth.cancel();
    index = i;
    charsBefore = lengths.slice(0, i).reduce((a, b) => a + b, 0);
    charInPara = 0;
    if (i >= paragraphs.length) {
      setPlaying(false);
      index = 0; charsBefore = 0;
      render();
      return;
    }
    const u = new SpeechSynthesisUtterance(paragraphs[i].textContent.replace(/\s+/g, ' ').trim());
    u.lang = 'en';
    u.rate = SPEEDS[speed];
    u.onboundary = (e) => { charInPara = e.charIndex; render(); };
    u.onend = () => { if (playing && index === i) speakFrom(i + 1); };
    synth.speak(u);
    highlight();
    const r = paragraphs[i].getBoundingClientRect();
    if (r.top < 90 || r.bottom > window.innerHeight) {
      paragraphs[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    render();
  };

  toggle.addEventListener('click', () => {
    if (playing) {
      synth.pause();
      setPlaying(false);
    } else if (synth.paused && synth.speaking) {
      synth.resume();
      setPlaying(true);
    } else {
      setPlaying(true);
      speakFrom(index);
    }
  });

  speedBtn.addEventListener('click', () => {
    speed = (speed + 1) % SPEEDS.length;
    speedBtn.textContent = SPEED_LABELS[speed];
    if (playing) speakFrom(index); // restart the current paragraph at the new speed
  });

  // Click the bar to jump to that part of the article
  track.addEventListener('click', (e) => {
    const r = track.getBoundingClientRect();
    const target = ((e.clientX - r.left) / r.width) * total;
    let acc = 0;
    let i = 0;
    while (i < lengths.length - 1 && acc + lengths[i] < target) { acc += lengths[i]; i += 1; }
    if (playing) {
      speakFrom(i);
    } else {
      synth.cancel();
      index = i; charsBefore = acc; charInPara = 0;
      render();
    }
  });

  window.addEventListener('pagehide', () => synth.cancel());
  render();
})();
