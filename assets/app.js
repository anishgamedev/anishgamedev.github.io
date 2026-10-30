/* Indiandevanish Games — small, dependency-free site script */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var CAT_EMOJI = { Racing: '🏁', Puzzle: '🧩', Arcade: '🕹️', Sports: '⚽', Board: '🎲' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function loadGames() {
    return fetch('/games.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('games.json ' + r.status); return r.json(); });
  }
  function cardHTML(g) {
    var kid = g.kids ? '<span class="dot-kid" title="Kids-safe">🧒</span>' : '';
    var badge = g.provider === 'own' ? '<span class="badge own">By Anish</span>' : '';
    var search = [g.title, g.category].concat(g.tags || []).join(' ').toLowerCase();
    return '<a class="card" href="/game/' + esc(g.slug) + '/" data-slug="' + esc(g.slug) + '" data-cat="' + esc(g.category) + '" data-kids="' + (g.kids ? 1 : 0) + '" data-pick="' + (g.pick ? 1 : 0) + '" data-added="' + esc(g.added || '') + '" data-search="' + esc(search) + '">' +
      '<span class="thumb"><img src="' + esc(g.thumb) + '" alt="' + esc(g.title) + '" width="512" height="384" loading="lazy" decoding="async">' + badge + '</span>' +
      '<span class="meta"><span class="t">' + esc(g.title) + '</span><span class="c">' + (CAT_EMOJI[g.category] || '🎮') + ' ' + esc(g.category) + kid + '</span></span></a>';
  }

  /* ---------- Home: search + filters ---------- */
  var grid = $('#grid');
  if (grid) {
    var params = new URLSearchParams(location.search);
    var q = (params.get('q') || '').trim();
    var filter = params.get('f') || 'all';
    var input = $('#q');
    if (input && q) input.value = q;
    var countEl = $('#count');
    var noRes = $('.noresult');
    var newest = null;

    function computeNewest() {
      var cards = $$('.card', grid).filter(function (c) { return c.getAttribute('data-slug'); });
      var sorted = cards.slice().sort(function (a, b) { return (b.getAttribute('data-added') || '').localeCompare(a.getAttribute('data-added') || ''); });
      // "New" = the 12 most recently added (by "added" date; ties keep games.json order)
      newest = {};
      sorted.slice(0, 12).forEach(function (c) { newest[c.getAttribute('data-slug')] = 1; });
    }
    function apply() {
      if (!newest) computeNewest();
      var term = (input ? input.value : q).trim().toLowerCase();
      var words = term.split(/\s+/).filter(Boolean);
      var shown = 0;
      $$('.card', grid).forEach(function (c) {
        var ok = true;
        if (filter === 'new') ok = !!newest[c.getAttribute('data-slug')];
        else if (filter === 'pick') ok = c.getAttribute('data-pick') === '1';
        else if (filter === 'kids') ok = c.getAttribute('data-kids') === '1';
        else if (filter !== 'all') ok = c.getAttribute('data-cat') === filter;
        if (ok && words.length) {
          var hay = c.getAttribute('data-search') || '';
          ok = words.every(function (w) { return hay.indexOf(w) !== -1; });
        }
        c.hidden = !ok;
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown + (shown === 1 ? ' game' : ' games') + (words.length ? ' for “' + term + '”' : '');
      if (noRes) noRes.hidden = shown !== 0;
      $$('.chip').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === filter)); });
    }
    $$('.chip').forEach(function (b) {
      b.addEventListener('click', function () { filter = b.getAttribute('data-filter'); apply(); });
    });
    if (input) {
      input.addEventListener('input', function () { apply(); });
      var form = input.form;
      if (form) form.addEventListener('submit', function (e) {
        e.preventDefault(); apply();
        var u = new URL(location.href); if (input.value.trim()) u.searchParams.set('q', input.value.trim()); else u.searchParams.delete('q');
        history.replaceState(null, '', u.pathname + u.search + '#games');
        var gs = $('#games'); if (gs) gs.scrollIntoView({ behavior: 'smooth', block: 'start' });
        input.blur();
      });
    }
    if (q || filter !== 'all') { apply(); var gs = $('#games'); if (gs && q) gs.scrollIntoView({ block: 'start' }); }
    // Games added to games.json but not yet built into pages still show up here.
    loadGames().then(function (list) {
      var have = {};
      $$('.card', grid).forEach(function (c) { have[c.getAttribute('data-slug')] = 1; });
      var hidden = (document.documentElement.getAttribute('data-hidden') || '').split(',');
      var extra = list.filter(function (g) { return g && g.slug && !have[g.slug] && hidden.indexOf(g.provider) === -1; }); // hiddenProviders
      if (extra.length) { grid.insertAdjacentHTML('afterbegin', extra.map(cardHTML).join('')); newest = null; apply(); }
    }).catch(function () { /* pages already have every built game */ });
  }

  /* ---------- Game page: click-to-play, fullscreen, share ---------- */
  function setupPlayer(root) {
    var player = $('#player', root);
    if (!player) return;
    var btn = $('#playbtn', root);
    function start() {
      if (player.classList.contains('on')) return;
      var f = document.createElement('iframe');
      var src = player.getAttribute('data-src') || '';
      // GameDistribution checks that the referrer matches the page the game is really on.
      if (src.indexOf('gd_sdk_referrer_url=') !== -1) src = src.replace(/gd_sdk_referrer_url=[^&]*/, 'gd_sdk_referrer_url=' + encodeURIComponent(location.origin + location.pathname));
      f.src = src;
      f.title = player.getAttribute('data-title') || 'Game';
      f.setAttribute('allow', 'autoplay; fullscreen; gamepad; accelerometer; gyroscope; clipboard-write');
      f.setAttribute('allowfullscreen', '');
      f.setAttribute('scrolling', 'no');
      f.setAttribute('referrerpolicy', 'origin');
      player.appendChild(f);
      player.classList.add('on');
      try { f.focus(); } catch (e) {}
    }
    if (btn) btn.addEventListener('click', start);
    var fs = $('#fsbtn', root);
    if (fs) fs.addEventListener('click', function () {
      start();
      var el = player;
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        var p = req.call(el); if (p && p.catch) p.catch(function () { pseudo(true); });
      } else { pseudo(true); }
    });
    function pseudo(on) {
      document.documentElement.classList.toggle('pseudo-fs', on);
      player.classList.toggle('pseudo', on);
      var x = $('.fs-close', player);
      if (on && !x) {
        x = document.createElement('button'); x.type = 'button'; x.className = 'fs-close'; x.setAttribute('aria-label', 'Exit full screen'); x.textContent = '✕';
        x.addEventListener('click', function () { pseudo(false); });
        player.appendChild(x);
      }
      if (!on && x) x.remove();
    }
    var copy = $('#copybtn', root);
    if (copy) copy.addEventListener('click', function () {
      var url = copy.getAttribute('data-url') || location.href;
      var done = function () { copy.textContent = 'Copied ✓'; setTimeout(function () { copy.textContent = 'Copy link'; }, 1800); };
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        navigator.share({ title: document.title, url: url }).catch(function () {});
      } else if (navigator.clipboard) { navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link:', url); }); }
      else { prompt('Copy this link:', url); }
    });
  }
  setupPlayer(document);

  /* ---------- 404: play a game that is in games.json but has no page yet ---------- */
  var fb = $('main[data-fallback]');
  var m = location.pathname.match(/^\/game\/([a-z0-9-]+)\/?$/);
  if (fb && m) {
    loadGames().then(function (list) {
      var g = list.filter(function (x) { return x.slug === m[1]; })[0];
      if (!g) return;
      document.title = g.title + ' — Play Free Online';
      var src = g.embed;
      if (g.provider === 'gamedistribution') src += (src.indexOf('?') === -1 ? '?' : '&') + 'gd_sdk_referrer_url=' + encodeURIComponent(location.origin + '/game/' + g.slug + '/');
      fb.classList.remove('prose');
      fb.innerHTML = '<nav class="crumbs"><a href="/">Home</a> › <span>' + esc(g.title) + '</span></nav>' +
        '<div class="game-layout' + (g.orientation === 'portrait' ? ' is-portrait' : '') + '"><section class="player-col"><div class="player" id="player" style="--ar:' + (g.width || 16) + '/' + (g.height || 9) + '" data-src="' + esc(src) + '" data-title="' + esc(g.title) + '">' +
        '<img class="poster" src="' + esc(g.thumb) + '" alt=""><button type="button" class="playbtn" id="playbtn"><span class="playcircle">▶</span><span class="playlabel">PLAY</span></button></div>' +
        '<div class="player-bar"><span class="small muted"></span><span class="bar-btns"><button type="button" class="ibtn" id="fsbtn">Full screen</button></span></div></section>' +
        '<section class="info-col"><h1 class="game-h">' + esc(g.title) + '</h1><h2>About the game</h2><p>' + esc(g.description) + '</p>' + (g.controls ? '<h2>Controls</h2><p>' + esc(g.controls) + '</p>' : '') + '</section></div>';
      setupPlayer(fb);
    }).catch(function () {});
  }
})();
