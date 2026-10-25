// Lobby: three doors. Hovering a door plays the opening frames; moving away plays them back closed.
(() => {
  const { $, Sound, burst, goTo, t } = Arcade;

  // Edit this list to change the picture behind each door (size = % of the doorway), its glow colour or link.
  // Room names and topics are in i18n.js (room1.name, room1.topic, ...).
  const ROOMS = [
    { level: 1, image: 'assets/hammer.svg', color: '#ffe14d', href: 'room1.html' },
    { level: 2, image: 'assets/kid-cycle.svg', size: '96%', color: '#3ef0ff', href: 'room2.html' },
    { level: 3, image: 'assets/question.svg', size: '58%', color: '#ff3b8b', href: 'room3.html' },
  ];
  const roomName = (room) => t(`room${room.level}.name`);
  const roomTopic = (room) => t(`room${room.level}.topic`);

  const FRAMES = ['assets/doors/door-0.png', 'assets/doors/door-1.png', 'assets/doors/door-2.png'];
  const LAST = FRAMES.length - 1;
  const FRAME_MS = 70;

  const canHover = window.matchMedia('(hover: hover)').matches;
  $('#lobby-hint').dataset.i18n = canHover ? 'lobby.hintHover' : 'lobby.hintTap';

  // Steps the door through its frames toward a target (0 = closed, LAST = open).
  // Changing the target mid-way simply reverses direction.
  function doorController(slot, frames) {
    let frame = 0;
    let target = 0;
    let timer = null;

    const render = () => frames.forEach((im, i) => im.classList.toggle('on', i === frame));

    function step() {
      if (frame === target) { timer = null; return; }
      frame += frame < target ? 1 : -1;
      render();
      timer = setTimeout(step, FRAME_MS);
    }

    function go(t) {
      if (t === target) return;
      if (t > target) Sound.doorOpen(); else Sound.doorClose();
      target = t;
      slot.classList.toggle('is-open', t === LAST);
      if (!timer) step();
    }

    render();
    return {
      open: () => go(LAST),
      close: () => go(0),
      msUntilOpen: () => (LAST - frame) * FRAME_MS,
    };
  }

  // ---------- Build the doors ----------
  const doorsEl = $('#doors');
  const buttons = [];
  let entering = false;

  ROOMS.forEach((room) => {
    const slot = document.createElement('div');
    slot.className = 'door-slot';
    slot.style.setProperty('--glow', room.color);
    slot.innerHTML = `
      <div class="sign" aria-hidden="true"><span class="sign-num">${room.level}</span><span data-i18n="room${room.level}.name"></span></div>
      <button class="door">
        <span class="room"><img class="room-item art" src="${room.image}"${room.size ? ` style="width:${room.size}"` : ''} alt=""></span>
        <span class="spill"></span>
        ${FRAMES.map((src) => `<img class="frame" src="${src}" alt="">`).join('')}
      </button>
      <p class="door-topic" data-i18n="room${room.level}.topic"></p>`;
    doorsEl.appendChild(slot);

    const btn = slot.querySelector('.door');
    const label = () => btn.setAttribute('aria-label', `${t('lobby.level', { n: room.level })}: ${roomName(room)}, ${roomTopic(room)}`);
    label();
    window.addEventListener('langchange', label);
    const door = doorController(slot, [...slot.querySelectorAll('.frame')]);
    buttons.push(btn);

    btn.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') door.open(); });
    btn.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !entering) door.close(); });
    btn.addEventListener('focus', () => door.open());
    btn.addEventListener('blur', () => { if (!entering) door.close(); });
    btn.addEventListener('click', () => enter(room, btn, door));
  });

  Arcade.applyI18n(); // fill in the text for the doors and hint just added
  Arcade.Music.play();

  // ---------- Walk through a door ----------
  const lobby = $('#lobby');

  function enter(room, btn, door) {
    if (entering) return;
    entering = true;
    door.open();
    setTimeout(() => {
      Sound.select();
      burst(btn);

      // Zoom the lobby into the doorway.
      const lr = lobby.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      const cx = br.left - lr.left + br.width * 0.3;
      const cy = br.top - lr.top + br.height * 0.5;
      lobby.style.transformOrigin = `${cx}px ${cy}px`;
      lobby.classList.add('zooming');

      setTimeout(() => { location.href = room.href; }, Arcade.reduceMotion ? 0 : 550);
    }, door.msUntilOpen() + 120);
  }

  // Coming back with the browser's Back button restores the zoomed page from cache; reset it.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    lobby.classList.remove('zooming');
    entering = false;
    buttons.forEach((b) => b.blur());
    document.querySelectorAll('.door-slot.is-open').forEach((s) => s.querySelector('.door').dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' })));
  });

  // ---------- Exit ----------
  function exit() {
    Sound.back();
    goTo('index.html#menu');
  }
  $('#exit-btn').addEventListener('click', (e) => { e.preventDefault(); exit(); });

  // ---------- Keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (entering) return;
    const i = buttons.indexOf(document.activeElement);
    if (['ArrowRight', 'd', 'D'].includes(e.key)) {
      e.preventDefault();
      buttons[i < 0 ? 0 : (i + 1) % buttons.length].focus();
    } else if (['ArrowLeft', 'a', 'A'].includes(e.key)) {
      e.preventDefault();
      buttons[i < 0 ? buttons.length - 1 : (i - 1 + buttons.length) % buttons.length].focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      exit();
    }
  });
})();
