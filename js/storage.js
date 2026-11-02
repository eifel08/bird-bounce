/* Bird Bounce — LocalStorage persistence for wallet, skins, high scores, bots, flashlight and achievements. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const KEY = 'birdBounce.save.v1';

  function defaults() {
    return {
      version: 1,
      crystals: 0,
      diamonds: 0,
      ownedSkins: ['classic'],
      equippedSkin: 'classic',
      highScores: { normal: 0, hard: 0, cave: 0 },
      botsDefeated: [],
      flashlightLevel: 0,
      achievements: {},
      stats: { totalCrystals: 0, bestRunCrystals: 0, games: 0, botWins: 0, versusMatches: 0 },
      settings: { sound: true },
    };
  }

  // Merge saved data over defaults so new fields appear for old saves.
  function merge(def, src) {
    if (!src || typeof src !== 'object') return def;
    for (const k of Object.keys(def)) {
      if (!(k in src)) continue;
      const d = def[k], v = src[k];
      if (Array.isArray(d)) def[k] = Array.isArray(v) ? v : d;
      else if (d && typeof d === 'object') def[k] = merge(d, v);
      else if (typeof v === typeof d) def[k] = v;
    }
    // achievements is an open map
    if (src.achievements && typeof src.achievements === 'object') def.achievements = src.achievements;
    return def;
  }

  let data = defaults();

  BB.Storage = {
    get data() {
      return data;
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        data = merge(defaults(), raw ? JSON.parse(raw) : null);
      } catch (e) {
        data = defaults();
      }
      if (!data.ownedSkins.includes('classic')) data.ownedSkins.unshift('classic');
      if (!data.ownedSkins.includes(data.equippedSkin)) data.equippedSkin = 'classic';
      data.flashlightLevel = Math.min(data.flashlightLevel, BB.FLASHLIGHT.angles.length - 1);
      return data;
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        /* storage full or blocked — keep playing */
      }
    },
    reset() {
      data = defaults();
      this.save();
    },
  };
})();
