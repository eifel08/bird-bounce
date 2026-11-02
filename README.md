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
- **Arrows**: from a score of **75** in Normal, Hard, 1 vs 1 and bot matches. Each one blinks in the wall for 0.8 s, then flies across the screen, and they get more frequent as your score rises. To stay fair, an arrow always launches from a sword slot, never out of the open gap you need to fly through, and it crumbles 50 px before the far wall. So arrows are a mid-air threat you can dodge, and never block a gap. In 1 vs 1 they fire in mirrored pairs.

## Getting harder (all wall modes)

- **More swords, forever**: wall swords never move. Only their number grows with the score, and one slot is always left open.

  | Score | Swords per wall |
  | --- | --- |
  | 0–5 | 1–2 |
  | 6–15 | 2–3 |
  | 16–86 | 4–5 |
  | 87–157 | 5–6 |
  | 158–228 | 6–7 |
  | 229–299 | 7–8 |
  | 300+ | 8–9 (every slot but one) |

- **Speed**: the starting speed is unchanged, then horizontal speed rises 0.15% per point (×1.38 at 250), capped at ×1.6 from score 400.
- **Fair bounces**: swords sliding back into the wall you just bounced off can't hurt you.
- **Cave** keeps tightening past depth 30, with closer rows, more double ledges, narrower gaps and wider swings, and the fall keeps speeding up.

## Modes

- **Normal**: the sword curve above. **Blue diamonds** spawn only here, right outside the sword tips on the wall you're heading for.
- **Hard**: the sword count starts where Normal is at 30, and the sword patterns slide up and down the wall. No diamonds.
- **Cave**: the bird falls through a pitch-black shaft. Spike ledges, double ledges and swaying spike balls rise from below at an irregular rhythm. Tap to switch direction. The flashlight always points straight down and never tilts with the bird. **Purple diamonds** spawn only here: they don't glow and are scattered at random spots in the open cave.
- **1 vs 1**: both birds share one screen with no visual split. Player 1 sits at the top edge, and their bird is upside down: tapping the top half flaps it toward the bottom of the screen, which is "up" for them. The arena is symmetric under a 180° turn, so both players face the same swords. First to 3 wins. A tied round gives both players a point.
- **vs Bot**: 30 bots, each unlocked by beating the one before. Every 5th bot is a **boss** that also drops an exclusive skin. Your first win against a bot pays 10 to 1,550 blue diamonds. After a win the button reads **Next Bot**. After a loss or a tie, which counts as a loss, it reads **Rematch**.

### How bots play

Bots don't use AI. Each round, the bot picks a random **death score** inside its survival range. A path planner (`js/ai.js`) then replays the game's exact flight physics to find flap timings:
- **Before its death score**, it aims for a random open slot on the next wall, and the path must clear the swords, stalactites, snakes and arrows, including the moment right after the bounce.
- **Once the score reaches its death score**, it aims straight at a sword.

| Bot | Dies between | Bot | Dies between | Bot | Dies between |
| --- | --- | --- | --- | --- | --- |
| 1 Chick | 4–8 | 11 Magpie | 15–19 | 21 Harrier | 59–74 |
| 2 Finch | 5–9 | 12 Kestrel | 18–23 | 22 Condor | 68–85 |
| 3 Sparrow | 5–9 | 13 Heron | 20–25 | 23 Hawk | 78–98 |
| 4 Robin | 6–10 | 14 Toucan | 23–29 | 24 Falcon | 89–111 |
| **5 Thunder** | 7–11 | **15 Frostwing** | 26–33 | **25 Nightshade** | 102–128 |
| 6 Wren | 8–12 | 16 Raven | 30–38 | 26 Eagle | 117–146 |
| 7 Swallow | 9–13 | 17 Owlet | 35–44 | 27 Gyrfalcon | 133–166 |
| 8 Starling | 10–14 | 18 Kite | 40–50 | 28 Harpy | 153–191 |
| 9 Jay | 12–16 | 19 Osprey | 45–56 | 29 Peregrine | 175–219 |
| **10 Blaze** | 13–17 | **20 Magmaw** | 52–65 | **30 Overlord** | 200–250 |

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
js/ai.js              bot path planner (exact physics replay, survival ranges)
js/achievements.js    trophy evaluation and rewards
js/sessions.js        Normal/Hard sessions and the menu demo
js/versus.js          shared-screen 1 vs 1 arena, local and vs-bot matches
js/cave.js            vertical-fall cave world, renderer and session
js/ui.js              DOM screens, shop, bot select, trophies, credits, toasts
js/pwa.js             service-worker registration and Install buttons
js/main.js            boot, letterboxing, fixed-step loop, input routing
```

Scripts are plain (non-module) files that share one `window.BB` namespace.
