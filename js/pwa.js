/* Bird Bounce — PWA: registers the offline service worker and drives the Install buttons. */
(function () {
  'use strict';
  const BB = (window.BB = window.BB || {});
  const $ = (s) => document.querySelector(s);

  let deferred = null; // the browser's install prompt, saved until the player taps Install

  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function setInstallVisible(on) {
    ['#btn-install', '#btn-install-2'].forEach((id) => $(id).classList.toggle('hidden', !on));
  }

  async function install() {
    BB.Audio.play('click');
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    deferred = null;
    setInstallVisible(false);
    if (choice.outcome === 'accepted') BB.UI.toast({ icon: 'download', head: 'INSTALLED', title: 'Bird Bounce', sub: 'Play from your home screen, even offline' });
  }

  BB.PWA = {
    init() {
      $('#btn-install').addEventListener('click', install);
      $('#btn-install-2').addEventListener('click', install);

      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferred = e;
        setInstallVisible(true);
      });
      window.addEventListener('appinstalled', () => {
        deferred = null;
        setInstallVisible(false);
      });

      // Service workers need http(s); opening index.html from disk just skips offline support.
      if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('sw.js').then(
          () => navigator.serviceWorker.ready.then(() => this.renderStatus()),
          () => this.renderStatus()
        );
      }
    },

    renderStatus() {
      const hint = $('#install-hint');
      const status = $('#offline-status');
      const ready = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      if (standalone()) {
        hint.classList.add('hidden');
        status.textContent = 'Installed — playable offline.';
      } else {
        // iOS Safari has no install prompt; explain the manual route instead.
        const showIOS = isIOS() && !deferred;
        hint.classList.toggle('hidden', !showIOS);
        hint.textContent = 'On iPhone/iPad: tap Share, then “Add to Home Screen” to install.';
        const supported = 'serviceWorker' in navigator && location.protocol.startsWith('http');
        status.textContent = ready
          ? 'Offline ready — the game is saved on this device.'
          : supported
          ? 'Preparing offline mode… it’s ready after this first visit.'
          : 'Offline mode needs the game to be opened from a website (https).';
      }
    },
  };
})();
