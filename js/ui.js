/* Bird Bounce — DOM menus: main menu, bot select, shop, achievements, results, pause, toasts. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const save = () => BB.Storage.data;

  const TROPHY = (fill, dark) =>
    `<svg viewBox="0 0 48 48"><path d="M14 6h20v4h7v5c0 6-4 10-9 11-1.5 3-4 5-6 5.5V36h6v5H16v-5h6v-4.5c-2-.5-4.5-2.5-6-5.5-5-1-9-5-9-11v-5h7z" fill="${fill}"/><path d="M11 13v2c0 3 2 6 4 7-1-2-1-5-1-9zm26 0h-3c0 4 0 7-1 9 2-1 4-4 4-7z" fill="${dark}"/><path d="M19 11h3v12c-2-2-3-6-3-12z" fill="#fff" opacity=".45"/><rect x="14" y="40" width="20" height="4" rx="2" fill="${dark}"/></svg>`;

  const TIER = { gold: ['#ffc23d', '#c98a00'], silver: ['#c7d0dd', '#8793a6'], bronze: ['#e09a62', '#a8602b'], locked: ['#c3c8d6', '#9aa0b4'] };

  const ICONS = {
    crystal: '<svg viewBox="0 0 24 24"><path d="M12 1.5 19 8v8l-7 6.5L5 16V8z" fill="#35c4f2" stroke="#1885b5" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 1.5 5 8v8l7 6.5L10.5 12z" fill="#93e9ff"/></svg>',
    diamond: '<svg viewBox="0 0 24 24"><path d="M2.5 9 6.5 3.5h11L21.5 9 12 21.5z" fill="#a974ff" stroke="#6b3fd1" stroke-width="1.4" stroke-linejoin="round"/><path d="M2.5 9 6.5 3.5H12L8.5 9 12 21.5z" fill="#e2ceff"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><rect x="6" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1.5" fill="currentColor"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    retry: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/><path d="M19.5 3.5v5h-5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sound: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    mute: '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="m16 9 6 6m0-6-6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    skull: '<svg viewBox="0 0 24 24"><path d="M3 20 8 4l5 16zM11 20l5-12 5 12z" fill="currentColor"/></svg>',
    flash: '<svg viewBox="0 0 24 24"><path d="M3 9h6l11-6v18L9 15H3z" fill="currentColor" opacity=".35"/><rect x="2" y="9" width="8" height="6" rx="1.5" fill="currentColor"/><path d="M10 9.5 21 4v16l-11-5.5z" fill="#ffd166"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.5" fill="currentColor"/><circle cx="16.5" cy="9" r="3" fill="currentColor" opacity=".8"/><path d="M1.5 20c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5zM13 20c.3-2.5-.5-4.4-1.8-5.6 1.2-.7 2.6-1 4.3-1 3 0 5.5 2.2 5.5 6.6z" fill="currentColor"/></svg>',
    bot: '<svg viewBox="0 0 24 24"><rect x="4" y="7" width="16" height="13" rx="4" fill="currentColor"/><circle cx="9" cy="13" r="2" fill="#5b6ee1"/><circle cx="15" cy="13" r="2" fill="#5b6ee1"/><path d="M12 7V3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="3" r="1.6" fill="#ff4d6d"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12a1.5 1.5 0 0 1-1.5 1.4h-9A1.5 1.5 0 0 1 6 20z" fill="currentColor"/><path d="M8.5 10V7a3.5 3.5 0 0 1 7 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".75"/></svg>',
    trophy: TROPHY('currentColor', 'rgba(0,0,0,.25)'),
    crown: '<svg viewBox="0 0 24 24"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#ffc23d"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const icon = (name) => `<i data-icon="${name}">${ICONS[name]}</i>`;
  const curIcon = (cur) => icon(cur === 'diamonds' ? 'diamond' : 'crystal');

  const UI = (BB.UI = {
    screen: 'menu',
    shopTab: 'skins',
    shopSel: null,
    t: 0,
    last: { mode: 'normal' },

    init() {
      this.hydrateIcons(document);
      $$('.wallet').forEach((w) => {
        w.innerHTML = `<span class="pill w-c">${icon('crystal')}<b class="w-crystals">0</b></span><span class="pill w-d">${icon('diamond')}<b class="w-diamonds">0</b></span>`;
      });

      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-nav],[data-mode]');
        if (!t) return;
        BB.Audio.unlock();
        BB.Audio.play('click');
        if (t.dataset.mode) this.startMode(t.dataset.mode);
        else this.nav(t.dataset.nav);
      });

      $('#btn-sound').addEventListener('click', () => {
        save().settings.sound = !save().settings.sound;
        BB.Storage.save();
        BB.Audio.unlock();
        BB.Audio.play('click');
        this.renderSound();
      });
      $('#btn-pause').addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.pause();
      });
      $('#p-resume').addEventListener('click', () => this.resume());
      $('#p-quit').addEventListener('click', () => this.goMenu());
      $('#go-retry').addEventListener('click', () => this.retry());
      $('#go-menu').addEventListener('click', () => this.goMenu());
      $('#m-again').addEventListener('click', () => this.retry());
      $('#m-menu').addEventListener('click', () => this.goMenu());
      $('#m-next').addEventListener('click', () => this.startVersus(this.last.bot + 1));
      $('#pv-action').addEventListener('click', () => this.shopAction());
      $$('.tab').forEach((tab) =>
        tab.addEventListener('click', () => {
          BB.Audio.play('click');
          this.shopTab = tab.dataset.tab;
          this.renderShop();
        })
      );
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pause();
      });

      this.refreshWallet();
      this.renderSound();
      this.renderMenu();
    },

    hydrateIcons(root) {
      root.querySelectorAll('[data-icon]').forEach((el) => {
        if (!el.innerHTML) el.innerHTML = ICONS[el.dataset.icon] || '';
      });
    },

    show(name) {
      this.screen = name;
      $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
      $('#hud').classList.toggle('hidden', name !== null);
      const sess = BB.Main.session;
      const portrait = window.innerHeight > window.innerWidth;
      $('#rotate-hint').classList.toggle('hidden', !(name === null && sess instanceof BB.VersusSession && portrait && window.innerWidth < 600));
    },

    nav(name) {
      if (name === 'menu') return this.goMenu();
      if (name === 'shop') this.renderShop();
      if (name === 'achievements') this.renderAchievements();
      if (name === 'bots') this.renderBots();
      this.show(name);
    },

    goMenu() {
      const s = BB.Main.session;
      if (!(s instanceof BB.DemoSession)) BB.Main.setSession(new BB.DemoSession());
      else s.setSkin(BB.getSkin(save().equippedSkin));
      this.renderMenu();
      this.show('menu');
    },

    startMode(mode) {
      if (mode === 'versus') return this.startVersus(null);
      this.last = { mode };
      BB.Main.setSession(new BB.SoloSession(mode));
      $('#hud-loot').classList.toggle('hidden', mode === 'hard');
      this.setHudLoot(0, 0);
      this.show(null);
    },

    startVersus(botIndex) {
      this.last = { mode: botIndex == null ? 'versus' : 'bot', bot: botIndex };
      BB.Main.setSession(new BB.VersusSession(botIndex));
      $('#hud-loot').classList.add('hidden');
      this.show(null);
    },

    retry() {
      const l = this.last;
      if (l.mode === 'versus') this.startVersus(null);
      else if (l.mode === 'bot') this.startVersus(l.bot);
      else this.startMode(l.mode);
    },

    pause() {
      const s = BB.Main.session;
      if (this.screen !== null || !s || !s.pausable || s.paused) return;
      s.paused = true;
      this.show('pause');
    },

    resume() {
      const s = BB.Main.session;
      if (s) s.paused = false;
      this.show(null);
    },

    // ---------- HUD & wallet ----------
    setHudLoot(c, d) {
      $('#hud-crystals').textContent = c;
      $('#hud-diamonds').textContent = d;
      $('#hud-diamond-wrap').classList.toggle('hidden', !d);
      const pill = $('#hud-loot');
      pill.classList.remove('bump');
      void pill.offsetWidth;
      if (c || d) pill.classList.add('bump');
      this.refreshWallet();
    },

    refreshWallet() {
      const s = save();
      $$('.w-crystals').forEach((el) => (el.textContent = s.crystals));
      $$('.w-diamonds').forEach((el) => (el.textContent = s.diamonds));
    },

    renderSound() {
      const btn = $('#btn-sound');
      btn.innerHTML = icon(save().settings.sound ? 'sound' : 'mute');
    },

    renderMenu() {
      const s = save();
      $('#menu-best').textContent = s.highScores.normal;
      $('#best-hard').textContent = `Best ${s.highScores.hard}`;
      $('#best-cave').textContent = `Best ${s.highScores.cave} · ${BB.FLASHLIGHT.angles[s.flashlightLevel]}°`;
      $('#bots-progress').textContent = `${s.botsDefeated.length}/${BB.BOTS.length} beaten`;
      const done = BB.ACHIEVEMENTS.filter((a) => s.achievements[a.id]).length;
      const badge = $('#ach-badge');
      badge.textContent = `${done}/${BB.ACHIEVEMENTS.length}`;
      badge.classList.remove('hidden');
      this.refreshWallet();
    },

    // ---------- bots ----------
    botUnlocked(i) {
      return i === 0 || save().botsDefeated.includes(BB.BOTS[i - 1].id);
    },

    renderBots() {
      const s = save();
      const list = $('#bot-list');
      list.innerHTML = BB.BOTS.map((b, i) => {
        const unlocked = this.botUnlocked(i);
        const beaten = s.botsDefeated.includes(b.id);
        const dots = BB.BOTS.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('');
        const right = !unlocked
          ? `<div class="bot-reward">${icon('lock')}</div>`
          : beaten
          ? `<div class="bot-reward beaten">${icon('check')}Beaten</div>`
          : `<div class="bot-reward">+${b.reward}${icon('diamond')}</div>`;
        return `<button class="bot-card ${unlocked ? '' : 'locked'} ${beaten ? 'beaten' : ''}" data-bot="${i}" ${unlocked ? '' : 'aria-disabled="true"'}>
          <canvas></canvas>
          <div><b>${unlocked ? b.name : '???'}</b><small>Level ${i + 1} · ${b.tag}</small><div class="dots">${dots}</div></div>
          ${right}
        </button>`;
      }).join('');
      list.querySelectorAll('.bot-card').forEach((card) => {
        const i = +card.dataset.bot;
        const b = BB.BOTS[i];
        BB.Render.birdToCanvas(card.querySelector('canvas'), Object.assign({ acc: 'antenna' }, b.skin), { scale: 0.27 });
        card.addEventListener('click', () => {
          if (!this.botUnlocked(i)) {
            BB.Audio.play('error');
            card.classList.remove('shake');
            void card.offsetWidth;
            card.classList.add('shake');
            return;
          }
          BB.Audio.play('click');
          this.startVersus(i);
        });
      });
    },

    // ---------- shop ----------
    renderShop() {
      const s = save();
      if (!this.shopSel) this.shopSel = s.equippedSkin;
      $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === this.shopTab));
      $('.preview').classList.toggle('dark', this.shopTab === 'flashlight');
      const body = $('#shop-body');
      if (this.shopTab === 'skins') {
        body.innerHTML = `<div class="skin-grid">${BB.SKINS.map((sk) => {
          const owned = s.ownedSkins.includes(sk.id);
          const eq = s.equippedSkin === sk.id;
          const price = eq ? `${icon('check')}Equipped` : owned ? 'Owned' : `${curIcon(sk.cur)}${sk.cost}`;
          return `<button class="skin-card ${owned ? 'owned' : 'locked'} ${eq ? 'equipped' : ''} ${sk.premium ? 'premium' : ''} ${this.shopSel === sk.id ? 'selected' : ''}" data-skin="${sk.id}">
            <canvas></canvas><span class="nm">${sk.name}</span><span class="price">${price}</span></button>`;
        }).join('')}</div>`;
        body.querySelectorAll('.skin-card').forEach((card) => {
          BB.Render.birdToCanvas(card.querySelector('canvas'), BB.getSkin(card.dataset.skin), { scale: 0.27 });
          card.addEventListener('click', () => {
            BB.Audio.play('click');
            this.shopSel = card.dataset.skin;
            this.renderShop();
          });
        });
      } else {
        const lvl = s.flashlightLevel, A = BB.FLASHLIGHT.angles, max = A.length - 1;
        body.innerHTML = `<div class="card flash-panel">
          <div class="flash-levels">${A.map((_, i) => `<span class="${i <= lvl ? 'on' : ''}"></span>`).join('')}</div>
          <div class="row"><span>Current beam</span><b>${A[lvl]}°</b></div>
          <div class="row"><span>Next upgrade</span><b>${lvl < max ? A[lvl + 1] + '°' : 'Maxed out'}</b></div>
          <div class="row"><span>Cave best</span><b>${s.highScores.cave}</b></div>
          <p class="sub">A wider beam lets you see more of the walls ahead in Cave Mode.</p>
        </div>`;
      }
      this.renderShopPreview();
    },

    renderShopPreview() {
      const s = save();
      const btn = $('#pv-action');
      btn.classList.remove('shake');
      if (this.shopTab === 'skins') {
        const sk = BB.getSkin(this.shopSel);
        const owned = s.ownedSkins.includes(sk.id);
        $('#pv-name').textContent = sk.name;
        $('#pv-desc').textContent = sk.desc;
        btn.disabled = false;
        if (s.equippedSkin === sk.id) {
          btn.innerHTML = `${icon('check')}Equipped`;
          btn.disabled = true;
          this.btnColor(btn, '#06a77d', '#04785a');
        } else if (owned) {
          btn.innerHTML = 'Equip';
          this.btnColor(btn, '#06a77d', '#04785a');
        } else {
          const can = s[sk.cur] >= sk.cost;
          btn.innerHTML = can ? `Buy ${curIcon(sk.cur)}${sk.cost}` : `Need ${sk.cost - s[sk.cur]} more ${curIcon(sk.cur)}`;
          this.btnColor(btn, sk.cur === 'diamonds' ? '#9b5de5' : '#ffb703', sk.cur === 'diamonds' ? '#6c30bd' : '#c27f00');
        }
      } else {
        const lvl = s.flashlightLevel, max = BB.FLASHLIGHT.angles.length - 1;
        $('#pv-name').textContent = 'Flashlight';
        $('#pv-desc').textContent = `Level ${lvl + 1} of ${max + 1}`;
        btn.disabled = lvl >= max;
        if (lvl >= max) {
          btn.innerHTML = `${icon('check')}Max level`;
          this.btnColor(btn, '#06a77d', '#04785a');
        } else {
          const cost = BB.FLASHLIGHT.costs[lvl];
          btn.innerHTML = s.diamonds >= cost ? `Upgrade ${icon('diamond')}${cost}` : `Need ${cost - s.diamonds} more ${icon('diamond')}`;
          this.btnColor(btn, '#9b5de5', '#6c30bd');
        }
      }
    },

    btnColor(btn, c, cd) {
      btn.style.setProperty('--c', c);
      btn.style.setProperty('--cd', cd);
    },

    denied() {
      const btn = $('#pv-action');
      BB.Audio.play('error');
      btn.classList.remove('shake');
      void btn.offsetWidth;
      btn.classList.add('shake');
    },

    shopAction() {
      const s = save();
      if (this.shopTab === 'skins') {
        const sk = BB.getSkin(this.shopSel);
        if (s.ownedSkins.includes(sk.id)) {
          s.equippedSkin = sk.id;
          BB.Audio.play('click');
        } else {
          if (s[sk.cur] < sk.cost) return this.denied();
          s[sk.cur] -= sk.cost;
          s.ownedSkins.push(sk.id);
          s.equippedSkin = sk.id;
          BB.Audio.play('buy');
          this.toast({ icon: sk.cur === 'diamonds' ? 'diamond' : 'crystal', head: 'UNLOCKED', title: sk.name, sub: 'Equipped and ready to fly' });
        }
      } else {
        const lvl = s.flashlightLevel;
        if (lvl >= BB.FLASHLIGHT.angles.length - 1) return;
        const cost = BB.FLASHLIGHT.costs[lvl];
        if (s.diamonds < cost) return this.denied();
        s.diamonds -= cost;
        s.flashlightLevel++;
        BB.Audio.play('buy');
        this.toast({ icon: 'flash', head: 'UPGRADED', title: `Flashlight ${BB.FLASHLIGHT.angles[s.flashlightLevel]}°`, sub: 'See further in the cave' });
      }
      BB.Storage.save();
      BB.Achievements.check();
      this.refreshWallet();
      this.renderShop();
      const demo = BB.Main.session;
      if (demo instanceof BB.DemoSession) demo.setSkin(BB.getSkin(s.equippedSkin));
    },

    // ---------- achievements ----------
    renderAchievements() {
      const all = BB.ACHIEVEMENTS;
      const done = all.filter((a) => save().achievements[a.id]).length;
      const earned = all.filter((a) => save().achievements[a.id]).reduce((n, a) => n + a.reward, 0);
      const pct = done / all.length;
      const C = 2 * Math.PI * 24;
      $('#ach-summary').innerHTML = `
        <svg class="ring" viewBox="0 0 58 58"><circle cx="29" cy="29" r="24" fill="none" stroke="#e3e6ef" stroke-width="7"/>
        <circle cx="29" cy="29" r="24" fill="none" stroke="#ffc23d" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}" transform="rotate(-90 29 29)"/>
        <text x="29" y="34" text-anchor="middle" font-size="15" font-weight="700" fill="#262a40" font-family="Fredoka, sans-serif">${Math.round(pct * 100)}%</text></svg>
        <div><b>${done} / ${all.length} trophies</b><small>${earned} diamonds earned from trophies</small></div>`;
      const order = all.slice().sort((a, b) => !!save().achievements[b.id] - !!save().achievements[a.id]);
      $('#ach-list').innerHTML = order
        .map((a) => {
          const p = BB.Achievements.progress(a);
          const tier = BB.Achievements.tier(a);
          const [fill, dark] = TIER[p.done ? tier : 'locked'];
          const pctA = p.done ? 100 : Math.round((p.cur / p.goal) * 100);
          return `<div class="ach ${p.done ? 'done' : ''} tier-${tier}">
            <div class="trophy">${TROPHY(fill, dark)}${p.done ? '' : `<span class="lock">${ICONS.lock}</span>`}</div>
            <div><b>${a.name}</b><small>${a.desc}</small><div class="bar-track"><i style="width:${pctA}%"></i></div></div>
            <div class="ach-reward"><span>+${a.reward}${icon('diamond')}</span><small>${p.done ? 'Earned' : `${p.cur}/${p.goal}`}</small></div>
          </div>`;
        })
        .join('');
    },

    // ---------- results ----------
    showGameOver(info) {
      const names = { normal: 'Normal', hard: 'Hard Mode', cave: 'Cave Mode' };
      $('#go-mode').textContent = names[info.mode];
      $('#go-score').textContent = info.score;
      $('#go-best').textContent = info.best;
      $('#go-newbest').classList.toggle('hidden', !info.isBest);
      const lootWrap = $('#go-loot-wrap');
      lootWrap.classList.toggle('hidden', info.mode === 'hard');
      $('#go-loot').innerHTML = `${icon('crystal')}${info.crystals}${info.diamonds ? ` ${icon('diamond')}${info.diamonds}` : ''}`;
      this.show('gameover');
    },

    showMatch(info) {
      const [p1, p2] = info.points;
      $('#m-p1').textContent = p1;
      $('#m-p2').textContent = p2;
      $('#m-p1').className = info.winner === 0 ? 'win' : '';
      $('#m-p2').className = info.winner === 1 ? 'win' : '';
      const reward = $('#m-reward');
      reward.classList.add('hidden');
      const next = $('#m-next');
      next.hidden = true;
      if (info.bot) {
        $('#m-title').textContent = info.winner === 0 ? 'You Win!' : `${info.bot.name} Wins`;
        $('#m-sub').textContent = info.winner === 0 ? `You beat ${info.bot.name} (${info.bot.tag})` : 'So close — try again!';
        if (info.firstWin) {
          reward.innerHTML = `First win bonus +${info.reward} ${icon('diamond')}`;
          reward.classList.remove('hidden');
          setTimeout(() => BB.Audio.play('diamond'), 500);
        }
        if (info.winner === 0 && info.botIndex < BB.BOTS.length - 1) next.hidden = false;
      } else {
        $('#m-title').textContent = info.winner === 0 ? 'Player 1 Wins!' : 'Player 2 Wins!';
        $('#m-sub').textContent = 'First to 3 takes the crown';
      }
      this.refreshWallet();
      this.show('match');
    },

    // ---------- toasts ----------
    toast({ icon: ic, tier, head, title, sub }) {
      const el = document.createElement('div');
      el.className = 'toast';
      const art = ic === 'trophy' ? TROPHY(...TIER[tier || 'gold']) : ICONS[ic] || '';
      el.innerHTML = `<div class="t-ico">${art}</div><div><div class="t-head">${head || 'TROPHY UNLOCKED'}</div><b>${title}</b><small>${sub || ''}</small></div>`;
      $('#toasts').appendChild(el);
      setTimeout(() => el.remove(), 3600);
    },

    // Animated previews while menus are open.
    tick(dt) {
      this.t += dt;
      if (this.screen !== 'shop') return;
      const cv = $('#shop-canvas');
      if (this.shopTab === 'skins') {
        BB.Render.birdToCanvas(cv, BB.getSkin(this.shopSel || save().equippedSkin), { scale: 0.2, t: this.t, flap: (Math.sin(this.t * 9) + 1) / 2, bob: true, trail: true });
      } else {
        const s = save(), A = BB.FLASHLIGHT.angles;
        BB.Render.flashPreview(cv, A[s.flashlightLevel], A[s.flashlightLevel + 1], this.t);
      }
    },
  });
})();
