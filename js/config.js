/* Bird Bounce — static game data: tuning constants, difficulty curves, skins, bots, achievements. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  BB.CONFIG = {
    H: 640,              // world height (all modes)
    SOLO_W: 360,         // arena width for single-player modes
    VS_W: 250,           // arena width for each side in versus modes
    VS_DIVIDER: 8,
    GRAVITY: 1450,
    FLAP_V: -450,
    MAX_FALL: 760,
    SPEED_X: 200,        // constant horizontal speed — never ramps up
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
  };

  // Wall spike density is driven purely by score (bounces).
  BB.Difficulty = {
    normal(score) {
      if (score <= 5) return { min: 1, max: 2, gap: 3, amp: 0, speed: 0 };
      if (score <= 15) return { min: 2, max: 3, gap: 2, amp: 0, speed: 0 };
      return { min: 4, max: 5, gap: 2, amp: 0, speed: 0 };
    },
    // Hard: tighter from the first bounce, and the whole wall pattern slides up and down.
    hard(score) {
      if (score <= 5) return { min: 3, max: 4, gap: 2, amp: 14, speed: 1.6 };
      if (score <= 15) return { min: 4, max: 5, gap: 2, amp: 20, speed: 2.0 };
      return { min: 5, max: 6, gap: 2, amp: 26, speed: 2.4 };
    },
  };

  // Cave flashlight cone (degrees) per upgrade level; costs[i] buys level i -> i+1.
  BB.FLASHLIGHT = {
    angles: [20, 28, 36, 44, 52, 60],
    costs: [3, 6, 10, 15, 22],
  };

  BB.SKINS = [
    { id: 'classic', name: 'Cherry', cost: 0, cur: 'crystals', body: '#ff5a5f', belly: '#ffd6c9', wing: '#d63c47', beak: '#ffb02e', desc: 'The original bouncer.' },
    { id: 'lime', name: 'Lime', cost: 20, cur: 'crystals', body: '#7ed957', belly: '#e9ffd6', wing: '#4fae2c', beak: '#ff9f1c', desc: 'Zesty and quick on the flap.' },
    { id: 'ocean', name: 'Ocean', cost: 35, cur: 'crystals', body: '#3fa7f5', belly: '#d9f0ff', wing: '#2278c9', beak: '#ffb703', desc: 'Cool as the deep blue.' },
    { id: 'sunny', name: 'Sunny', cost: 50, cur: 'crystals', body: '#ffd23f', belly: '#fff6cf', wing: '#f0a202', beak: '#ff6b35', desc: 'Brightens every bounce.' },
    { id: 'grape', name: 'Grape', cost: 70, cur: 'crystals', body: '#9b5de5', belly: '#efe0ff', wing: '#6f32c2', beak: '#ffc43d', desc: 'Juicy purple plumage.' },
    { id: 'ninja', name: 'Ninja', cost: 100, cur: 'crystals', body: '#2b2d42', belly: '#555a7a', wing: '#15161f', beak: '#f9a03f', acc: 'headband', desc: 'Silent between the spikes.' },
    { id: 'shades', name: 'Shades', cost: 130, cur: 'crystals', body: '#ff8fab', belly: '#ffe3eb', wing: '#e5617f', beak: '#ffb02e', acc: 'shades', desc: 'Too cool to crash.' },
    { id: 'ghost', name: 'Ghost', cost: 160, cur: 'crystals', body: '#eef1f8', belly: '#ffffff', wing: '#c9d0e0', beak: '#aeb7ca', alpha: 0.8, desc: 'Boo! Spooky and see-through.' },
    { id: 'robot', name: 'Robo', cost: 25, cur: 'diamonds', premium: true, body: '#9aa5b1', belly: '#dfe5eb', wing: '#66748a', beak: '#ffcf33', acc: 'antenna', desc: 'Calculated flaps. Beep boop.' },
    { id: 'royal', name: 'Royal', cost: 35, cur: 'diamonds', premium: true, body: '#f5c518', belly: '#fff2bd', wing: '#cc9600', beak: '#ff7b00', acc: 'crown', desc: 'Long live the bird.' },
    { id: 'phoenix', name: 'Phoenix', cost: 50, cur: 'diamonds', premium: true, body: '#ff6b1a', belly: '#ffd166', wing: '#e63946', beak: '#ffe066', trail: 'fire', desc: 'Leaves a blazing trail.' },
    { id: 'cosmic', name: 'Cosmic', cost: 70, cur: 'diamonds', premium: true, body: '#2d1b69', belly: '#7a5ad6', wing: '#170d40', beak: '#ffd6ff', acc: 'galaxy', trail: 'stars', desc: 'Made of stardust.' },
    { id: 'prism', name: 'Prism', cost: 90, cur: 'diamonds', premium: true, body: '#ff5ea8', belly: '#ffffff', wing: '#7b61ff', beak: '#ffd23f', acc: 'rainbow', trail: 'rainbow', desc: 'Every colour at once.' },
  ];

  BB.getSkin = function (id) {
    return BB.SKINS.find((s) => s.id === id) || BB.SKINS[0];
  };

  // AI parameters: think = decision interval (also its lookahead), bias = flap threshold below target,
  // tol = jitter on threshold, noise = aim error (px), blunder = chance per bounce to aim badly.
  BB.BOTS = [
    { id: 'chick', name: 'Chick', tag: 'Rookie', reward: 3, think: 0.12, bias: 35, tol: 24, noise: 40, blunder: 0.3, cool: 0.2, skin: { body: '#ffd84d', belly: '#fff6c8', wing: '#f2b705', beak: '#ff8a3d' } },
    { id: 'sparrow', name: 'Sparrow', tag: 'Casual', reward: 5, think: 0.085, bias: 35, tol: 16, noise: 26, blunder: 0.15, cool: 0.18, skin: { body: '#b08968', belly: '#f1e3d3', wing: '#7f5539', beak: '#ffb703' } },
    { id: 'robin', name: 'Robin', tag: 'Skilled', reward: 8, think: 0.06, bias: 35, tol: 12, noise: 18, blunder: 0.09, cool: 0.16, skin: { body: '#6c757d', belly: '#ff7f50', wing: '#495057', beak: '#ffd23f' } },
    { id: 'hawk', name: 'Hawk', tag: 'Expert', reward: 12, think: 0.045, bias: 35, tol: 8, noise: 12, blunder: 0.05, cool: 0.15, skin: { body: '#8d5524', belly: '#f3d9b1', wing: '#5c3317', beak: '#ffcc00' } },
    { id: 'falcon', name: 'Falcon', tag: 'Master', reward: 18, think: 0.03, bias: 35, tol: 5, noise: 7, blunder: 0.022, cool: 0.14, skin: { body: '#1d3557', belly: '#a8dadc', wing: '#0b1d33', beak: '#ffd166' } },
    { id: 'phoenix-bot', name: 'Inferno', tag: 'Legend', reward: 30, think: 0.026, bias: 35, tol: 2, noise: 2, blunder: 0.004, cool: 0.13, skin: { body: '#d00000', belly: '#ffba08', wing: '#6a040f', beak: '#ffea00', trail: 'fire' } },
  ];

  const best = (s) => Math.max(s.highScores.normal, s.highScores.hard, s.highScores.cave);

  BB.ACHIEVEMENTS = [
    { id: 'first_bounce', name: 'First Flight', desc: 'Bounce off a wall', reward: 1, progress: (s) => [best(s), 1] },
    { id: 'normal_10', name: 'Getting the Hang', desc: 'Score 10 in Normal', reward: 2, progress: (s) => [s.highScores.normal, 10] },
    { id: 'normal_25', name: 'Wall Hopper', desc: 'Score 25 in Normal', reward: 5, progress: (s) => [s.highScores.normal, 25] },
    { id: 'normal_50', name: 'Spike Whisperer', desc: 'Score 50 in Normal', reward: 10, progress: (s) => [s.highScores.normal, 50] },
    { id: 'normal_100', name: 'Centurion', desc: 'Score 100 in Normal', reward: 25, progress: (s) => [s.highScores.normal, 100] },
    { id: 'hard_10', name: 'Moving Target', desc: 'Score 10 in Hard', reward: 4, progress: (s) => [s.highScores.hard, 10] },
    { id: 'hard_30', name: 'Unbreakable', desc: 'Score 30 in Hard', reward: 12, progress: (s) => [s.highScores.hard, 30] },
    { id: 'cave_10', name: 'Into the Dark', desc: 'Score 10 in Cave', reward: 4, progress: (s) => [s.highScores.cave, 10] },
    { id: 'cave_30', name: 'Echolocation', desc: 'Score 30 in Cave', reward: 12, progress: (s) => [s.highScores.cave, 30] },
    { id: 'run_15', name: 'Greedy Beak', desc: 'Collect 15 crystals in one run', reward: 4, progress: (s) => [s.stats.bestRunCrystals, 15] },
    { id: 'collect_100', name: 'Crystal Hoarder', desc: 'Collect 100 crystals in total', reward: 5, progress: (s) => [s.stats.totalCrystals, 100] },
    { id: 'collect_500', name: 'Crystal Baron', desc: 'Collect 500 crystals in total', reward: 15, progress: (s) => [s.stats.totalCrystals, 500] },
    { id: 'bot_1', name: 'Bot Buster', desc: 'Defeat your first bot', reward: 2, progress: (s) => [s.botsDefeated.length, 1] },
    { id: 'bot_3', name: 'Circuit Breaker', desc: 'Defeat 3 different bots', reward: 6, progress: (s) => [s.botsDefeated.length, 3] },
    { id: 'bot_all', name: 'Machine Slayer', desc: 'Defeat every bot', reward: 30, progress: (s) => [s.botsDefeated.length, BB.BOTS.length] },
    { id: 'versus_3', name: 'Couch Rivals', desc: 'Play 3 two-player matches', reward: 3, progress: (s) => [s.stats.versusMatches, 3] },
    { id: 'flash_1', name: 'Bright Idea', desc: 'Upgrade the flashlight', reward: 2, progress: (s) => [s.flashlightLevel, 1] },
    { id: 'flash_max', name: 'Floodlight', desc: 'Max out the flashlight (60°)', reward: 10, progress: (s) => [s.flashlightLevel, BB.FLASHLIGHT.angles.length - 1] },
    { id: 'skins_5', name: 'Fashionista', desc: 'Own 5 bird skins', reward: 5, progress: (s) => [s.ownedSkins.length, 5] },
    { id: 'premium_1', name: 'High Roller', desc: 'Own a premium skin', reward: 5, progress: (s) => [s.ownedSkins.filter((id) => BB.getSkin(id).premium).length, 1] },
  ];
})();
