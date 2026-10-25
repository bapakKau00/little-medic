# Little Medic

An arcade-style educational game that teaches children basic first aid. It runs in a web browser with no installation, in English and Bahasa Melayu.

## Running the game

Open `index.html` in a modern browser (Chrome, Edge, Safari or Firefox). No build step or server is needed.

- An internet connection is needed for the pixel fonts (Google Fonts). Without it the game still works, but in a plain font.
- Browsers block sound until the first click or key press on a page, so music starts when you press **PRESS START**. On later pages it may wait for the first click.
- For a classroom screen, Room 3 has a **⛶** button for real full screen.

## How the game flows

1. **Homepage** (`index.html`): title screen and main menu (Start Game, How to Play, Settings).
2. **Lobby** (`lobby.html`): three doors. Hovering opens a door; clicking walks through it.
3. **The rooms:**

| Room | Name | What happens |
|---|---|---|
| 1 | **Pukulan Kilat** (`room1.html`) | Whack-a-mole arcade machine. Hit first-aid items (+10), avoid the mice (−5). 45 s per round, 3 difficulty levels, combos (3 in a row ×2, 6 in a row ×3). |
| 2 | **Taman Permainan** (`room2.html`) | A video of a child falling off a bike, then a close-up of the knee. Drag the right items in order: gloves → clean water → gauze → antiseptic (iodine) → plaster. Wrong items explain why they're wrong. |
| 3 | **Kad Misteri** (`room3.html`) | Teacher-led review. The teacher flips a card, the children buzz in to name the item (**NAMA ITEM** reveals it), then to say what it's for (**FUNGSI ITEM** shows the explanation). No scoring. |

Stars from Rooms 1 and 2 and the Room 1 high score are saved in the browser (local storage).

## Controls

- **Mouse / touch:** everything can be clicked or tapped. In Room 2, items can be dragged or just tapped.
- **Keyboard:** arrow keys and Enter work in menus and the lobby. **Esc** goes back.
- **Top bar:** **EN / BM** switches language, **♪** mutes all sound, and **◀** returns to the lobby or menu.
- **Settings:** sound, music, scanline effect and language.

## Project structure

```
index.html, lobby.html, room1.html, room2.html, room3.html   Pages
css/
  style.css         Shared arcade look (used by every page)
  lobby.css, room1.css, room2.css, room3.css
js/
  i18n.js           All on-screen text in English and Bahasa Melayu
  common.js         Shared: settings, sound effects, music, top bar, popups, effects
  sprites.js        Pixel-art sprites drawn in code (homepage logo, mouse)
  main.js           Homepage
  lobby.js          Lobby doors
  room1.js, room2.js, room3.js
assets/
  audio/            Background music
  video/            Room 2 bike fall video
  doors/            Door opening frames
  items/            First-aid item pictures (background removed)
  wound/            Room 2 wound stages and skin texture
  hammer.svg, kid-cycle.svg, question.svg   Pictures behind the lobby doors
  favicon.svg, apple-touch-icon.png         Browser and home-screen icons
_source/            Original artwork the game pictures were cut from (not used by the game)
```

## Common changes

| To change… | Edit |
|---|---|
| Any text, in either language | `js/i18n.js` (every string has an `en` and an `ms` version) |
| Room 1 items, sizes or difficulty | `ITEMS` and `DIFFS` at the top of `js/room1.js` |
| Room 2 treatment steps or items | `STEPS` and `TOOLS` at the top of `js/room2.js` |
| Room 2 video speed or zoom point | `VIDEO_SPEED` and `FOCUS` at the top of `js/room2.js` |
| Room 3 cards | `CARDS` at the top of `js/room3.js` |
| Lobby door pictures, colours or links | `ROOMS` at the top of `js/lobby.js` |
| Homepage floating items | `floaters` at the top of `js/main.js` |
| Music file or volume | `MUSIC_FILE` and `MUSIC_VOLUME` in `js/common.js` |

Sound effects are currently generated in code (`sfx` in each room script and `Sound` in `common.js`), so there are no sound effect files yet.

## Before using with children

- **Content check:** have the first-aid steps and explanations reviewed by a teacher or health professional.
- **Language check:** have a native speaker review the Bahasa Melayu text in `js/i18n.js`.
- **Credits:** some illustrations come from Freepik (for example the cycling boy). Their free licence requires attribution, so add credits before sharing the game publicly.
- **Room 2 zoom:** check that the zoom at the end of the video lands on the knee. If not, adjust `FOCUS` in `js/room2.js`.
