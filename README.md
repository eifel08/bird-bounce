# Bird Bounce

A mobile-friendly HTML5 arcade game set inside an ancient pyramid. Tap to flap, bounce between the brick walls, grab diamonds beside the swords, and dodge the snakes, stalactites and arrows.
It's plain JavaScript and Canvas 2D, with no build step and no dependencies. It's also an installable PWA that plays fully offline.

## Run it

Serve the folder over HTTP. Offline mode and installing need a real web origin:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` straight from disk also works, but without offline support.

## Install & play offline (PWA)

- **Android / desktop Chrome or Edge**: tap **Install** on the main menu, or in Credits.
- **iPhone / iPad**: tap Share, then **Add to Home Screen**. The Credits screen shows this hint on iOS.
- The service worker (`sw.js`) caches every game file on the first visit, so the game launches and plays with no connection. Updates are picked up in the background and appear on the next launch. To force everyone onto a fresh cache, bump `CACHE` in `sw.js`.

## Controls

| Mode | Touch / mouse | Keyboard |
| --- | --- | --- |
| Normal / Hard | Tap anywhere to flap | Space / ↑ / W |
| Cave | Tap to switch direction | Space |
| 1 vs 1 | Player 1 taps the **top** half, Player 2 the **bottom** half | P1: A / S / W · P2: L / K / ↑ |
| vs Bot | Tap anywhere | Space |
| Pause | ⏸ button | Esc / P |

## The pyramid

- **Walls**: sandstone pyramid bricks. **Swords** thrust out of them instead of spikes.
- **Ceiling**: jagged stone stalactites.
- **Floor**: a pit of rearing snakes.
- **Arrows**: they blink in the wall for a moment, then fly across the screen. They're on from the start in Hard mode, and appear in Normal once you reach a score of 25. They get more frequent as your score rises.

## Modes

- **Normal**: the bird's horizontal speed never changes. Only the number of wall swords grows with your score:
  0–5 → 1–2 swords, 6–15 → 2–3, 16+ → 4–5. **Blue diamonds** spawn only here, right outside the sword tips on the wall you're heading for.
- **Hard**: tighter sword patterns from the start, swords that slide up and down the wall, and flying arrows. No diamonds.
- **Cave**: the bird falls through a pitch-black shaft. Spike ledges, double ledges and swaying spike balls rise from below at an irregular rhythm. Tap to switch direction. The flashlight always points straight down and never tilts with the bird. **Purple diamonds** spawn only here: they don't glow and are scattered at random spots in the open cave.
- **1 vs 1**: both birds share one screen with no visual split. Player 1 sits at the top edge, and their bird is upside down: tapping the top half flaps it toward the bottom of the screen, which is "up" for them. The arena is symmetric under a 180° turn, so both players face the same swords. First to 3 wins. A tied round gives both players a point.
- **vs Bot**: 30 bots of increasing skill, each unlocked by beating the one before. Every 5th bot is a **boss** that also drops an exclusive skin. Your first win against a bot pays 10 to 1,550 blue diamonds. After a win the button reads **Next Bot**. After a loss or a tie, which counts as a loss, it reads **Rematch**.

## Economy & progression

- **Blue diamonds** (Normal) and **purple diamonds** (Cave) are the two currencies. Prices run from about 50 for cheap skins, through the hundreds, up to 1,000–3,000 for rare ones.
- **53 skins**: 26 bought with blue diamonds, 15 with purple, 6 from trophies and 6 from boss bots.
- **Flashlight**: 20 upgrades bought with purple diamonds, costing 15 → 3,000. Each one widens the beam.
- **33 trophies**: score milestones up to 200 (Normal), 75 (Hard) and 250 (Cave), diamonds grabbed in a single run, lifetime totals, bots and bosses beaten, and a full collection. They reward diamonds and sometimes skins.
- Everything is saved in `localStorage` under `birdBounce.save.v2`. Older v1 saves are migrated automatically.

## Credits

Designed and developed by **Eitan Feldman**. If you enjoy the game, you can [buy me a coffee ☕](https://buymeacoffee.com/eitanfeldman).

## Project structure

```
index.html            screens + script order
manifest.webmanifest  PWA manifest (name, icons, fullscreen display)
sw.js                 service worker: offline cache of every game file + fonts
assets/               app icons (SVG, 192/512 PNG, maskable 512 PNG)
css/style.css         UI styling (menus, shop, trophies, credits, HUD, toasts)
js/config.js          tuning, difficulty, skins, 30 bots, achievements, flashlight prices
js/utils.js           PRNG, colour helpers, circle–triangle collision
js/storage.js         LocalStorage load/save + v1 → v2 migration
js/audio.js           WebAudio synthesized sound effects
js/entities.js        Wall, Bird, Arena (wall-bounce physics, swords, arrows, diamonds, particles)
js/render.js          canvas drawing: pyramid arena, snakes, stalactites, swords, arrows, birds + skins
js/ai.js              bot controller (gap targeting + flap timing)
js/achievements.js    trophy evaluation and rewards
js/sessions.js        Normal/Hard sessions and the menu demo
js/versus.js          shared-screen 1 vs 1 arena, local and vs-bot matches
js/cave.js            vertical-fall cave world, renderer and session
js/ui.js              DOM screens, shop, bot select, trophies, credits, toasts
js/pwa.js             service-worker registration and Install buttons
js/main.js            boot, letterboxing, fixed-step loop, input routing
```

Scripts are plain (non-module) files that share one `window.BB` namespace.
