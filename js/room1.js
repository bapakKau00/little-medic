// Room 1: Pukulan Kilat. Whack the first aid items, avoid the mice.
(() => {
  const { $, Sound, Music, store, burst, goTo, t } = Arcade;

  const GAME_TIME = 45;

  // First aid items use the pictures in assets/items (file defaults to <key>.png). width = % of the hole opening.
  // Names and facts are in i18n.js (item.<key>, fact.<key>).
  const ITEMS = [
    { key: 'water', file: 'antiseptic.png', width: 40 },
    { key: 'iodine', width: 30 },
    { key: 'bandage', width: 72 },
    { key: 'cotton', width: 86 },
    { key: 'plaster', width: 100 },
    { key: 'scissors', width: 72 },
    { key: 'triangular', width: 90 },
  ];
  const MOUSE = { key: 'mouse', width: 80, bad: true, pixel: true };

  // Each value pair is [start of round, end of round]; the game blends between them as time runs out.
  const DIFFS = {
    easy: { interval: [1150, 750], up: [1900, 1250], mouse: [0.2, 0.3], doubleAfter: 1, doubleChance: 0, stars: [50, 140, 240] },
    normal: { interval: [950, 500], up: [1500, 850], mouse: [0.25, 0.4], doubleAfter: 0.45, doubleChance: 0.35, stars: [80, 200, 350] },
    hard: { interval: [800, 400], up: [1200, 650], mouse: [0.3, 0.45], doubleAfter: 0.2, doubleChance: 0.5, stars: [100, 260, 450] },
  };
  const lerp = ([a, b], p) => a + (b - a) * p;

  // Holes in 3 rows: back (smaller, further away), middle, front. x/y are % of the board.
  const HOLES = [
    { x: 30, y: 20, s: 0.78, row: 1 }, { x: 50, y: 20, s: 0.78, row: 1 }, { x: 70, y: 20, s: 0.78, row: 1 },
    { x: 20, y: 50, s: 0.89, row: 2 }, { x: 40, y: 50, s: 0.89, row: 2 }, { x: 60, y: 50, s: 0.89, row: 2 }, { x: 80, y: 50, s: 0.89, row: 2 },
    { x: 27, y: 80, s: 1, row: 3 }, { x: 50, y: 80, s: 1, row: 3 }, { x: 73, y: 80, s: 1, row: 3 },
  ];

  const img = { mouse: spriteURL('mouse', 8) };
  ITEMS.forEach((it) => {
    img[it.key] = `assets/items/${it.file || it.key + '.png'}`;
    new Image().src = img[it.key]; // preload
  });

  const board = $('#board');
  const machine = $('#machine');

  // ---------- Build holes ----------
  const holes = HOLES.map((h) => {
    const el = document.createElement('div');
    el.className = 'hole';
    el.style.left = h.x + '%';
    el.style.top = h.y + '%';
    el.style.zIndex = h.row;
    el.style.setProperty('--s', h.s);
    el.innerHTML = `
      <div class="ring"></div>
      <div class="pit"></div>
      <div class="mask"><div class="popper"><img alt=""></div></div>
      <div class="ring-front"></div>`;
    board.appendChild(el);
    const hole = { el, def: h, popper: el.querySelector('.popper'), pic: el.querySelector('.popper img'), busy: false, up: false, entity: null, timer: null };
    el.addEventListener('pointerdown', (e) => {
      if (!running || !hole.up) return;
      e.stopPropagation();
      swingAt(e);
      hit(hole);
    });
    return hole;
  });

  // ---------- Popup 1: one card per item, plus the mouse ----------
  function renderCards() {
    $('#item-cards').innerHTML = ITEMS.map((it, n) =>
      `<div class="item-card" style="--n:${n}"><img src="${img[it.key]}" alt=""><span>${t('item.' + it.key)}</span></div>`
    ).join('') + `<div class="item-card bad" style="--n:${ITEMS.length}"><img class="px" src="${img.mouse}" alt=""><span>${t('item.mouse')}</span></div>`;
  }
  renderCards();

  // ---------- Difficulty ----------
  let diff = store.get('littlemedic.room1.diff', 'normal');
  if (!DIFFS[diff]) diff = 'normal';
  const diffBtns = [...document.querySelectorAll('.diff-btn')];

  function setDiff(d) {
    diff = d;
    store.set('littlemedic.room1.diff', d);
    diffBtns.forEach((b) => {
      const on = b.dataset.diff === d;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    updateLeds();
  }
  diffBtns.forEach((b) => b.addEventListener('click', () => { Sound.move(); setDiff(b.dataset.diff); }));

  // Best score is kept per difficulty. (Older saves had a single best, which counts as Normal.)
  const best = () => store.get('littlemedic.room1.best.' + diff, diff === 'normal' ? store.get('littlemedic.room1.best', 0) : 0);

  // ---------- Sounds ----------
  const sfx = {
    pop() { Sound.tone(420, 0.08, 0, 'triangle', 0.05, 700); },
    good() { Sound.tone(880, 0.07); Sound.tone(1320, 0.14, 0.06); },
    bad() { Sound.tone(160, 0.2, 0, 'square', 0.08, 70); Sound.tone(1800, 0.08, 0.05, 'triangle', 0.05, 2600); },
    combo() { [659, 784, 988, 1319].forEach((f, i) => Sound.tone(f, 0.08, i * 0.05)); },
    whoosh() { Sound.tone(300, 0.06, 0, 'triangle', 0.03, 150); },
    tick() { Sound.tone(600, 0.1); },
    go() { Sound.tone(1200, 0.3); },
    end() { [784, 659, 523, 392].forEach((f, i) => Sound.tone(f, 0.15, i * 0.12)); },
  };

  // ---------- Hammer ----------
  const hammer = $('#hammer');
  const aim = $('#aim');
  let hammerUnit = 0.9;

  function sizeHammer() {
    const hw = Math.max(60, Math.min(110, machine.offsetWidth * 0.13));
    hammer.style.setProperty('--hw', hw + 'px');
    hammerUnit = hw / 100;
  }

  // Positions the hammer so its head lands on (x, y) at the bottom of the swing.
  function moveHammer(x, y) {
    hammer.style.transform = `translate(${x + 18.8 * hammerUnit}px, ${y - 53 * hammerUnit}px)`;
    aim.style.transform = `translate(${x}px, ${y}px)`;
  }

  function swingAt(e) {
    moveHammer(e.clientX, e.clientY);
    hammer.classList.add('show');
    hammer.classList.remove('swing');
    void hammer.offsetWidth; // restart the animation
    hammer.classList.add('swing');
    if (e.pointerType !== 'mouse') {
      clearTimeout(swingAt.hideTimer);
      swingAt.hideTimer = setTimeout(() => hammer.classList.remove('show'), 450);
    }
  }

  machine.addEventListener('pointermove', (e) => {
    if (!running || e.pointerType !== 'mouse') return;
    moveHammer(e.clientX, e.clientY);
    hammer.classList.add('show');
    aim.classList.add('show');
  });
  machine.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    hammer.classList.remove('show');
    aim.classList.remove('show');
  });
  machine.addEventListener('pointerdown', (e) => {
    if (!running) return;
    swingAt(e);
    sfx.whoosh();
  });

  // ---------- Game state ----------
  let running = false;
  let score = 0;
  let timeLeft = GAME_TIME;
  let goodHits = 0;
  let badHits = 0;
  let missed = 0;
  let combo = 0;
  let bestCombo = 0;
  let hitKeys = new Set();
  let spawnTimer = null;
  let clockTimer = null;
  let lastHole = -1;
  let lastResult = null;

  const pad3 = (n) => String(n).padStart(3, '0');
  const multiplier = () => (combo >= 6 ? 3 : combo >= 3 ? 2 : 1);

  function updateLeds() {
    $('#score-led').textContent = pad3(score);
    $('#time-led').textContent = String(timeLeft).padStart(2, '0');
    $('#time-led').classList.toggle('low', running && timeLeft <= 5);
    $('#best-led').textContent = pad3(best());
  }

  function updateCombo(bump) {
    const el = $('#combo');
    if (combo < 2) { el.hidden = true; return; }
    const m = multiplier();
    el.hidden = false;
    el.textContent = t('r1.combo', { n: combo }) + (m > 1 ? '  x' + m : '');
    el.classList.toggle('x3', m === 3);
    if (bump) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  function resetCombo() {
    combo = 0;
    updateCombo(false);
  }

  function popText(x, y, text, cls) {
    const el = document.createElement('div');
    el.className = 'pop-text ' + cls;
    el.textContent = text;
    el.style.left = x + '%';
    el.style.top = y + '%';
    board.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  function show(hole, entity, upTime) {
    hole.busy = true;
    hole.up = true;
    hole.entity = entity;
    hole.pic.src = img[entity.key];
    hole.pic.classList.toggle('px', !!entity.pixel);
    hole.popper.style.width = entity.width + '%';
    hole.popper.classList.remove('hit');
    hole.popper.classList.add('up');
    sfx.pop();
    hole.timer = setTimeout(() => hide(hole), upTime);
  }

  function hide(hole, wasHit) {
    clearTimeout(hole.timer);
    if (!hole.up) return;
    hole.up = false;
    // A first aid item that got away breaks the combo.
    if (!wasHit && !hole.entity.bad && running) {
      missed++;
      resetCombo();
    }
    hole.popper.classList.remove('up');
    setTimeout(() => { hole.busy = false; }, 200);
  }

  function hit(hole) {
    const it = hole.entity;
    const textY = hole.def.y - 12 * hole.def.s;
    clearTimeout(hole.timer);
    hole.popper.classList.add('hit');
    hitKeys.add(it.key);

    if (it.bad) {
      score = Math.max(0, score - 5);
      badHits++;
      resetCombo();
      popText(hole.def.x, textY, t('r1.yuck'), 'bad');
      sfx.bad();
      machine.classList.remove('shake');
      void machine.offsetWidth;
      machine.classList.add('shake');
    } else {
      const before = multiplier();
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      const m = multiplier();
      score += 10 * m;
      goodHits++;
      popText(hole.def.x, textY, `+${10 * m} ${t('item.' + it.key)}`, 'good');
      burst(hole.popper);
      if (m > before) {
        popText(50, 42, t('r1.comboUp', { m }), 'combo-text');
        sfx.combo();
      } else {
        sfx.good();
      }
      updateCombo(true);
    }
    updateLeds();
    hole.up = false;
    setTimeout(() => {
      hole.popper.classList.remove('up');
      setTimeout(() => { hole.busy = false; }, 200);
    }, 220);
  }

  // Gets faster and sneakier as time runs out.
  function spawn() {
    if (!running) return;
    const d = DIFFS[diff];
    const p = 1 - timeLeft / GAME_TIME;
    const upTime = lerp(d.up, p);
    const count = p > d.doubleAfter && Math.random() < d.doubleChance ? 2 : 1;

    for (let n = 0; n < count; n++) {
      const free = holes.map((_, i) => i).filter((i) => !holes[i].busy && i !== lastHole);
      if (!free.length) break;
      const i = free[(Math.random() * free.length) | 0];
      lastHole = i;
      const entity = Math.random() < lerp(d.mouse, p) ? MOUSE : ITEMS[(Math.random() * ITEMS.length) | 0];
      show(holes[i], entity, upTime);
    }
    spawnTimer = setTimeout(spawn, lerp(d.interval, p));
  }

  // ---------- Flow ----------
  function countdown(done) {
    const el = $('#countdown');
    const steps = ['3', '2', '1', t('r1.go')];
    let i = 0;
    (function next() {
      if (i === steps.length) { el.textContent = ''; done(); return; }
      el.textContent = steps[i];
      el.classList.remove('tick');
      void el.offsetWidth;
      el.classList.add('tick');
      if (i === steps.length - 1) sfx.go(); else sfx.tick();
      i++;
      setTimeout(next, 650);
    })();
  }

  function startGame() {
    $('#start-screen').hidden = true;
    $('#result-screen').hidden = true;
    score = 0;
    timeLeft = GAME_TIME;
    goodHits = 0;
    badHits = 0;
    missed = 0;
    combo = 0;
    bestCombo = 0;
    hitKeys = new Set();
    updateCombo(false);
    updateLeds();
    sizeHammer();
    Sound.coin();
    countdown(() => {
      running = true;
      document.body.classList.add('playing');
      updateLeds();
      Music.setFast(false);
      spawn();
      clockTimer = setInterval(() => {
        timeLeft--;
        updateLeds();
        if (timeLeft === 10) Music.setFast(true); // hurry up!
        if (timeLeft > 0 && timeLeft <= 5) sfx.tick();
        if (timeLeft <= 0) endGame();
      }, 1000);
    });
  }

  function endGame() {
    running = false;
    clearTimeout(spawnTimer);
    clearInterval(clockTimer);
    Music.setFast(false);
    document.body.classList.remove('playing');
    hammer.classList.remove('show');
    aim.classList.remove('show');
    holes.forEach((h) => hide(h, true));
    resetCombo();
    sfx.end();

    const th = DIFFS[diff].stars;
    const stars = score >= th[2] ? 3 : score >= th[1] ? 2 : score >= th[0] ? 1 : 0;
    const isNewBest = score > best();
    if (isNewBest) store.set('littlemedic.room1.best.' + diff, score);
    if (score > store.get('littlemedic.hiscore', 0)) store.set('littlemedic.hiscore', score);
    const roomStars = store.get('littlemedic.roomStars', {});
    if (stars > (roomStars[1] || 0)) {
      roomStars[1] = stars;
      store.set('littlemedic.roomStars', roomStars);
    }
    Arcade.refreshHud();
    updateLeds();

    // Pick a fact about something the player actually hit, if anything.
    const pool = [...ITEMS, MOUSE].filter((it) => hitKeys.has(it.key));
    const from = pool.length ? pool : ITEMS;
    const factKey = from[(Math.random() * from.length) | 0].key;

    lastResult = { stars, score, isNewBest, goodHits, badHits, missed, bestCombo, factKey };
    renderResults();
    $('#result-screen').hidden = false;
    $('#again-btn').focus({ preventScroll: true });
  }

  function renderResults() {
    const r = lastResult;
    if (!r) return;
    $('#result-stars').innerHTML = [0, 1, 2].map((i) => `<span class="${i < r.stars ? 'on' : ''}">&#9733;</span>`).join('');
    $('#result-score').textContent = r.score;
    $('#result-new').hidden = !r.isNewBest;
    $('#result-stats').innerHTML = `
      <li>${t('r1.statGood', { n: r.goodHits })}</li>
      <li>${t('r1.statBad', { n: r.badHits })}</li>
      <li>${t('r1.statMissed', { n: r.missed })}</li>
      <li>${t('r1.statCombo', { n: r.bestCombo })}</li>`;
    $('#result-fact').textContent = '★ ' + t('fact.' + r.factKey);
  }

  // Switching language re-draws text that was built in code.
  window.addEventListener('langchange', () => {
    renderCards();
    renderResults();
    updateCombo(false);
  });

  // ---------- Buttons & keys ----------
  function leave() {
    running = false;
    Music.stop();
    Sound.back();
    goTo('lobby.html');
  }

  $('#next-btn').addEventListener('click', () => {
    Sound.move();
    $('#intro-screen').hidden = true;
    $('#start-screen').hidden = false;
    $('#start-btn').focus({ preventScroll: true });
  });
  $('#back-btn').addEventListener('click', () => {
    Sound.back();
    $('#start-screen').hidden = true;
    $('#intro-screen').hidden = false;
    $('#next-btn').focus({ preventScroll: true });
  });
  $('#start-btn').addEventListener('click', startGame);
  $('#again-btn').addEventListener('click', startGame);
  $('#lobby-btn').addEventListener('click', leave);
  $('#exit-btn').addEventListener('click', (e) => { e.preventDefault(); leave(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') leave();
  });

  window.addEventListener('resize', sizeHammer);
  setDiff(diff);
  Music.play();
  $('#next-btn').focus({ preventScroll: true });
})();
