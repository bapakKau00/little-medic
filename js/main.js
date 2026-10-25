// Homepage: title screen and main menu.
(() => {
  const { $, Sound, settings, saveSettings, applySettings, burst, flash, goTo, openModal, closeModal, isModalOpen, t, setLang } = Arcade;

  // ---------- Sprites ----------
  const img = {};
  Object.keys(SPRITES).forEach((name) => { img[name] = spriteURL(name, 6); });
  $('#logo-kit').src = spriteURL('kit', 9);

  // Floating items: the same first aid items as in Pukulan Kilat.
  // w = width in px; items are placed around the edges so they stay clear of the title.
  const floaters = [
    { src: 'assets/items/plaster.png', w: 86, x: 7, y: 18, dur: 4.5, rot: 10 },
    { src: 'assets/items/iodine.png', w: 38, x: 87, y: 13, dur: 5.5, rot: -14 },
    { src: 'assets/items/bandage.png', w: 72, x: 5, y: 64, dur: 6, rot: 12 },
    { src: 'assets/items/antiseptic.png', w: 40, x: 90, y: 50, dur: 5, rot: 8 },
    { src: 'assets/items/triangular.png', w: 92, x: 78, y: 78, dur: 6.5, rot: -6 },
    { src: 'assets/items/scissors.png', w: 70, x: 18, y: 84, dur: 4, rot: -10 },
    { src: 'assets/items/cotton.png', w: 78, x: 20, y: 38, dur: 5.2, rot: 16 },
  ];
  const spriteLayer = $('#sprites');
  floaters.forEach((f, i) => {
    const el = document.createElement('img');
    el.className = 'float';
    el.alt = '';
    el.src = f.src;
    el.style.width = f.w + 'px';
    el.style.left = f.x + '%';
    el.style.top = f.y + '%';
    el.style.setProperty('--dur', f.dur + 's');
    el.style.setProperty('--delay', (i * -0.7) + 's');
    el.style.setProperty('--rot', f.rot + 'deg');
    spriteLayer.appendChild(el);
  });

  // ---------- Title: split letters for the wave animation ----------
  document.querySelectorAll('.title .line').forEach((line, lineIndex) => {
    const text = line.textContent;
    line.textContent = '';
    [...text].forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      span.style.setProperty('--i', i + lineIndex * 6);
      line.appendChild(span);
    });
  });

  // ---------- Menu actions ----------
  const actions = {
    play() {
      flash();
      goTo('lobby.html');
    },
    how() {
      openModal(t('how.title'), `
        <ol class="steps">
          <li><img src="${img.heart}" alt=""><span>${t('how.step1')}</span></li>
          <li><img src="${img.kit}" alt=""><span>${t('how.step2')}</span></li>
          <li><img src="${img.thermo}" alt="" style="width:20px;margin:0 14px"><span>${t('how.step3')}</span></li>
        </ol>
        <p class="tip">${t('how.tip')}</p>`);
    },
    settings() {
      // Re-drawn in place when the language changes, so labels switch immediately.
      const render = () => {
        $('#modal-title').textContent = t('settings.title');
        $('#modal-body').innerHTML = ['sound', 'music', 'crt'].map((key) =>
          `<div class="setting"><span>${t('settings.' + key)}</span>
             <button class="toggle" data-key="${key}" aria-pressed="${settings[key]}">${t(settings[key] ? 'on' : 'off')}</button></div>`
        ).join('') +
          `<div class="setting"><span>${t('settings.lang')}</span>
             <button class="toggle" data-key="lang">${settings.lang === 'ms' ? 'BAHASA MELAYU' : 'ENGLISH'}</button></div>`;

        document.querySelectorAll('#modal-body .toggle').forEach((btn) => {
          btn.addEventListener('click', () => {
            const key = btn.dataset.key;
            Sound.move();
            if (key === 'lang') {
              setLang(settings.lang === 'ms' ? 'en' : 'ms');
            } else {
              settings[key] = !settings[key];
              saveSettings();
              applySettings();
            }
            render();
            $('#modal-body').querySelector(`[data-key="${key}"]`).focus();
          });
        });
      };
      openModal(t('settings.title'), '', render);
    },
  };

  // ---------- Menu ----------
  const menu = $('#menu');
  const items = [...document.querySelectorAll('.menu-item')];
  let active = 0;

  function setActive(i, sound) {
    i = (i + items.length) % items.length;
    if (sound && i !== active) Sound.move();
    active = i;
    items.forEach((b, j) => b.classList.toggle('is-active', j === i));
  }

  function activate(i) {
    setActive(i, false);
    Sound.select();
    burst(items[i]);
    actions[items[i].dataset.action]();
  }

  items.forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => setActive(i, true));
    btn.addEventListener('focus', () => setActive(i, true));
    btn.addEventListener('click', () => activate(i));
  });

  // ---------- Press start ----------
  let started = false;
  function start(quiet) {
    if (started) return;
    started = true;
    if (!quiet) {
      Sound.coin();
      burst($('#press-start'));
    }
    $('#press-start').classList.add('hide');
    $('#hint').classList.add('hide');
    menu.hidden = false;
    Arcade.Music.play();
    menu.classList.add('in');
    setActive(0, false);
    items[0].focus({ preventScroll: true });
  }

  $('#press-start').addEventListener('click', () => start());
  document.addEventListener('pointerdown', (e) => {
    if (!started && !e.target.closest('#sound-btn')) start();
  });

  // Coming back from the lobby skips the "press start" screen.
  if (location.hash === '#menu') start(true);

  // ---------- Keyboard ----------
  document.addEventListener('keydown', (e) => {
    if (isModalOpen()) {
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); closeModal(); }
      return;
    }
    if (!started) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
      return;
    }
    if (['ArrowDown', 's', 'S'].includes(e.key)) {
      e.preventDefault();
      items[(active + 1) % items.length].focus({ preventScroll: true });
    } else if (['ArrowUp', 'w', 'W'].includes(e.key)) {
      e.preventDefault();
      items[(active - 1 + items.length) % items.length].focus({ preventScroll: true });
    } else if ((e.key === 'Enter' || e.key === ' ') && !items.includes(document.activeElement)) {
      // A focused menu button already activates itself natively.
      e.preventDefault();
      activate(active);
    }
  });
})();
