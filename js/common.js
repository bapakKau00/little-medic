// Shared arcade helpers used by every page: saved settings, sounds, HUD, popup and effects.
window.Arcade = (() => {
  const $ = (sel) => document.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Saved data (fails silently when storage is blocked) ----------
  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
  };

  const settings = Object.assign({ sound: true, music: true, crt: true, lang: 'en' }, store.get('littlemedic.settings', {}));
  const saveSettings = () => store.set('littlemedic.settings', settings);

  // ---------- Language (strings live in i18n.js) ----------
  function t(key, vars) {
    const table = (typeof STRINGS !== 'undefined' && STRINGS[settings.lang]) || {};
    const fallback = (typeof STRINGS !== 'undefined' && STRINGS.en) || {};
    let s = table[key] !== undefined ? table[key] : (fallback[key] !== undefined ? fallback[key] : key);
    if (vars) Object.keys(vars).forEach((k) => { s = s.split('{' + k + '}').join(vars[k]); });
    return s;
  }

  // Fills every element marked data-i18n (plain text) or data-i18n-html (our own markup).
  function applyI18n(root = document) {
    document.documentElement.lang = settings.lang;
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  }

  function setLang(lang) {
    settings.lang = lang;
    saveSettings();
    applyI18n();
    applySettings();
    window.dispatchEvent(new Event('langchange'));
  }

  // ---------- Chiptune sound effects (Web Audio, no files needed) ----------
  const Sound = {
    ctx: null,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    tone(freq, dur, when = 0, type = 'square', vol = 0.07, toFreq = 0) {
      if (!settings.sound || !this.ctx) return;
      const t = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t);
      if (toFreq) osc.frequency.exponentialRampToValueAtTime(toFreq, t + dur);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    },
    move() { this.tone(660, 0.06); },
    select() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.09, i * 0.07)); },
    coin() { this.tone(988, 0.08); this.tone(1319, 0.35, 0.08); },
    back() { this.tone(392, 0.08); this.tone(262, 0.12, 0.08); },
    doorOpen() { this.tone(180, 0.22, 0, 'square', 0.04, 520); },
    doorClose() { this.tone(320, 0.12, 0, 'square', 0.05, 90); },
  };

  // Browsers only allow audio after the first tap or key press.
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { Sound.init(); Music.refresh(); }, true));

  // ---------- Background music (assets/audio/background-music.m4a, looped) ----------
  // The position is remembered between pages so the track carries on instead of restarting.
  const MUSIC_FILE = 'assets/audio/background-music.m4a';
  const MUSIC_VOLUME = 0.35;
  const Music = {
    wanted: false,
    rate: 1,
    el: null,

    audio() {
      if (!this.el) {
        this.el = new Audio(MUSIC_FILE);
        this.el.loop = true;
        this.el.volume = MUSIC_VOLUME;
        this.el.preload = 'auto';
        let pos = 0;
        try { pos = parseFloat(sessionStorage.getItem('littlemedic.musicPos')) || 0; } catch (e) { /* ignore */ }
        if (pos) this.el.addEventListener('loadedmetadata', () => { this.el.currentTime = pos % (this.el.duration || Infinity); }, { once: true });
      }
      return this.el;
    },

    play() { this.wanted = true; this.refresh(); },
    stop() { this.wanted = false; this.refresh(); },
    // Speed up for exciting moments (pitch is kept); setFast(false) goes back to normal.
    setFast(fast) {
      this.rate = fast ? 1.15 : 1;
      if (this.el) this.el.playbackRate = this.rate;
    },

    // Plays or pauses to match what the page wants and what the settings allow.
    // Browsers block sound until the first tap/key press, so a failed play is retried then.
    refresh() {
      const allowed = this.wanted && settings.sound && settings.music;
      if (allowed) {
        const a = this.audio();
        a.playbackRate = this.rate;
        if (a.paused) a.play().catch(() => {});
      } else if (this.el && !this.el.paused) {
        this.el.pause();
      }
    },
  };

  window.addEventListener('pagehide', () => {
    if (!Music.el) return;
    try { sessionStorage.setItem('littlemedic.musicPos', String(Music.el.currentTime)); } catch (e) { /* ignore */ }
  });

  // ---------- Starfield ----------
  function initStars(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const colors = ['#ffffff', '#ffffff', '#3ef0ff', '#ff3b8b', '#ffe14d'];
    let stars = [];
    let w = 0;
    let h = 0;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = Array.from({ length: Math.round((w * h) / 9000) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() < 0.85 ? 2 : 3,
        speed: 0.1 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: colors[(Math.random() * colors.length) | 0],
      }));
      if (reduceMotion) draw(0);
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t / 700 + s.phase));
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x | 0, s.y | 0, s.size, s.size);
        if (!reduceMotion) {
          s.y += s.speed;
          if (s.y > h) { s.y = -3; s.x = Math.random() * w; }
        }
      }
      ctx.globalAlpha = 1;
      if (!reduceMotion) requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    if (!reduceMotion) requestAnimationFrame(draw);
  }

  // ---------- Effects ----------
  function burst(el) {
    if (reduceMotion) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const colors = ['#ffe14d', '#ff3b5c', '#3ef0ff', '#4dff88', '#ffffff'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('span');
      p.className = 'pixel';
      p.style.left = cx + 'px';
      p.style.top = cy + 'px';
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 90;
      p.animate(
        [
          { transform: 'translate(-50%, -50%)', opacity: 1 },
          { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px))`, opacity: 0 },
        ],
        { duration: 600 + Math.random() * 300, easing: 'cubic-bezier(.2,.7,.3,1)' }
      ).onfinish = () => p.remove();
    }
  }

  function flash(color) {
    if (reduceMotion) return;
    const f = document.createElement('div');
    f.className = 'flash';
    if (color) f.style.background = color;
    document.body.appendChild(f);
    f.addEventListener('animationend', () => f.remove());
  }

  // Circle wipe, then load the next page.
  function goTo(url) {
    if (reduceMotion) { location.href = url; return; }
    const wipe = document.createElement('div');
    wipe.className = 'wipe';
    document.body.appendChild(wipe);
    wipe.addEventListener('animationend', () => { location.href = url; });
  }

  // ---------- HUD ----------
  const pad = (n, len) => String(n).padStart(len, '0');

  function applySettings() {
    const btn = $('#sound-btn');
    if (btn) {
      btn.setAttribute('aria-pressed', String(settings.sound));
      btn.textContent = '♪ ' + t(settings.sound ? 'on' : 'off');
    }
    const langBtn = $('#lang-btn');
    if (langBtn) langBtn.textContent = settings.lang === 'ms' ? 'BM' : 'EN';
    document.body.classList.toggle('no-crt', !settings.crt);
    Music.refresh();
  }

  // Stars total is the sum of the best stars earned in each room.
  function refreshHud() {
    const hi = $('#hiscore');
    const stars = $('#stars-count');
    const total = Object.values(store.get('littlemedic.roomStars', {})).reduce((a, b) => a + b, 0);
    if (hi) hi.textContent = pad(store.get('littlemedic.hiscore', 0), 6);
    if (stars) stars.textContent = '★ ' + pad(total, 2);
  }

  function initHud() {
    refreshHud();
    const btn = $('#sound-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        settings.sound = !settings.sound;
        saveSettings();
        applySettings();
        Sound.move();
      });
    }
    const langBtn = $('#lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setLang(settings.lang === 'ms' ? 'en' : 'ms');
        Sound.move();
      });
    }
    applySettings();
  }

  // ---------- Popup ----------
  const modal = $('#modal');
  let lastFocus = null;
  let onCloseCb = null;

  function openModal(title, html, onOpen, onClose) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    lastFocus = document.activeElement;
    onCloseCb = onClose || null;
    modal.hidden = false;
    $('#modal-close').focus();
    if (onOpen) onOpen();
  }

  function closeModal() {
    modal.hidden = true;
    Sound.back();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
    if (onCloseCb) { const cb = onCloseCb; onCloseCb = null; cb(); }
  }

  if (modal) {
    $('#modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  initStars($('#stars'));
  applyI18n();
  initHud();

  return {
    $, reduceMotion, store, settings, saveSettings, Sound, Music, t, applyI18n, setLang,
    burst, flash, goTo, pad, applySettings, refreshHud,
    openModal, closeModal, isModalOpen: () => !!modal && !modal.hidden,
  };
})();
