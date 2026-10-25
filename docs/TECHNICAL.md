# Little Medic: Technical Documentation

## 1. Purpose of the game

**Little Medic** is a browser game that teaches primary-school children basic first aid. It covers what the items in a first-aid kit are, what each is used for, and how to treat a minor wound in the correct order. It has an arcade theme so it feels like play rather than a lesson, and every screen is available in **Bahasa Melayu and English**.

The game has three rooms. Each one reinforces the topic in a different way:

| Room | Name | Learning goal | How it teaches |
|---|---|---|---|
| 1 | **Pukulan Kilat** (*Adakah anda tangkas?*) | Recognise first-aid items and tell them apart from hazards | Whack-a-mole: hit the first-aid items, avoid the germ-carrying mice. Each item shows its name when hit, and the results screen gives a fact about it. |
| 2 | **Taman Permainan** (*Bantu wira kecil!*) | Treat a minor wound safely and **in the correct order** | A short story: a child falls off a bicycle. The player treats the knee step by step: gloves → clean water → gauze → antiseptic (iodine) → plaster. Wrong choices are explained instead of punished. |
| 3 | **Kad Misteri** (*Kenali, ingat dan fahami!*) | Remember each item's name and function | A teacher-led class activity. The teacher flips a card, students buzz in to name the item, then to say what it is for, and the explanation is shown in large text for discussion. |

A lobby with three animated doors connects the rooms, and the homepage provides settings (sound, music, scanlines, language) and instructions.

---

## 2. Technical stack

The game is a **static website**: plain HTML, CSS and JavaScript with no framework, no build step and no server-side code. It runs by opening `index.html` in any modern browser and can be hosted on any static host, such as GitHub Pages.

| Layer | Technology | Used for |
|---|---|---|
| Structure | **HTML5** | One page per screen (`index`, `lobby`, `room1`–`room3`) |
| Styling and layout | **CSS3**: custom properties, Flexbox, Grid, container query units (`cqw`), 3D transforms, `@keyframes`, `:has()` | Arcade look, responsive layout, almost all animation |
| Logic | **JavaScript (ES2017+)**, no libraries | Game rules, input, state, text switching |
| 2D drawing | **Canvas 2D API** | Starfield background; turning pixel-art grids into images |
| Vector graphics | **SVG** | Hammer, question mark, cyclist, gloves overlay, water/gauze/iodine effects in Room 2 |
| Sound effects | **Web Audio API** (oscillators) | All sound effects are synthesised in code, so no audio files are needed |
| Music | **HTML5 `<audio>`** | Looping background track (`assets/audio/background-music.m4a`) |
| Video | **HTML5 `<video>`** | Room 2 accident scene, played at 0.5× speed |
| Input | **Pointer Events**, keyboard events | Mouse, touch and pen with one code path; keyboard navigation |
| Storage | **localStorage**, **sessionStorage** | Settings, high scores, stars; music position between pages |
| Other browser APIs | Fullscreen API, `requestAnimationFrame`, `matchMedia` | Room 3 full-screen mode, smooth tweens, reduced-motion and hover detection |
| Fonts | Google Fonts: **Press Start 2P**, **VT323** (SIL Open Font License) | Pixel-arcade headings and readable retro body text |

**Asset preparation tools** (used only during development, not part of the game):
- **Grok (xAI)** image/video generation: the bicycle-fall video and the wound images.
- **C# with System.Drawing**, run from PowerShell: background removal, cropping, resizing and feathering of images.
- **Microsoft Edge (headless)**: rendering and editing SVG files, and screenshot testing.

---

## 3. Project structure

```
index.html            Homepage: title screen and main menu
lobby.html            Three-door lobby
room1.html            Pukulan Kilat (whack-a-mole)
room2.html            Taman Permainan (wound care story)
room3.html            Kad Misteri (review cards)
css/style.css         Shared arcade styles (every page)
css/lobby.css, css/room1.css, css/room2.css, css/room3.css
js/i18n.js            All on-screen text in English and Bahasa Melayu
js/common.js          Shared engine ("Arcade"): settings, sound, music, HUD, popups, effects
js/sprites.js         Pixel-art sprites defined as text grids
js/main.js, js/lobby.js, js/room1.js, js/room2.js, js/room3.js   Page logic
assets/               Images, SVGs, door frames, wound stages, audio, video, icons
docs/TECHNICAL.md     This document
```

Every page loads its scripts in the same order:

```html
<script src="js/i18n.js"></script>    <!-- 1. text tables -->
<script src="js/common.js"></script>  <!-- 2. shared engine, creates window.Arcade -->
<script src="js/sprites.js"></script> <!-- 3. pixel sprites (pages that need them) -->
<script src="js/room1.js"></script>   <!-- 4. the page's own logic -->
```

Each page script is wrapped in an immediately-invoked function `(() => { ... })()`, so its variables stay private and only `window.Arcade` is shared.

---

## 4. How the code works

### 4.1 Shared engine: `js/common.js`

`common.js` creates one global object, `Arcade`, which every page uses:

| Part | What it does |
|---|---|
| `store` | Safe wrapper around `localStorage`. It never crashes if storage is blocked, for example in private browsing. |
| `settings` | Sound, music, scanlines and language, saved under `littlemedic.settings`. |
| `t(key, vars)` | Looks up text in `STRINGS[lang]`, falls back to English, and fills placeholders like `{n}`. |
| `applyI18n()` | Fills every element marked `data-i18n="key"` (text) or `data-i18n-html="key"` (trusted markup). |
| `setLang()` | Switches language, re-applies all text and fires a `langchange` event so pages can redraw text they built in code. |
| `Sound` | Synthesises sound effects with Web Audio oscillators. `tone(freq, duration, delay, wave, volume, slideTo)` is the building block, and named effects like `coin()` and `select()` are short note sequences. |
| `Music` | Plays the background track in a loop. It saves the play position in `sessionStorage` when leaving a page and resumes from there on the next. It retries after the first click if the browser blocked autoplay. `setFast(true)` speeds it up 15% (pitch is kept). |
| Starfield | A `<canvas>` of twinkling, slowly falling stars redrawn every frame. |
| Effects | `burst(el)` makes a pixel-confetti explosion, `flash()` a screen flash, and `goTo(url)` a circle-wipe page transition. |
| HUD | Fills the top bar (high score, total stars) and wires the EN/BM and ♪ buttons. |
| Popups | `openModal()` / `closeModal()` for the homepage's How to Play and Settings. |

### 4.2 Language system

All text lives in `js/i18n.js` as two tables, `en` and `ms`, with the same keys:

```js
'r2.goal4': 'Put antiseptic on to kill germs.',            // en
'r2.goal4': 'Sapukan antiseptik untuk membunuh kuman.',    // ms
```

- **Static HTML text** uses `data-i18n="r2.goal4"` attributes.
- **Text built in JavaScript** calls `t('r2.goal4')` and redraws itself on the `langchange` event.

So the language can be switched at any time, even mid-game, without reloading.

### 4.3 Homepage: `js/main.js`
- Splits the title into letters and gives each a staggered CSS "wave" animation.
- Places the floating first-aid items around the screen, each with its own speed and tilt.
- **PRESS START** reveals the menu, which can be driven by keyboard (↑/↓, Enter) or mouse.
- **Settings** redraws itself in place when a toggle changes, so labels update instantly in either language.

### 4.4 Lobby: `js/lobby.js`
- The doors are built from the `ROOMS` list (picture, glow colour, link).
- **Door animation is frame-by-frame:** three pictures of the same door (closed, ajar, open) are stacked, and a small controller shows one at a time, stepping every 70 ms towards a target frame. Hovering sets the target to "open" and leaving sets it to "closed". If the mouse leaves halfway, the door reverses from where it is.
- Clicking a door opens it, zooms the whole lobby into the doorway with a CSS transform, then loads the room.
- On touch screens (no hover) a tap opens the door and walks through.

### 4.5 Room 1, Pukulan Kilat: `js/room1.js`
- **Board:** 10 holes in 3 rows. The back row is smaller to fake perspective. Each hole has a back ring, a dark pit, a **clipping mask** the item rises out of, and a front ring drawn on top, so items look like they come out of the hole.
- **Spawn loop:** a recursive `setTimeout` picks a free random hole and shows either a first-aid item or a mouse. Each difficulty (`DIFFS`) defines start and end values for the gap between pop-ups, how long items stay up, and the chance of a mouse. The game **interpolates** between them as the 45-second timer runs down, so it speeds up smoothly.
- **Hitting:** `pointerdown` on a hole checks whether something is up. An item scores 10 × the combo multiplier. A mouse scores −5, resets the combo and shakes the machine. An item that goes back down unhit counts as missed and resets the combo.
- **Combo:** 3 hits in a row doubles the points and 6 triples them.
- **Hammer:** an SVG positioned with geometry so that, at the bottom of its swing (−40°), the hammer head lands exactly on the pointer. A crosshair shows where it will hit.
- **Results:** stars from per-difficulty thresholds, the best score per difficulty, and a random fact about an item the player actually hit. Saved to `localStorage`.

### 4.6 Room 2, Taman Permainan: `js/room2.js`
1. **Scene 1, the video:** plays at `playbackRate = 0.5`. When it ends (or is skipped), a speech bubble and narrator box appear with **BANTU KAWAN** (Help your friend).
2. **Zoom transition:** the video is scaled up 3× around a focus point while fading out, and the close-up of the knee fades in at the same time.
3. **Treatment:** the correct order is a list:
   ```js
   STEPS = [gloves, water, gauze, iodine, plaster]
   ```
   - The first-aid station lists 8 tools in random order, 3 of them wrong for a small wound.
   - **Drag and drop** uses pointer events with `setPointerCapture`. A "ghost" copy follows the finger, and the target glows green when the tool is over the wound. Tapping a tool without dragging also uses it, which helps young children and keyboard users.
   - `useTool()` compares the tool with the current step:
     - **Correct:** play that tool's animation, advance the step, update the happy meter and the child's face.
     - **Right tool, wrong time:** "Not yet! (goal)".
     - **Wrong tool:** an explanation of why, for example "Cotton wool can stick to a wound".
4. **Wound stages:** five pictures are stacked on the skin, and each correct step **crossfades** to the next: bleeding → rinsed → dried → iodine-stained → covered.
5. **Animations** (bottle tipping, droplets falling, gauze patting) are drawn in an SVG layer over the wound and moved with a small `tween()` helper built on `requestAnimationFrame`.

### 4.7 Room 3, Kad Misteri: `js/room3.js`
- 8 cards in random order. Each card has a front face (?) and a back face, rotated 180°. A CSS `rotateY(180deg)` transition on `transform-style: preserve-3d` produces the **3D flip**. `backface-visibility: hidden` hides the side facing away.
- On the back, the name is hidden behind **NAMA ITEM** (item name) until the teacher reveals it. **FUNGSI ITEM** (item function) opens a large-text explanation for the class.
- There is no scoring. A progress bar counts the explained cards, and a ✔ badge marks each one.

### 4.8 Saved data

| Key | Storage | Content |
|---|---|---|
| `littlemedic.settings` | localStorage | Sound, music, scanlines, language |
| `littlemedic.hiscore` | localStorage | Highest score (top bar) |
| `littlemedic.roomStars` | localStorage | Best stars per room (Rooms 1–2) |
| `littlemedic.room1.best.<easy\|normal\|hard>` | localStorage | Room 1 best score per difficulty |
| `littlemedic.room1.diff` | localStorage | Last chosen difficulty |
| `littlemedic.musicPos` | sessionStorage | Music position, so it carries on between pages |

---

## 5. How the graphics and animation were created

### 5.1 Graphics

| Graphic | How it was made |
|---|---|
| **Pixel sprites** (homepage medkit logo, mouse) | Written as text grids in `js/sprites.js`, where each letter is a colour, then drawn onto a `<canvas>` block by block and converted to an image at runtime. No image files are needed. |
| **Lobby doors** | One illustration of a door in several opening stages, split into separate frames. The white background was removed with a **flood fill from the image edges**, and each frame was aligned on the door frame's bottom-left corner so the animation doesn't jitter. |
| **First-aid item pictures** | Illustrations (gloves, bottles, gauze, plaster, bandages, scissors and so on) with their backgrounds removed by edge flood fill, matching light, dark or the corner colour, then trimmed and resized to small web files. |
| **Bicycle accident video** | **Generated with Grok (xAI).** Played at half speed in Room 2. |
| **Wound stages** | **Generated with Grok (xAI)** as sheets showing several stages side by side. Each stage was cropped with the same rectangle and given a **soft elliptical fade** (feathered alpha), so it blends seamlessly onto the separate peach skin texture. Using the same crop for every stage keeps them aligned when they crossfade. |
| **Hammer and question mark** | Hand-written SVG code, so they scale perfectly at any size. |
| **Cyclist behind door 2** | Taken from a larger vector park scene. The background shapes (sky, city, grass, clouds) were removed and the SVG `viewBox` was reframed around one cyclist. |
| **Gloves overlay** | The gloves picture was cut out and split into left and right gloves, which slide up as "the player's hands". |
| **Icons** | The favicon and home-screen icon are generated from the medkit pixel sprite. |

### 5.2 Animation

Almost all animation is **CSS**, which is smooth, efficient and simple to maintain. JavaScript is used only where timing depends on game logic.

| Effect | Technique |
|---|---|
| Starfield | Canvas, redrawn each frame with `requestAnimationFrame` |
| Neon grid floor | CSS `perspective` + `rotateX` with a scrolling `background-position` |
| CRT scanlines and flicker | A repeating-gradient overlay with an opacity keyframe |
| Title wave, floating items, marquee bulbs | CSS `@keyframes` with staggered `animation-delay` |
| Door opening | JavaScript frame-stepper (§4.4) plus CSS glow, rays and light spill |
| Pictures behind doors | CSS `translate` / `rotate` float loop |
| Items popping out of holes | CSS `transform` transition inside an `overflow: hidden` mask |
| Hammer swing, hit squash, screen shake | CSS keyframes restarted from JavaScript |
| Video zoom into the knee | CSS `transform: scale()` transition |
| Bottle pour, droplets, gauze pat | JavaScript `tween()` on SVG attributes |
| Wound healing | CSS opacity crossfade between stacked images |
| Card flip | CSS 3D transform (`rotateY`, `preserve-3d`, `backface-visibility`) |
| Page changes | Circle-wipe `clip-path` animation |

**Accessibility:** if the device has *reduce motion* turned on, CSS animations are switched off and JavaScript tweens jump straight to their end state.

### 5.3 Sound
- **Sound effects** are synthesised live with the Web Audio API: short square and triangle-wave notes with pitch slides. For example the coin sound is two rising notes, the "yuck" is a falling buzz and the win jingle is an arpeggio. This gives an authentic 8-bit arcade feel with zero audio files.
- **Background music** is a looping audio file. It pauses during the Room 2 video and speeds up during the last 10 seconds of Room 1.

---

## 6. Testing
- Every page was checked in **Microsoft Edge (headless)** with automated screenshots at desktop and phone sizes, in both languages.
- Game states were driven by small test scripts (start a game, use tools in order, flip cards and so on), then checked visually.
- All JavaScript files are syntax-checked with Node.js (`node --check`).

---

## 7. Known limitations and future work
- **Autoplay:** browsers may keep the music silent on a new page until the first click. Turning the game into a single-page app would remove this.
- **Sound effects** are synthesised. They can be replaced with recorded files when available.
- **Content review:** the first-aid steps and the Bahasa Melayu text should be reviewed by a health professional and a native speaker.
- **Image credits:** some illustrations come from free stock sites such as Freepik, which require attribution. A credits section should be added before public release.
