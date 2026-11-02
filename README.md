# Bird Bounce

A mobile-friendly HTML5 arcade game: tap to flap, bounce between the walls, grab diamonds next to the spikes, and never touch them.
It's plain JavaScript and Canvas 2D, with no build step and no dependencies.

## Run it

Open `index.html` in a browser, or serve the folder so the PWA manifest loads too:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Controls

| Mode | Touch / mouse | Keyboard |
| --- | --- | --- |
| Normal / Hard | Tap anywhere to flap | Space / ↑ / W |
| Cave | Tap to switch direction | Space |
| 1 vs 1 | Player 1 taps the **top** half, Player 2 the **bottom** half | P1: A / S / W · P2: L / K / ↑ |
| vs Bot | Tap anywhere | Space |
| Pause | ⏸ button | Esc / P |

## Modes

- **Normal**: the bird's horizontal speed never changes. Only the number of wall spikes grows with your score:
  0–5 → 1–2 spikes, 6–15 → 2–3, 16+ → 4–5. **Blue diamonds** spawn only here, right outside the spike tips on the wall you're heading for.
- **Hard**: tighter spike patterns from the start, and the spikes slide up and down the wall. No diamonds.
- **Cave**: the bird falls through a pitch-black shaft. Spike ledges, double ledges and swaying spike balls rise from below at an irregular rhythm. Tap to switch direction. The flashlight always points straight down and never tilts with the bird. **Purple diamonds** spawn only here: they don't glow and sit tight against the spikes.
- **1 vs 1**: both birds share one screen with no visual split. Player 1 sits at the top edge, and their bird is upside down: tapping the top half flaps it toward the bottom of the screen, which is "up" for them. The arena is symmetric under a 180° turn, so both players face the same spikes. First to 3 wins. A tied round gives both players a point.
- **vs Bot**: 30 bots of increasing skill, each unlocked by beating the one before. Every 5th bot is a **boss** that also drops an exclusive skin. Your first win against a bot pays 10 to 1,550 blue diamonds. A tied match shows "Tie" but counts as a loss.

## Economy & progression

- **Blue diamonds** (Normal) and **purple diamonds** (Cave) are the two currencies. Prices run from about 50 for cheap skins, through the hundreds, up to 1,000–3,000 for rare ones.
- **53 skins**: 26 bought with blue diamonds, 15 with purple, 6 from trophies and 6 from boss bots.
- **Flashlight**: 20 upgrades bought with purple diamonds, costing 15 → 3,000. Each one widens the beam.
- **33 trophies**: score milestones up to 200 (Normal), 75 (Hard) and 250 (Cave), diamonds grabbed in a single run, lifetime totals, bots and bosses beaten, and a full collection. They reward diamonds and sometimes skins.
- Everything is saved in `localStorage` under `birdBounce.save.v2`. Older v1 saves are migrated automatically.

## Project structure

```
index.html            screens + script order
css/style.css         UI styling (menus, shop, trophies, HUD, toasts)
js/config.js          tuning, difficulty, skins, 30 bots, achievements, flashlight prices
js/utils.js           PRNG, colour helpers, circle–triangle collision
js/storage.js         LocalStorage load/save + v1 → v2 migration
js/audio.js           WebAudio synthesized sound effects
js/entities.js        Wall, Bird, Arena (wall-bounce physics, spikes, diamonds, particles)
js/render.js          canvas drawing: arenas, birds + ~40 skin accessories, diamonds, darkness
js/ai.js              bot controller (gap targeting + flap timing)
js/achievements.js    trophy evaluation and rewards
js/sessions.js        Normal/Hard sessions and the menu demo
js/versus.js          shared-screen 1 vs 1 arena, local and vs-bot matches
js/cave.js            vertical-fall cave world, renderer and session
js/ui.js              DOM screens, shop, bot select, trophies, toasts
js/main.js            boot, letterboxing, fixed-step loop, input routing
```

Scripts are plain (non-module) files that share one `window.BB` namespace, so the game also runs straight from `file://`.
