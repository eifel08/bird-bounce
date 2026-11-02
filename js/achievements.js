/* Bird Bounce — achievement evaluation and diamond rewards. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});

  BB.Achievements = {
    progress(a) {
      const [cur, goal] = a.progress(BB.Storage.data);
      return { cur: Math.min(cur, goal), goal, done: !!BB.Storage.data.achievements[a.id] };
    },

    tier(a) {
      return a.reward >= 12 ? 'gold' : a.reward >= 5 ? 'silver' : 'bronze';
    },

    // Unlock everything whose condition is now met; returns newly unlocked achievements.
    check() {
      const s = BB.Storage.data;
      const newly = [];
      for (const a of BB.ACHIEVEMENTS) {
        if (s.achievements[a.id]) continue;
        const [cur, goal] = a.progress(s);
        if (cur >= goal) {
          s.achievements[a.id] = Date.now();
          s.diamonds += a.reward;
          newly.push(a);
        }
      }
      if (newly.length) {
        BB.Storage.save();
        BB.UI.refreshWallet();
        newly.forEach((a, i) =>
          setTimeout(() => {
            BB.Audio.play('achieve');
            BB.UI.toast({ icon: 'trophy', tier: this.tier(a), title: a.name, sub: `+${a.reward} diamonds` });
          }, 400 + i * 900)
        );
      }
      return newly;
    },
  };
})();
