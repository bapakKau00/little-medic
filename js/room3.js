// Room 3: Mystery cards, a teacher-led review. The teacher flips a card, the kids buzz in
// with what the item is for, then ITEM FUNCTION shows the explanation for everyone. No scoring.
(() => {
  const { $, Sound, Music, burst, goTo, t, applyI18n } = Arcade;

  // One card per item. Names come from i18n.js (name key); explanations are fn.<key>.
  const CARDS = [
    { key: 'gloves', name: 'tool.gloves', img: 'assets/items/gloves.png' },
    { key: 'water', name: 'tool.water', img: 'assets/items/antiseptic.png' },
    { key: 'gauze', name: 'tool.gauze', img: 'assets/items/gauze.png' },
    { key: 'iodine', name: 'tool.iodine', img: 'assets/items/iodine.png' },
    { key: 'plaster', name: 'tool.plaster', img: 'assets/items/plaster.png' },
    { key: 'bandage', name: 'item.bandage', img: 'assets/items/bandage.png' },
    { key: 'triangular', name: 'item.triangular', img: 'assets/items/triangular.png' },
    { key: 'scissors', name: 'item.scissors', img: 'assets/items/scissors.png' },
  ];

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const sfx = {
    flip() { Sound.tone(500, 0.12, 0, 'triangle', 0.05, 900); },
    reveal() { [659, 784, 1047].forEach((f, i) => Sound.tone(f, 0.1, i * 0.08)); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => Sound.tone(f, 0.12, i * 0.1)); },
  };

  // ---------- State ----------
  let seen = new Set(); // cards whose function has been shown
  let open = null;      // { card, el } while the explanation is showing

  function updateStatus() {
    $('#progress-text').textContent = t('r3.cards', { n: seen.size, total: CARDS.length });
    $('#progress-fill').style.width = (seen.size / CARDS.length) * 100 + '%';
  }

  // ---------- Cards ----------
  const grid = $('#grid3');

  function buildCards() {
    grid.innerHTML = '';
    shuffle(CARDS).forEach((card, n) => {
      const el = document.createElement('div');
      el.className = 'card3';
      el.style.setProperty('--n', n);
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.innerHTML = `
        <div class="card3-inner">
          <div class="face front">
            <span class="qmark" aria-hidden="true">?</span>
            <span class="what" data-i18n="r3.what"></span>
          </div>
          <div class="face back">
            <span class="badge3" aria-hidden="true">✔</span>
            <img src="${card.img}" alt="">
            <span class="item-name" data-i18n="${card.name}" hidden></span>
            <button class="name-btn" data-i18n="r3.nameBtn" tabindex="-1"></button>
            <button class="fn-btn" data-i18n="r3.fn" tabindex="-1"></button>
          </div>
        </div>`;
      grid.appendChild(el);

      const flip = () => {
        if (el.classList.contains('flipped')) return;
        el.classList.add('flipped');
        el.querySelector('.name-btn').tabIndex = 0;
        el.querySelector('.fn-btn').tabIndex = 0;
        sfx.flip();
      };
      // The name stays hidden until the teacher reveals it, so the kids can guess first.
      const nameBtn = el.querySelector('.name-btn');
      nameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        nameBtn.hidden = true;
        el.querySelector('.item-name').hidden = false;
        el.setAttribute('aria-label', t(card.name));
        sfx.flip();
        el.querySelector('.fn-btn').focus({ preventScroll: true });
      });
      el.addEventListener('click', flip);
      el.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); flip(); }
      });
      el.querySelector('.fn-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        showFunction(card, el);
      });
    });
    applyI18n(grid);
  }

  // ---------- Item function (big, for the whole class) ----------
  function renderFunction() {
    if (!open) return;
    $('#fn-img').src = open.card.img;
    $('#fn-name').textContent = t(open.card.name);
    $('#fn-text').textContent = t('fn.' + open.card.key);
  }

  function showFunction(card, el) {
    open = { card, el };
    renderFunction();
    $('#fn3').hidden = false;
    sfx.reveal();
    burst(el);
    seen.add(card.key);
    el.classList.add('seen');
    updateStatus();
    $('#fn-close').focus({ preventScroll: true });
  }

  function closeFunction() {
    const el = open && open.el;
    open = null;
    $('#fn3').hidden = true;
    if (el) el.querySelector('.fn-btn').focus({ preventScroll: true });
    if (seen.size === CARDS.length) finish();
  }
  $('#fn-close').addEventListener('click', closeFunction);

  // ---------- Start / end ----------
  function start() {
    seen = new Set();
    open = null;
    buildCards();
    updateStatus();
    $('#intro3').hidden = true;
    $('#result3').hidden = true;
    const first = grid.querySelector('.card3');
    if (first) first.focus({ preventScroll: true });
  }

  function finish() {
    sfx.win();
    $('#result3').hidden = false;
    $('#again3').focus({ preventScroll: true });
  }

  function leave() {
    Music.stop();
    Sound.back();
    goTo('lobby.html');
  }

  // Browser full screen on/off (hidden where the browser doesn't support it, e.g. iPhone).
  const fsBtn = $('#fs-btn');
  if (!document.documentElement.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });

  $('#start3').addEventListener('click', () => { Sound.coin(); start(); });
  $('#again3').addEventListener('click', () => { Sound.coin(); start(); });
  $('#lobby3').addEventListener('click', leave);
  $('#exit-btn').addEventListener('click', (e) => { e.preventDefault(); leave(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || document.fullscreenElement) return;
    if (open) closeFunction();
    else leave();
  });

  window.addEventListener('langchange', () => {
    updateStatus();
    renderFunction();
  });

  // Show face-down cards behind the intro popup.
  buildCards();
  updateStatus();
  Music.play();
  $('#start3').focus({ preventScroll: true });
})();
