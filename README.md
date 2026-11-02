# Bird Bounce

A mobile-friendly HTML5 arcade game: tap to flap, bounce between the walls, and don't touch the spikes.
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
| Solo modes | Tap anywhere | Space / ↑ / W |
| 2 Players | P1 taps the left half, P2 taps the right half | P1: A / S / W · P2: L / K / ↑ |
| vs Bot | Tap anywhere | Space |
| Pause | ⏸ button | Esc / P |

## Modes

- **Normal**: the bird's horizontal speed never changes. Only the number of wall spikes grows with your score:
  0–5 → 1–2 spikes, 6–15 → 2–3, 16+ → 4–5. Every pattern always leaves a safe gap. Crystals spawn, and so do rare diamonds.
- **Hard**: tighter spike patterns from the start, and the whole spike pattern slides up and down the wall. No loot.
- **Cave**: everything is dark except a flashlight cone in front of the bird. The cone starts at 20°, and diamonds upgrade it up to 60°. Crystals here are worth ×2.
- **2 Players**: two mirrored arenas share one seed, so both players face the same spike sequence. First to 3 points wins.
- **vs Bot**: 6 bots of increasing skill, from Chick to Inferno. Each one unlocks after you beat the previous bot. Your first win against a bot pays diamonds (3 → 30).

## Economy & progression

- **Crystals**: collected during runs. They buy the 8 standard skins.
- **Diamonds**: earned from 20 trophies, first wins against bots, and rare spawns in Normal. They buy the 5 premium skins and flashlight upgrades.
- Everything is saved in `localStorage` under `birdBounce.save.v1`: wallet, skins, high scores, bots beaten, flashlight level, trophies and settings.

## Project structure

```
index.html            screens + script order
css/style.css         UI styling (menus, shop, trophies, HUD, toasts)
js/config.js          tuning constants, difficulty curves, skins, bots, achievements
js/utils.js           PRNG, colour helpers, circle–triangle collision
js/storage.js         LocalStorage load/save with forward-compatible merge
js/audio.js           WebAudio synthesized sound effects
js/entities.js        Wall, Bird, Arena (physics, spikes, items, particles)
js/render.js          canvas drawing: arena, birds/skins, items, cave darkness
js/ai.js              bot controller (gap targeting + flap timing)
js/achievements.js    trophy evaluation and diamond payouts
js/sessions.js        SoloSession, VersusSession, DemoSession (menu background)
js/ui.js              DOM screens, shop, bot select, trophies, toasts
js/main.js            boot, letterboxing, fixed-step loop, input routing
```

Scripts are plain (non-module) files that share one `window.BB` namespace, so the game also runs straight from `file://`.
