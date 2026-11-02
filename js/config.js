/* Bird Bounce — static game data: tuning constants, difficulty curves, skins, bots, achievements. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  BB.CONFIG = {
    H: 640,              // world height (all modes)
    SOLO_W: 360,         // arena width (all modes share one screen-wide arena)
    GRAVITY: 1450,
    FLAP_V: -450,
    MAX_FALL: 760,
    SPEED_X: 200,        // starting horizontal speed
    SPEED_GAIN: 0.0015,  // +0.15% horizontal speed per point of score...
    SPEED_CAP_SCORE: 400, // ...up to this score (=> 1.6x)
    ARROWS_FROM: 75,     // arrows start flying at this score (Normal, Hard, 1 vs 1, bots)
    ARROW_END: 50,       // arrows crumble this far before the far wall
    BIRD_R: 15,
    HIT_SCALE: 0.78,     // forgiving hitbox
    CEIL_BAND: 22,
    CEIL_TIP: 46,
    SLOT_TOP: 64,
    SLOT_BOTTOM: 576,
    SLOTS: 10,
    SPIKE_DEPTH: 30,
    SPIKE_FILL: 0.86,
    WIN_POINTS: 3,
    STEP: 1 / 120,
    CAVE: {
      BIRD_Y: 170,       // the bird stays here while the cave scrolls up past it
      VX: 185,           // horizontal speed; tapping flips direction
      WALL: 20,          // spiked side walls
      SCROLL0: 150,
      SCROLL_MAX: 380,
    },
  };

  // Horizontal speed: unchanged at the start, then creeps up with score.
  BB.speedFor = function (score) {
    return BB.CONFIG.SPEED_X * (1 + Math.min(score, BB.CONFIG.SPEED_CAP_SCORE) * BB.CONFIG.SPEED_GAIN);
  };

  // Wall sword density is driven purely by score (bounces) and keeps growing forever:
  // 16+: 4-5, ~87: 5-6, ~158: 6-7, ~229: 7-8, ~300: 8-9 (all slots but one). One slot is always clear.
  function swords(score) {
    if (score <= 5) return { min: 1, max: 2, gap: 3 };
    if (score <= 15) return { min: 2, max: 3, gap: 2 };
    const min = Math.min(8, 4 + Math.floor((score - 16) / 71));
    return { min, max: Math.min(BB.CONFIG.SLOTS - 1, min + 1), gap: 1 };
  }

  BB.Difficulty = {
    normal(score) {
      return Object.assign(swords(score), { amp: 0, speed: 0 });
    },
    // Hard: starts where Normal is at 30, and the whole wall pattern slides up and down.
    hard(score) {
      const amp = score <= 5 ? 14 : score <= 15 ? 20 : 26;
      const speed = score <= 5 ? 1.6 : score <= 15 ? 2.0 : 2.4;
      return Object.assign(swords(score + 30), { amp, speed });
    },
  };

  // Round prices to friendly numbers: 15, 40, 85, 230, 1,450, ...
  function nice(v) {
    if (v < 100) return Math.round(v / 5) * 5;
    if (v < 1000) return Math.round(v / 10) * 10;
    return Math.round(v / 50) * 50;
  }

  // Cave flashlight: 20 upgrades from a narrow beam to a wide one. Paid with purple diamonds.
  BB.FLASHLIGHT = (function () {
    const steps = 20, angles = [], costs = [];
    for (let i = 0; i <= steps; i++) angles.push(18 + (42 * i) / steps);
    for (let i = 0; i < steps; i++) costs.push(nice(15 * Math.pow(3000 / 15, i / (steps - 1))));
    return { steps, angles, costs };
  })();

  // Skin unlock: { cur: 'blue'|'purple', cost } or { ach: achievementId } or { boss: botIndex }.
  const S = (id, name, look, unlock, desc) => Object.assign({ id, name, unlock, desc }, look);
  const blue = (cost) => ({ cur: 'blue', cost });
  const purple = (cost) => ({ cur: 'purple', cost });

  BB.SKINS = [
    // ---- Blue diamonds (earned in Normal) ----
    S('classic', 'Cherry', { body: '#ff5a5f', belly: '#ffd6c9', wing: '#d63c47', beak: '#ffb02e' }, blue(0), 'The original bouncer.'),
    S('lime', 'Lime', { body: '#7ed957', belly: '#e9ffd6', wing: '#4fae2c', beak: '#ff9f1c' }, blue(50), 'Zesty and quick on the flap.'),
    S('ocean', 'Ocean', { body: '#3fa7f5', belly: '#d9f0ff', wing: '#2278c9', beak: '#ffb703' }, blue(60), 'Cool as the deep blue.'),
    S('sunny', 'Sunny', { body: '#ffd23f', belly: '#fff6cf', wing: '#f0a202', beak: '#ff6b35' }, blue(75), 'Brightens every bounce.'),
    S('grape', 'Grape', { body: '#9b5de5', belly: '#efe0ff', wing: '#6f32c2', beak: '#ffc43d' }, blue(90), 'Juicy purple plumage.'),
    S('mint', 'Mint', { body: '#2ec4b6', belly: '#d8fff9', wing: '#1b8a80', beak: '#ff9f1c' }, blue(110), 'Fresh out of the wrapper.'),
    S('bubblegum', 'Bubblegum', { body: '#ff8fc8', belly: '#ffe3f2', wing: '#e45fa5', beak: '#ffc43d', acc: ['bow'], accColor: '#ff3d8b' }, blue(130), 'Pop goes the bird.'),
    S('cocoa', 'Cocoa', { body: '#8d5a3b', belly: '#f1d8c2', wing: '#5e3a24', beak: '#ffb703', acc: ['cap'], accColor: '#2b6cb0' }, blue(160), 'Warm, sweet, backwards cap.'),
    S('ladybug', 'Ladybug', { body: '#e63946', belly: '#ffd6d6', wing: '#1d1d1d', beak: '#333', acc: ['spots', 'antenna2'] }, blue(200), 'Lucky spots included.'),
    S('tiger', 'Tiger', { body: '#ff8c1a', belly: '#fff1e0', wing: '#cc6400', beak: '#333', acc: ['stripes'] }, blue(250), 'Eye of the tiger bird.'),
    S('penguin', 'Penguin', { body: '#22252f', belly: '#ffffff', wing: '#11131a', beak: '#ffa62b', acc: ['bowtie'], accColor: '#e63946' }, blue(300), 'Dressed for the gala.'),
    S('ninja', 'Ninja', { body: '#2b2d42', belly: '#555a7a', wing: '#15161f', beak: '#f9a03f', acc: ['headband'] }, blue(360), 'Silent between the spikes.'),
    S('shades', 'Shades', { body: '#ff8fab', belly: '#ffe3eb', wing: '#e5617f', beak: '#ffb02e', acc: ['shades'] }, blue(420), 'Too cool to crash.'),
    S('pirate', 'Pirate', { body: '#c1121f', belly: '#fdf0d5', wing: '#780000', beak: '#ffb703', acc: ['pirate'] }, blue(500), 'Arr, mind the spikes.'),
    S('chef', 'Chef', { body: '#f4f1de', belly: '#ffffff', wing: '#d8d3b8', beak: '#f4a261', acc: ['chef'] }, blue(580), 'Cooking up high scores.'),
    S('cowboy', 'Cowboy', { body: '#bc6c25', belly: '#fefae0', wing: '#8a4b16', beak: '#ffb703', acc: ['cowboy'] }, blue(660), 'Fastest wing in the west.'),
    S('viking', 'Viking', { body: '#e9c46a', belly: '#fff8e1', wing: '#b8912f', beak: '#e76f51', acc: ['viking'] }, blue(750), 'Raids the high-score table.'),
    S('wizard', 'Wizard', { body: '#4361ee', belly: '#dbe4ff', wing: '#2a3fb8', beak: '#ffd166', acc: ['wizard'], trail: 'stars' }, blue(850), 'Flaps by arcane means.'),
    S('knight', 'Knight', { body: '#adb5bd', belly: '#e9ecef', wing: '#6c757d', beak: '#ffc43d', acc: ['knight'] }, blue(950), 'Armoured against bad luck.'),
    S('shark', 'Shark', { body: '#5c7c99', belly: '#eef4f8', wing: '#3d5a75', beak: '#eef4f8', acc: ['fin', 'teeth'] }, blue(1100), 'Smells diamonds a mile away.'),
    S('astronaut', 'Astronaut', { body: '#f8f9fa', belly: '#dee2e6', wing: '#adb5bd', beak: '#ff9f1c', acc: ['astronaut'] }, blue(1300), 'One small flap for bird-kind.'),
    S('diver', 'Diver', { body: '#ffbe0b', belly: '#fff3c4', wing: '#e09f00', beak: '#fb5607', acc: ['diver'] }, blue(1500), 'Deep-sea ready.'),
    S('royal', 'Royal', { body: '#f5c518', belly: '#fff2bd', wing: '#cc9600', beak: '#ff7b00', acc: ['crown'] }, blue(1800), 'Long live the bird.'),
    S('darklord', 'Dark Lord', { body: '#1a1a1f', belly: '#2e2e36', wing: '#0b0b0e', beak: '#3a3a44', acc: ['darklord'], trail: 'saber' }, blue(2200), 'Breathes heavily. Flaps heavier.'),
    S('ironhero', 'Iron Hero', { body: '#b5121b', belly: '#f2c14e', wing: '#7a0c12', beak: '#f2c14e', acc: ['ironhero'], trail: 'thrust' }, blue(2600), 'Repulsor-powered wings.'),
    S('prism', 'Prism', { body: '#ff5ea8', belly: '#ffffff', wing: '#7b61ff', beak: '#ffd23f', acc: ['rainbow'], trail: 'rainbow' }, blue(3000), 'Every colour at once.'),

    // ---- Purple diamonds (earned in Cave) ----
    S('ghost', 'Ghost', { body: '#eef1f8', belly: '#ffffff', wing: '#c9d0e0', beak: '#aeb7ca', alpha: 0.8 }, purple(50), 'Boo! Spooky and see-through.'),
    S('bat', 'Bat', { body: '#4a3b5c', belly: '#7d6a94', wing: '#2b2136', beak: '#c9b8dd', acc: ['batears'] }, purple(80), 'Born for the dark.'),
    S('owl', 'Owl', { body: '#9c6644', belly: '#ede0d4', wing: '#7f5539', beak: '#ffb703', acc: ['owl'] }, purple(120), 'Sees everything. Says "hoo".'),
    S('firefly', 'Firefly', { body: '#3a5a40', belly: '#a3b18a', wing: '#24382a', beak: '#dad7cd', acc: ['glow'] }, purple(160), 'Brings its own light.'),
    S('zombie', 'Zombie', { body: '#7fb069', belly: '#d8e2c6', wing: '#4f7a3f', beak: '#a3a380', acc: ['stitches'] }, purple(220), 'Braaains... and diamonds.'),
    S('skeleton', 'Skeleton', { body: '#e9e6dc', belly: '#ffffff', wing: '#c8c3b4', beak: '#bdb6a3', acc: ['skull'] }, purple(300), 'Bare bones, full speed.'),
    S('witch', 'Witch', { body: '#6a4c93', belly: '#d9c9f0', wing: '#4b326b', beak: '#ffb703', acc: ['witch'] }, purple(400), 'Brews trouble.'),
    S('pumpkin', 'Pumpkin', { body: '#f77f00', belly: '#fcbf49', wing: '#c45f00', beak: '#3a2a00', acc: ['pumpkin'] }, purple(500), 'Carved for chaos.'),
    S('devil', 'Devil', { body: '#d00000', belly: '#ff8a80', wing: '#8b0000', beak: '#ffba08', acc: ['horns'] }, purple(650), 'A little bit wicked.'),
    S('angel', 'Angel', { body: '#fffdf5', belly: '#ffffff', wing: '#f1e6c8', beak: '#ffd166', acc: ['halo'] }, purple(800), 'Heaven-sent flaps.'),
    S('vampire', 'Vampire', { body: '#3c096c', belly: '#e0aaff', wing: '#240046', beak: '#f8f9fa', acc: ['vampire'] }, purple(1000), 'Only flies at night.'),
    S('lantern', 'Lantern', { body: '#2d6a4f', belly: '#b7e4c7', wing: '#1b4332', beak: '#ffd166', acc: ['lantern'] }, purple(1300), 'Glow-on-a-stick.'),
    S('cosmic', 'Cosmic', { body: '#2d1b69', belly: '#7a5ad6', wing: '#170d40', beak: '#ffd6ff', acc: ['galaxy'], trail: 'stars' }, purple(1800), 'Made of stardust.'),
    S('robot', 'Robo', { body: '#9aa5b1', belly: '#dfe5eb', wing: '#66748a', beak: '#ffcf33', acc: ['antenna', 'bolts'] }, purple(2400), 'Calculated flaps. Beep boop.'),
    S('spectre', 'Spectre', { body: '#3d405b', belly: '#81b29a', wing: '#22243a', beak: '#81b29a', alpha: 0.7, acc: ['glowEyes'], trail: 'stars' }, purple(3000), 'A whisper in the cave.'),

    // ---- Trophy rewards ----
    S('comet', 'Comet', { body: '#4cc9f0', belly: '#e0fbff', wing: '#3a86ff', beak: '#ffffff', trail: 'stars' }, { ach: 'normal_50' }, 'Streaks across the sky.'),
    S('spiky', 'Spiky', { body: '#80ed99', belly: '#e9fff0', wing: '#38b000', beak: '#ff9f1c', acc: ['mohawk'], accColor: '#ff006e' }, { ach: 'hard_30' }, 'Fights spikes with spikes.'),
    S('miner', 'Miner', { body: '#6c584c', belly: '#dde5b6', wing: '#4a3d34', beak: '#ffb703', acc: ['miner'] }, { ach: 'cave_50' }, 'Born underground.'),
    S('treasure', 'Tycoon', { body: '#ffc300', belly: '#fff3b0', wing: '#d4a000', beak: '#ff6d00', acc: ['monocle', 'tophat'] }, { ach: 'run_blue_25' }, 'Swims in diamonds.'),
    S('cyborg', 'Cyborg', { body: '#495057', belly: '#adb5bd', wing: '#212529', beak: '#ced4da', acc: ['visor', 'bolts'] }, { ach: 'bot_10' }, 'Half bird, half machine.'),
    S('lighthouse', 'Beacon', { body: '#e63946', belly: '#f1faee', wing: '#a8201a', beak: '#ffd166', acc: ['lighthouse'] }, { ach: 'flash_max' }, 'The brightest bird in the cave.'),

    // ---- Boss rewards (defeat the boss bot) ----
    S('thunder', 'Thunder', { body: '#ffd60a', belly: '#fff6b3', wing: '#ffc300', beak: '#003566', acc: ['mohawk', 'headphones'], accColor: '#003566', trail: 'sparks' }, { boss: 4 }, 'Boss of the first sky.'),
    S('blaze', 'Blaze', { body: '#ff6b1a', belly: '#ffd166', wing: '#e63946', beak: '#ffe066', trail: 'fire' }, { boss: 9 }, 'Leaves a blazing trail.'),
    S('frost', 'Frostwing', { body: '#a2d2ff', belly: '#ffffff', wing: '#7bb6f0', beak: '#caf0f8', acc: ['crown'], accColor: '#caf0f8', trail: 'stars' }, { boss: 14 }, 'Rules the frozen peaks.'),
    S('magma', 'Magmaw', { body: '#370617', belly: '#e85d04', wing: '#03071e', beak: '#faa307', acc: ['horns'], trail: 'fire' }, { boss: 19 }, 'Molten to the core.'),
    S('shadow', 'Nightshade', { body: '#10002b', belly: '#3c096c', wing: '#000', beak: '#5a189a', acc: ['headband', 'glowEyes'], accColor: '#7b2cbf' }, { boss: 24 }, 'You never see it coming.'),
    S('overlord', 'Overlord', { body: '#240046', belly: '#ffd60a', wing: '#10002b', beak: '#ffd60a', acc: ['galaxy', 'crown', 'glowEyes'], trail: 'rainbow' }, { boss: 29 }, 'Ruler of every bot.'),
  ];

  BB.getSkin = function (id) {
    return BB.SKINS.find((s) => s.id === id) || BB.SKINS[0];
  };

  // ---- 30 bots. Every 5th is a boss that unlocks a skin. ----
  const BOT_NAMES = [
    'Chick', 'Finch', 'Sparrow', 'Robin', 'Thunder',
    'Wren', 'Swallow', 'Starling', 'Jay', 'Blaze',
    'Magpie', 'Kestrel', 'Heron', 'Toucan', 'Frostwing',
    'Raven', 'Owlet', 'Kite', 'Osprey', 'Magmaw',
    'Harrier', 'Condor', 'Hawk', 'Falcon', 'Nightshade',
    'Eagle', 'Gyrfalcon', 'Harpy', 'Peregrine', 'Overlord',
  ];
  const TAGS = ['Rookie', 'Casual', 'Skilled', 'Expert', 'Master', 'Legend'];

  // Survival range: each round the bot picks a random death score in [min, max] and flies
  // flawlessly until it reaches it. min grows ~14.4% per bot (4 -> 200); width = max(4, 25% of min).
  BB.BOTS = BOT_NAMES.map((name, i) => {
    const boss = i % 5 === 4;
    const min = Math.round(4 * Math.pow(50, i / 29));
    const max = min + Math.max(4, Math.round(min * 0.25));
    const bossSkin = boss ? BB.SKINS.find((s) => s.unlock.boss === i) : null;
    const hue = (45 + i * 47) % 360;
    return {
      id: 'bot' + (i + 1),
      name,
      boss,
      tag: boss ? 'Boss' : TAGS[Math.floor(i / 5)],
      reward: nice(10 * Math.pow(1.19, i)),
      skinReward: bossSkin ? bossSkin.id : null,
      min,
      max,
      skin: bossSkin || { body: `hsl(${hue},62%,55%)`, belly: `hsl(${hue},70%,88%)`, wing: `hsl(${hue},60%,38%)`, beak: '#ffb703', acc: ['antenna'] },
    };
  });

  const best = (s) => Math.max(s.highScores.normal, s.highScores.hard);
  const bosses = (s) => BB.BOTS.filter((b) => b.boss && s.botsDefeated.includes(b.id)).length;
  const A = (id, name, desc, reward, progress) => ({ id, name, desc, reward, progress });

  // reward: { blue, purple, skin }
  BB.ACHIEVEMENTS = [
    A('first_bounce', 'First Flight', 'Bounce off a wall', { blue: 10 }, (s) => [best(s), 1]),
    A('normal_10', 'Getting the Hang', 'Score 10 in Normal', { blue: 25 }, (s) => [s.highScores.normal, 10]),
    A('normal_25', 'Wall Hopper', 'Score 25 in Normal', { blue: 60 }, (s) => [s.highScores.normal, 25]),
    A('normal_50', 'Spike Whisperer', 'Score 50 in Normal', { blue: 150, skin: 'comet' }, (s) => [s.highScores.normal, 50]),
    A('normal_100', 'Centurion', 'Score 100 in Normal', { blue: 400 }, (s) => [s.highScores.normal, 100]),
    A('normal_200', 'Untouchable', 'Score 200 in Normal', { blue: 1200 }, (s) => [s.highScores.normal, 200]),
    A('hard_10', 'Moving Target', 'Score 10 in Hard', { blue: 50 }, (s) => [s.highScores.hard, 10]),
    A('hard_30', 'Unbreakable', 'Score 30 in Hard', { blue: 200, skin: 'spiky' }, (s) => [s.highScores.hard, 30]),
    A('hard_75', 'Nerves of Steel', 'Score 75 in Hard', { blue: 800 }, (s) => [s.highScores.hard, 75]),
    A('cave_20', 'Into the Dark', 'Fall 20 deep in Cave', { purple: 20 }, (s) => [s.highScores.cave, 20]),
    A('cave_50', 'Echolocation', 'Fall 50 deep in Cave', { purple: 80, skin: 'miner' }, (s) => [s.highScores.cave, 50]),
    A('cave_100', 'Abyss Diver', 'Fall 100 deep in Cave', { purple: 250 }, (s) => [s.highScores.cave, 100]),
    A('cave_250', 'Core Breaker', 'Fall 250 deep in Cave', { purple: 900 }, (s) => [s.highScores.cave, 250]),
    A('run_blue_10', 'Daredevil', 'Grab 10 blue diamonds in one run', { blue: 50 }, (s) => [s.stats.bestRunBlue, 10]),
    A('run_blue_25', 'Spike Kisser', 'Grab 25 blue diamonds in one run', { blue: 200, skin: 'treasure' }, (s) => [s.stats.bestRunBlue, 25]),
    A('run_blue_50', 'Greed Is Good', 'Grab 50 blue diamonds in one run', { blue: 700 }, (s) => [s.stats.bestRunBlue, 50]),
    A('run_purple_10', 'Gem Miner', 'Grab 10 purple diamonds in one cave run', { purple: 40 }, (s) => [s.stats.bestRunPurple, 10]),
    A('run_purple_30', 'Deep Pockets', 'Grab 30 purple diamonds in one cave run', { purple: 200 }, (s) => [s.stats.bestRunPurple, 30]),
    A('total_blue_500', 'Blue Hoarder', 'Collect 500 blue diamonds in total', { blue: 150 }, (s) => [s.stats.totalBlue, 500]),
    A('total_blue_5000', 'Blue Baron', 'Collect 5,000 blue diamonds in total', { blue: 1500 }, (s) => [s.stats.totalBlue, 5000]),
    A('total_purple_300', 'Purple Hoarder', 'Collect 300 purple diamonds in total', { purple: 100 }, (s) => [s.stats.totalPurple, 300]),
    A('total_purple_3000', 'Purple Baron', 'Collect 3,000 purple diamonds in total', { purple: 1000 }, (s) => [s.stats.totalPurple, 3000]),
    A('bot_1', 'Bot Buster', 'Defeat your first bot', { blue: 20 }, (s) => [s.botsDefeated.length, 1]),
    A('bot_10', 'Circuit Breaker', 'Defeat 10 bots', { blue: 250, skin: 'cyborg' }, (s) => [s.botsDefeated.length, 10]),
    A('boss_3', 'Boss Hunter', 'Defeat 3 boss bots', { purple: 150 }, (s) => [bosses(s), 3]),
    A('bot_all', 'Machine Slayer', 'Defeat all 30 bots', { blue: 2500 }, (s) => [s.botsDefeated.length, BB.BOTS.length]),
    A('versus_5', 'Couch Rivals', 'Play 5 1 vs 1 matches', { blue: 40 }, (s) => [s.stats.versusMatches, 5]),
    A('flash_5', 'Bright Idea', 'Upgrade the flashlight 5 times', { purple: 30 }, (s) => [s.flashlightLevel, 5]),
    A('flash_max', 'Floodlight', 'Fully upgrade the flashlight', { purple: 500, skin: 'lighthouse' }, (s) => [s.flashlightLevel, BB.FLASHLIGHT.steps]),
    A('skins_10', 'Collector', 'Own 10 skins', { blue: 100 }, (s) => [s.ownedSkins.length, 10]),
    A('skins_25', 'Curator', 'Own 25 skins', { blue: 400, purple: 200 }, (s) => [s.ownedSkins.length, 25]),
    A('skins_all', 'Completionist', 'Own every skin', { blue: 3000, purple: 1500 }, (s) => [s.ownedSkins.length, BB.SKINS.length]),
    A('games_100', 'Frequent Flyer', 'Play 100 runs', { blue: 150 }, (s) => [s.stats.games, 100]),
  ];
})();
