/* Bird Bounce — LocalStorage persistence for wallet, skins, high scores, bots, flashlight and achievements. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const KEY = 'birdBounce.save.v2';
  const OLD_KEY = 'birdBounce.save.v1';

  function defaults() {
    return {
      version: 2,
      blue: 0,
      purple: 0,
      ownedSkins: ['classic'],
      equippedSkin: 'classic',
      highScores: { normal: 0, hard: 0, cave: 0 },
      botsDefeated: [],
      flashlightLevel: 0,
      achievements: {},
      stats: { totalBlue: 0, totalPurple: 0, bestRunBlue: 0, bestRunPurple: 0, games: 0, botWins: 0, versusMatches: 0 },
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
    if (src.achievements && typeof src.achievements === 'object') def.achievements = src.achievements;
    return def;
  }

  // v1 had crystals/diamonds, 6 bots and a 5-step flashlight; carry over what still makes sense.
  function migrateV1(old) {
    const d = defaults();
    d.blue = old.crystals || 0;
    d.purple = old.diamonds || 0;
    d.ownedSkins = (old.ownedSkins || []).filter((id) => BB.SKINS.some((s) => s.id === id));
    d.equippedSkin = old.equippedSkin || 'classic';
    if (old.highScores) {
      d.highScores.normal = old.highScores.normal || 0;
      d.highScores.hard = old.highScores.hard || 0;
    }
    d.flashlightLevel = (old.flashlightLevel || 0) * 4;
    for (const id of Object.keys(old.achievements || {})) {
      if (BB.ACHIEVEMENTS.some((a) => a.id === id)) d.achievements[id] = old.achievements[id];
    }
    if (old.stats) d.stats.versusMatches = old.stats.versusMatches || 0;
    if (old.settings) d.settings.sound = old.settings.sound !== false;
    return d;
  }

  let data = defaults();

  BB.Storage = {
    get data() {
      return data;
    },
    load() {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) data = merge(defaults(), JSON.parse(raw));
        else {
          const old = localStorage.getItem(OLD_KEY);
          data = old ? migrateV1(JSON.parse(old)) : defaults();
        }
      } catch (e) {
        data = defaults();
      }
      if (!data.ownedSkins.includes('classic')) data.ownedSkins.unshift('classic');
      if (!data.ownedSkins.includes(data.equippedSkin)) data.equippedSkin = 'classic';
      data.flashlightLevel = Math.min(data.flashlightLevel, BB.FLASHLIGHT.steps);
      this.save();
      return data;
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) {
        /* storage full or blocked — keep playing */
      }
    },
    // Grant a skin without spending; returns true if it was new.
    grantSkin(id) {
      if (!id || data.ownedSkins.includes(id)) return false;
      data.ownedSkins.push(id);
      return true;
    },
    reset() {
      data = defaults();
      this.save();
    },
  };
})();
