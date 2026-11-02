/* Bird Bounce — achievement evaluation and rewards (blue/purple diamonds and skins). */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  BB.Achievements = {
    progress(a) {
      const [cur, goal] = a.progress(BB.Storage.data);
      return { cur: Math.min(cur, goal), goal, done: !!BB.Storage.data.achievements[a.id] };
    },

    tier(a) {
      const v = (a.reward.blue || 0) + (a.reward.purple || 0) * 2 + (a.reward.skin ? 300 : 0);
      return v >= 500 ? 'gold' : v >= 100 ? 'silver' : 'bronze';
    },

    rewardText(r) {
      const parts = [];
      if (r.blue) parts.push(`+${r.blue.toLocaleString()} blue`);
      if (r.purple) parts.push(`+${r.purple.toLocaleString()} purple`);
      if (r.skin) parts.push(`${BB.getSkin(r.skin).name} skin`);
      return parts.join(' · ');
    },

    // Unlock everything whose condition is now met; loops because one reward can satisfy another.
    check() {
      const s = BB.Storage.data;
      const newly = [];
      let changed = true;
      while (changed) {
        changed = false;
        for (const a of BB.ACHIEVEMENTS) {
          if (s.achievements[a.id]) continue;
          const [cur, goal] = a.progress(s);
          if (cur < goal) continue;
          s.achievements[a.id] = Date.now();
          s.blue += a.reward.blue || 0;
          s.purple += a.reward.purple || 0;
          BB.Storage.grantSkin(a.reward.skin);
          newly.push(a);
          changed = true;
        }
      }
      if (newly.length) {
        BB.Storage.save();
        BB.UI.refreshWallet();
        newly.forEach((a, i) =>
          setTimeout(() => {
            BB.Audio.play('achieve');
            BB.UI.toast({ icon: 'trophy', tier: this.tier(a), title: a.name, sub: this.rewardText(a.reward) });
          }, 400 + i * 900)
        );
      }
      return newly;
    },
  };
})();
