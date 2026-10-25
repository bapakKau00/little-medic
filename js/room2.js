// Room 2: Playground. A friend falls off their bike (video); the player gives basic first aid in the right order.
(() => {
  const { $, Sound, Music, store, burst, goTo, t, applyI18n, reduceMotion } = Arcade;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // Video speed, and where the camera zooms in at the end of the video (% of the frame).
  // Move FOCUS onto the child's knee in the last frame of the video.
  const VIDEO_SPEED = 0.5;
  const FOCUS = { x: '50%', y: '70%' };

  // The correct treatment, in order. goal = what to do (shown as the hint), done = praise after.
  const STEPS = [
    { tool: 'gloves', goal: 'r2.goal1', done: 'r2.done1' },
    { tool: 'water', goal: 'r2.goal2', done: 'r2.done2' },
    { tool: 'gauze', goal: 'r2.goal3', done: 'r2.done3' },
    { tool: 'iodine', goal: 'r2.goal4', done: 'r2.done4' },
    { tool: 'plaster', goal: 'r2.goal5', done: 'r2.done5' },
  ];

  // Everything on the first aid station. Items with `wrong` are not needed for a small scrape.
  const TOOLS = [
    { key: 'gloves', name: 'tool.gloves', image: 'assets/items/gloves.png' },
    { key: 'water', name: 'tool.water', symbol: 'sym-water' },
    { key: 'gauze', name: 'tool.gauze', image: 'assets/items/gauze.png' },
    { key: 'iodine', name: 'tool.iodine', image: 'assets/items/iodine.png' },
    { key: 'plaster', name: 'tool.plaster', image: 'assets/items/plaster.png' },
    { key: 'scissors', name: 'item.scissors', image: 'assets/items/scissors.png', wrong: 'r2.no.scissors' },
    { key: 'cotton', name: 'item.cotton', image: 'assets/items/cotton.png', wrong: 'r2.no.cotton' },
    { key: 'triangular', name: 'item.triangular', image: 'assets/items/triangular.png', wrong: 'r2.no.triangular' },
  ];

  const r2 = $('#r2');
  const vid = $('#vid');
  const closeup = $('#closeup');
  const fx = $('#fx');
  const glow = $('#glow');

  vid.style.setProperty('--focus-x', FOCUS.x);
  vid.style.setProperty('--focus-y', FOCUS.y);

  // ---------- Small animation helpers ----------
  const wait = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? Math.min(ms, 60) : ms));
  const ease = {
    inOut: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    out: (p) => 1 - Math.pow(1 - p, 3),
    in: (p) => p * p * p,
  };
  const lerp = (a, b, p) => a + (b - a) * p;

  function tween(ms, fn, easing = ease.inOut) {
    return new Promise((resolve) => {
      if (reduceMotion) { fn(1); resolve(); return; }
      const start = performance.now();
      (function frame(now) {
        const p = Math.min(1, (now - start) / ms);
        fn(easing(p));
        if (p < 1) requestAnimationFrame(frame); else resolve();
      })(start);
    });
  }

  function svgEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    fx.appendChild(el);
    return el;
  }

  // ---------- Sounds ----------
  const sfx = {
    cry() { Sound.tone(560, 0.35, 0, 'triangle', 0.05, 400); Sound.tone(520, 0.45, 0.4, 'triangle', 0.05, 360); },
    zoom() { Sound.tone(300, 0.6, 0, 'triangle', 0.04, 1200); },
    water() { for (let i = 0; i < 10; i++) Sound.tone(500 + Math.random() * 600, 0.06, i * 0.12, 'triangle', 0.03, 900 + Math.random() * 400); },
    dab() { [0, 0.3, 0.6].forEach((d) => Sound.tone(260, 0.08, d, 'triangle', 0.05, 200)); },
    stick() { Sound.tone(700, 0.08, 0, 'square', 0.05, 1400); },
    gloves() { Sound.tone(300, 0.1, 0, 'triangle', 0.05, 600); Sound.tone(450, 0.1, 0.15, 'triangle', 0.05, 800); },
    good() { Sound.tone(880, 0.07); Sound.tone(1320, 0.14, 0.06); },
    bad() { Sound.tone(220, 0.18, 0, 'square', 0.06, 160); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => Sound.tone(f, 0.12, i * 0.1)); },
  };

  // ---------- Text overlays (re-translated when the language changes) ----------
  function say(el, key, vars) {
    el.dataset.key = key;
    el.dataset.vars = vars ? JSON.stringify(vars) : '';
    el.textContent = t(key, vars);
    el.hidden = false;
  }
  function retranslate(el) {
    if (el.hidden || !el.dataset.key) return;
    el.textContent = t(el.dataset.key, el.dataset.vars ? JSON.parse(el.dataset.vars) : undefined);
  }

  const bubble = $('#bubble');
  const toast = $('#toast');
  const narrator = $('#narrator');
  const narratorText = $('#narrator-text');
  const narratorBtn = $('#narrator-btn');
  let narratorAction = null;

  function showNarrator(textKey, btnKey, action) {
    say(narratorText, textKey);
    say(narratorBtn, btnKey);
    narratorAction = action;
    narrator.hidden = false;
    narratorBtn.focus({ preventScroll: true });
  }
  narratorBtn.addEventListener('click', () => {
    narrator.hidden = true;
    const action = narratorAction;
    narratorAction = null;
    if (action) action();
  });

  let toastTimer = null;
  function showToast(key, vars, kind) {
    say(toast, key, vars);
    toast.className = 'toast ' + (kind || '');
    toast.style.animation = 'none';
    void toast.offsetWidth;
    toast.style.animation = '';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  // ---------- Face, happiness and wound picture ----------
  const FACES = ['cry', 'sad', 'sad', 'ok', 'ok', 'happy']; // one per step reached
  function setFace(name) {
    document.querySelectorAll('#meter .face').forEach((f) => { f.style.display = f.id === 'face-' + name ? '' : 'none'; });
  }
  function updateMeter() {
    $('#meter-fill').style.width = (step / STEPS.length) * 100 + '%';
  }
  function setWound(state) {
    document.querySelectorAll('#wound .state').forEach((img) => img.classList.toggle('on', img.dataset.state === state));
  }
  function renderBanner() {
    if (step >= STEPS.length) { $('#banner').hidden = true; return; }
    $('#banner-step').textContent = t('r2.step', { n: step + 1, total: STEPS.length });
    $('#banner-goal').textContent = t(STEPS[step].goal);
    $('#banner').hidden = false;
  }

  // ---------- Scene 1: the accident video ----------
  function playVideo() {
    vid.classList.remove('zoom');
    vid.hidden = false;
    vid.currentTime = 0;
    vid.playbackRate = VIDEO_SPEED;
    $('#skip-btn').hidden = false;
    Music.stop(); // the video has its own sound
    const p = vid.play();
    if (p && p.catch) p.catch(afterVideo); // could not play: carry on with the story
  }
  // Some browsers reset the speed when playback starts, so set it again.
  vid.addEventListener('play', () => { vid.playbackRate = VIDEO_SPEED; });
  vid.addEventListener('ended', afterVideo);
  vid.addEventListener('error', afterVideo);
  $('#skip-btn').addEventListener('click', () => { vid.pause(); afterVideo(); });

  let videoDone = false;
  async function afterVideo() {
    if (videoDone) return;
    videoDone = true;
    $('#skip-btn').hidden = true;
    Music.play();
    say(bubble, 'r2.ouch');
    sfx.cry();
    await wait(1200);
    showNarrator('r2.narr1', 'r2.help', startTreatment);
  }

  // ---------- Scenes 2 & 3: zoom in and treat ----------
  let step = 0;
  let mistakes = 0;
  let treating = false;
  let busy = false;

  async function startTreatment() {
    bubble.hidden = true;
    sfx.zoom();
    vid.classList.add('zoom');
    await wait(700);
    closeup.hidden = false;
    r2.classList.add('treating');
    buildTray();
    await wait(900);
    vid.pause();
    vid.hidden = true;
    glow.hidden = false;
    setFace('cry');
    $('#meter').hidden = false;
    updateMeter();
    renderBanner();
    showToast('r2.narr2');
    treating = true;
  }

  function buildTray() {
    const tools = $('#tools');
    tools.innerHTML = '';
    const order = TOOLS.slice().sort(() => Math.random() - 0.5);
    order.forEach((tool, n) => {
      const btn = document.createElement('button');
      btn.className = 'tool';
      btn.style.setProperty('--n', n);
      btn.dataset.key = tool.key;
      const icon = tool.symbol
        ? `<svg viewBox="0 0 100 100"><use href="#${tool.symbol}"/></svg>`
        : `<img src="${tool.image}" alt="">`;
      btn.innerHTML = `<span class="tool-icon">${icon}</span><span class="tool-name" data-i18n="${tool.name}"></span>`;
      tools.appendChild(btn);
      makeDraggable(btn, tool);
    });
    applyI18n(tools);
  }

  // Drag a tool onto the wound, or just tap/click it to use it.
  function makeDraggable(btn, tool) {
    btn.addEventListener('click', (e) => { if (e.detail === 0) useTool(tool, btn); }); // keyboard

    btn.addEventListener('pointerdown', (e) => {
      if (!treating || busy || btn.classList.contains('used')) return;
      e.preventDefault();
      const sx = e.clientX;
      const sy = e.clientY;
      let ghost = null;
      btn.setPointerCapture(e.pointerId);

      const move = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
          ghost = document.createElement('div');
          ghost.className = 'ghost';
          ghost.innerHTML = btn.querySelector('.tool-icon').innerHTML;
          document.body.appendChild(ghost);
          btn.classList.add('dragging');
        }
        if (ghost) {
          ghost.style.transform = `translate(${ev.clientX - 42}px, ${ev.clientY - 42}px)`;
          glow.classList.toggle('hot', overTarget(ev, tool));
        }
      };
      const up = (ev) => {
        btn.removeEventListener('pointermove', move);
        btn.removeEventListener('pointerup', up);
        btn.removeEventListener('pointercancel', up);
        btn.classList.remove('dragging');
        glow.classList.remove('hot');
        if (!ghost) { if (ev.type === 'pointerup') useTool(tool, btn); return; }
        if (ev.type === 'pointerup' && overTarget(ev, tool)) {
          ghost.remove();
          useTool(tool, btn);
        } else {
          flyBack(ghost, btn);
        }
      };
      btn.addEventListener('pointermove', move);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    });
  }

  // Gloves go on your own hands, so anywhere on the scene counts; everything else must reach the wound.
  function overTarget(ev, tool) {
    const r = (tool.key === 'gloves' ? $('#scene-wrap') : glow).getBoundingClientRect();
    return ev.clientX > r.left && ev.clientX < r.right && ev.clientY > r.top && ev.clientY < r.bottom;
  }

  function flyBack(ghost, btn) {
    const r = btn.getBoundingClientRect();
    ghost.animate(
      [{ transform: ghost.style.transform }, { transform: `translate(${r.left + r.width / 2 - 42}px, ${r.top + r.height / 2 - 42}px) scale(0.6)`, opacity: 0.3 }],
      { duration: reduceMotion ? 1 : 300, easing: 'ease-in' }
    ).onfinish = () => ghost.remove();
  }

  async function useTool(tool, btn) {
    if (!treating || busy || btn.classList.contains('used')) return;
    const current = STEPS[step];

    if (tool.key !== current.tool) {
      mistakes++;
      sfx.bad();
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
      // Explain why: either the item isn't for scrapes, or it's the right item at the wrong time.
      if (tool.wrong) showToast(tool.wrong, null, 'bad');
      else showToast('r2.order', { goal: t(current.goal) }, 'bad');
      setFace('sad');
      setTimeout(() => { if (treating) setFace(FACES[step]); }, 1200);
      return;
    }

    busy = true;
    btn.classList.add('used');
    await ACTIONS[tool.key]();
    step++;
    sfx.good();
    burst(glow);
    setFace(FACES[step]);
    updateMeter();
    showToast(current.done, null, 'good');
    if (step < STEPS.length) {
      renderBanner();
      $('#banner').classList.remove('bump');
      void $('#banner').offsetWidth;
      $('#banner').classList.add('bump');
      busy = false;
    } else {
      finish();
    }
  }

  // ---------- What each correct item does (fx coordinates: -50..50 across the wound) ----------
  const ACTIONS = {
    async gloves() {
      sfx.gloves();
      $('#hands').classList.add('on');
      await wait(700);
    },

    async water() {
      const bottle = svgEl('use', { href: '#sym-water', x: 8, y: -78, width: 34, height: 34 });
      await tween(400, (p) => bottle.setAttribute('transform', `rotate(${-115 * p} 25 -61)`), ease.out);
      sfx.water();
      const end = performance.now() + (reduceMotion ? 0 : 1500);
      while (performance.now() < end) {
        const d = svgEl('circle', { cx: 2 + Math.random() * 6, cy: -46, r: 1.6, fill: '#5ec8ff' });
        const tx = (Math.random() - 0.5) * 40;
        tween(380, (p) => { d.setAttribute('transform', `translate(${tx * p} ${44 * p})`); d.setAttribute('opacity', 1 - p * 0.7); }, ease.in)
          .then(() => d.remove());
        await wait(50);
      }
      setWound('rinsed'); // the running blood washes away
      await tween(500, (p) => bottle.setAttribute('opacity', 1 - p));
      bottle.remove();
    },

    async gauze() {
      const pad = svgEl('image', { href: 'assets/items/gauze.png', x: -28, y: -90, width: 56, height: 28 });
      await tween(350, (p) => pad.setAttribute('y', lerp(-90, -14, p)), ease.out);
      sfx.dab();
      for (let i = 0; i < 3; i++) {
        await tween(150, (p) => pad.setAttribute('y', lerp(-14, -8, p)));
        await tween(150, (p) => pad.setAttribute('y', lerp(-8, -14, p)));
      }
      setWound('dried'); // patted dry
      await tween(400, (p) => {
        pad.setAttribute('y', lerp(-14, -80, p));
        pad.setAttribute('opacity', 1 - p);
      });
      pad.remove();
    },

    async iodine() {
      const bottle = svgEl('image', { href: 'assets/items/iodine.png', x: 10, y: -88, width: 16, height: 40 });
      await tween(400, (p) => bottle.setAttribute('transform', `rotate(${-120 * p} 18 -68)`), ease.out);
      sfx.water();
      const end = performance.now() + (reduceMotion ? 0 : 1200);
      while (performance.now() < end) {
        const d = svgEl('circle', { cx: 0 + Math.random() * 6, cy: -50, r: 1.5, fill: '#b5561d' });
        const tx = (Math.random() - 0.5) * 36;
        tween(380, (p) => { d.setAttribute('transform', `translate(${tx * p} ${48 * p})`); d.setAttribute('opacity', 1 - p * 0.7); }, ease.in)
          .then(() => d.remove());
        await wait(70);
      }
      setWound('iodine'); // antiseptic leaves the wound orange-brown
      await tween(500, (p) => bottle.setAttribute('opacity', 1 - p));
      bottle.remove();
    },

    async plaster() {
      sfx.stick();
      const covered = $('#wound .state[data-state="covered"]');
      covered.classList.remove('stick');
      void covered.offsetWidth;
      covered.classList.add('stick');
      setWound('covered');
      await wait(600);
    },
  };

  // ---------- Ending ----------
  async function finish() {
    treating = false;
    glow.hidden = true;
    $('#banner').hidden = true;
    await wait(900);
    $('#hands').classList.remove('on');
    setFace('happy');
    sfx.win();
    say(bubble, 'r2.thanks');
    await wait(1600);
    showNarrator('r2.narrEnd', 'r1.next', showResults);
  }

  function showResults() {
    bubble.hidden = true;
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    const roomStars = store.get('littlemedic.roomStars', {});
    if (stars > (roomStars[2] || 0)) {
      roomStars[2] = stars;
      store.set('littlemedic.roomStars', roomStars);
    }
    Arcade.refreshHud();
    $('#result-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : ''}">&#9733;</span>`).join('');
    say($('#result-mistakes'), 'r2.mistakes', { n: mistakes });
    $('#result-card').hidden = false;
    $('#again-btn').focus({ preventScroll: true });
  }

  // ---------- Reset & controls ----------
  function reset() {
    step = 0;
    mistakes = 0;
    busy = false;
    treating = false;
    videoDone = false;
    fx.innerHTML = '';
    setWound('bleeding');
    glow.hidden = true;
    closeup.hidden = true;
    $('#hands').classList.remove('on');
    $('#meter').hidden = true;
    $('#banner').hidden = true;
    bubble.hidden = true;
    toast.hidden = true;
    narrator.hidden = true;
    $('#result-card').hidden = true;
    r2.classList.remove('treating');
  }

  function leave() {
    Music.stop();
    vid.pause();
    Sound.back();
    goTo('lobby.html');
  }

  $('#play-btn').addEventListener('click', () => {
    $('#intro-card').hidden = true;
    Sound.coin();
    playVideo();
  });
  $('#again-btn').addEventListener('click', () => { reset(); playVideo(); });
  $('#lobby-btn').addEventListener('click', leave);
  $('#exit-btn').addEventListener('click', (e) => { e.preventDefault(); leave(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') leave(); });

  window.addEventListener('langchange', () => {
    [bubble, toast, narratorText, narratorBtn, $('#result-mistakes')].forEach(retranslate);
    if (treating) renderBanner();
  });

  glow.hidden = true;
  Music.play();
  $('#play-btn').focus({ preventScroll: true });
})();
