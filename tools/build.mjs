#!/usr/bin/env node
// Indiandevanish Games — static site builder (no npm packages needed).
// Run from the repo root:  node tools/build.mjs
// Reads config.json + games.json, writes every page, sitemap.xml, robots.txt, manifest.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const allGames = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));
// config.json "hiddenProviders": e.g. ["gamedistribution"] hides those games everywhere without deleting them.
const HIDDEN = new Set(cfg.hiddenProviders || []);
const games = allGames.filter((g) => !HIDDEN.has(g.provider));
const SITE = cfg.siteUrl.replace(/\/$/, '');
const NAME = cfg.siteName;
const V = Date.now().toString(36); // cache-buster for css/js

const CATS_ALL = [
  { key: 'Racing', slug: 'racing', emoji: '🏁', hi: 'Racing & Driving games' },
  { key: 'Puzzle', slug: 'puzzle', emoji: '🧩', hi: 'Puzzle & brain games' },
  { key: 'Arcade', slug: 'arcade', emoji: '🕹️', hi: 'Arcade & runner games' },
  { key: 'Sports', slug: 'sports', emoji: '⚽', hi: 'Sports games' },
  { key: 'Board', slug: 'board', emoji: '🎲', hi: 'Board & card games (Ludo, Chess…)' },
];
const CATS = CATS_ALL.filter((c) => games.some((g) => g.category === c.key));
const catOf = (k) => CATS.find((c) => c.key === k) || { key: k, slug: k.toLowerCase().replace(/[^a-z0-9]+/g, '-'), emoji: '🎮', hi: k + ' games' };

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'; };
const abs = (u) => (/^https?:/.test(u) ? u : SITE + u);
const gameUrl = (g) => `/game/${g.slug}/`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

function validate() {
  const seen = new Set();
  for (const g of games) {
    for (const k of ['slug', 'title', 'category', 'embed', 'thumb']) if (!g[k]) throw new Error(`games.json: "${g.title || g.slug}" is missing "${k}"`);
    if (!/^[a-z0-9-]+$/.test(g.slug)) throw new Error(`games.json: slug "${g.slug}" — use only small letters, numbers and -`);
    if (seen.has(g.slug)) throw new Error(`games.json: slug "${g.slug}" is used twice`);
    seen.add(g.slug);
  }
}

function embedSrc(g) {
  const r = cfg.revenue || {};
  let u = g.embed;
  if (g.provider === 'gamedistribution' && r.gameDistributionReferrer !== false) {
    u += (u.includes('?') ? '&' : '?') + 'gd_sdk_referrer_url=' + encodeURIComponent(SITE + gameUrl(g));
  }
  return u;
}

function head({ title, desc, url, image, type = 'website', extra = '' }) {
  const img = abs(image || '/assets/img/og-awr.jpg');
  return `<!doctype html>
<html lang="${cfg.lang || 'en-IN'}"${HIDDEN.size ? ` data-hidden="${[...HIDDEN].join(',')}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta name="theme-color" content="#0d0f14">
<meta name="robots" content="index,follow,max-image-preview:large">
${cfg.googleSiteVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleSiteVerification)}">` : '<!-- Google Search Console: paste your code into config.json "googleSiteVerification" and run the build -->'}
<meta property="og:site_name" content="${esc(NAME)}">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${esc(img)}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(img)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/styles.css?v=${V}">
${extra}
</head>`;
}

function header(active = '') {
  return `<a class="skip" href="#main">Skip to games</a>
<header class="top">
  <div class="wrap top-in">
    <a class="brand" href="/" aria-label="${esc(NAME)} home">
      <img src="/assets/icons/logo.svg" width="34" height="34" alt="">
      <span class="brand-name">${esc(NAME)}</span>
    </a>
    <form class="search" role="search" action="/" method="get">
      <label class="sr" for="q">Search games</label>
      <input id="q" name="q" type="search" placeholder="Game dhoondo… (e.g. ludo, car, puzzle)" autocomplete="off" enterkeyhint="search">
      <button type="submit" aria-label="Search">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M10 4a6 6 0 1 0 3.6 10.8l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 10 4zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8z"/></svg>
      </button>
    </form>
    <nav class="topnav" aria-label="Main">
      <a class="nav-games" href="/#games"${active === 'games' ? ' aria-current="page"' : ''}>Games</a>
      <a href="/about/"${active === 'about' ? ' aria-current="page"' : ''}>About</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  const year = new Date().getFullYear();
  return `<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <a class="brand" href="/"><img src="/assets/icons/logo.svg" width="28" height="28" alt=""><span class="brand-name">${esc(NAME)}</span></a>
      <p class="muted">${esc(cfg.tagline)}</p>
      <p class="muted small">Indie games made in ${esc(cfg.developerCity)} — plus free partner games from GameMonetize and GameDistribution. Partner games belong to their makers.</p>
    </div>
    <nav class="foot-links" aria-label="Categories">
      <h2>Categories</h2>
      ${CATS.map((c) => `<a href="/category/${c.slug}/">${c.emoji} ${c.key}</a>`).join('\n      ')}
      <a href="/category/kids/">🧒 Kids-safe</a>
    </nav>
    <nav class="foot-links" aria-label="Site">
      <h2>Site</h2>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/privacy/">Privacy Policy</a>
      <a href="/terms/">Terms</a>
      <a href="${esc(cfg.itchProfile)}" rel="noopener" target="_blank">itch.io page</a>
    </nav>
  </div>
  <p class="wrap copy small muted">© ${year} ${esc(cfg.developerName)}. Partner games, names and thumbnails © their respective developers.</p>
</footer>`;
}

function card(g, i = 99) {
  const c = catOf(g.category);
  const badge = g.provider === 'own' ? '<span class="badge own">By Anish</span>' : '';
  const kid = g.kids ? '<span class="dot-kid" title="Kids-safe">🧒</span>' : '';
  return `<a class="card" href="${gameUrl(g)}" data-slug="${esc(g.slug)}" data-cat="${esc(g.category)}" data-kids="${g.kids ? 1 : 0}" data-pick="${g.pick ? 1 : 0}" data-added="${esc(g.added || '')}" data-search="${esc([g.title, g.category, ...(g.tags || [])].join(' ').toLowerCase())}">
  <span class="thumb"><img src="${esc(g.thumb)}" alt="${esc(g.title)}" width="512" height="384" ${i < 4 ? 'fetchpriority="low"' : 'loading="lazy"'} decoding="async">${badge}</span>
  <span class="meta"><span class="t">${esc(g.title)}</span><span class="c">${c.emoji} ${esc(c.key)}${kid}</span></span>
</a>`;
}

function chips(active = 'all') {
  const items = [['all', 'All'], ['new', '✨ New'], ['pick', '🔥 Top Picks'], ...CATS.map((c) => [c.key, `${c.emoji} ${c.key}`]), ['kids', '🧒 Kids-safe']];
  return `<div class="chips" role="toolbar" aria-label="Filter games">${items.map(([k, l]) => `<button type="button" class="chip" data-filter="${k}" aria-pressed="${k === active}">${l}</button>`).join('')}</div>`;
}

const mini = (h) => h.replace(/\n[ \t]+/g, '\n').replace(/\n{2,}/g, '\n');
function page(file, html) {
  html = mini(html);
  const out = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

const featured = games.find((g) => g.slug === cfg.featuredSlug) || games[0];
const own = games.filter((g) => g.provider === 'own');
const byAdded = [...games].sort((a, b) => String(b.added || '').localeCompare(String(a.added || '')));

function home() {
  const title = `${NAME} — Free Online Games | Indian Auto Wala Rush & more`;
  const desc = clip(`Play free online games on your phone or PC — no download. ${featured.title}, a desi auto-rickshaw driving game made in Gorakhpur, plus racing, puzzle, ludo, chess and kids-safe games.`, 158);
  const ldj = ld({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: NAME, inLanguage: cfg.lang,
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      { '@type': 'Person', '@id': SITE + '/#dev', name: cfg.developerName, url: SITE + '/about/', sameAs: [cfg.itchProfile] },
      { '@type': 'ItemList', name: 'Games', itemListElement: games.slice(0, 30).map((g, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + gameUrl(g), name: g.title })) },
    ],
  });
  const rest = games.filter((g) => g.provider !== 'own');
  const html = `${head({ title, desc, url: '/', image: featured.image || featured.thumb, extra: ldj })}
<body class="home">
${header('games')}
<main id="main">
  <section class="hero wrap" aria-labelledby="hero-title">
    <div class="hero-card">
      <picture class="hero-art">
        <source media="(max-width: 700px)" srcset="/assets/img/awr-hero-sm.webp">
        <img src="/assets/img/awr-hero.webp" alt="Indian Auto Wala Rush — yellow-green auto-rickshaw at a busy Indian chowk" width="870" height="1080" fetchpriority="high">
      </picture>
      <div class="hero-copy">
        <p class="kicker">⭐ Anish ka apna game · Made in Gorakhpur</p>
        <h1 id="hero-title">${esc(featured.title)}</h1>
        <p class="lede">Auto lo, sawari bharo, traffic se bacho! Hold GAS, dodge baraats, brake for cricket kids — desi roads ka asli rush. Phone pe seedha khelo.</p>
        <div class="cta">
          <a class="btn play" href="${gameUrl(featured)}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg> PLAY FREE</a>
          ${featured.links && featured.links.apk ? `<a class="btn ghost" href="${esc(featured.links.apk)}" target="_blank" rel="noopener">⬇ Android APK (itch.io)</a>` : ''}
        </div>
        <ul class="hero-tags" aria-label="Game highlights"><li>🛺 Auto-rickshaw</li><li>🪔 Diwali mode</li><li>🐒 Banana monkey</li><li>🇮🇳 Hindi + English</li></ul>
      </div>
    </div>
  </section>

  <section class="wrap" id="games" aria-labelledby="all-h">
    <div class="sec-head">
      <h2 id="all-h">Free games — khelo abhi</h2>
      <p class="muted small" id="count" aria-live="polite">${games.length} games</p>
    </div>
    ${chips()}
    <p class="noresult" hidden>Koi game nahi mila 😅 — try "car", "ludo" or "puzzle".</p>
    <div class="grid" id="grid">
${games.map((g, i) => card(g, i)).join('\n')}
    </div>
  </section>

  <section class="wrap seo-copy" aria-labelledby="about-h">
    <h2 id="about-h">About ${esc(NAME)}</h2>
    <p>${esc(NAME)} is the home of games by Indiandevanish, an indie game developer from ${esc(cfg.developerCity)}. Start with <a href="${gameUrl(featured)}">${esc(featured.title)}</a> — an auto-rickshaw game full of desi road moments — then try free partner games in ${CATS.map((c) => `<a href="/category/${c.slug}/">${c.key.toLowerCase()}</a>`).join(', ')}. Everything runs in your browser: no install, works on Android phones and PCs.</p>
  </section>
</main>
${footer()}
<script src="/assets/app.js?v=${V}" defer></script>
</body>
</html>`;
  page('index.html', html);
}

function category(c, list, opts = {}) {
  const title = `${opts.title || c.hi} — Play Free Online | ${NAME}`;
  const desc = clip(opts.desc || `Play free ${c.key.toLowerCase()} games online on ${NAME}: ${list.slice(0, 5).map((g) => g.title).join(', ')} and more. No download, phone and PC.`, 158);
  const url = `/category/${c.slug}/`;
  const ldj = ld({ '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: opts.title || c.hi, url: SITE + url, isPartOf: { '@id': SITE + '/#website' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' }, { '@type': 'ListItem', position: 2, name: opts.title || c.hi, item: SITE + url }] },
  ] });
  page(`category/${c.slug}/index.html`, `${head({ title, desc, url, extra: ldj })}
<body>
${header('games')}
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${esc(opts.title || c.hi)}</span></nav>
  <h1 class="page-h">${c.emoji} ${esc(opts.title || c.hi)}</h1>
  <p class="muted">${list.length} free games · tap any game to play</p>
  ${chips(opts.chip || c.key).replace(/<button type="button" class="chip" data-filter="([^"]+)"/g, (m, k) => m.replace('<button type="button"', `<a href="${k === 'all' || k === 'new' || k === 'pick' ? '/?f=' + k + '#games' : k === 'kids' ? '/category/kids/' : '/category/' + catOf(k).slug + '/'}"`)).replace(/<\/button>/g, '</a>')}
  <div class="grid">
${list.map((g, i) => card(g, i)).join('\n')}
  </div>
</main>
${footer()}
</body>
</html>`);
}

function related(g) {
  const same = games.filter((x) => x.slug !== g.slug && x.category === g.category);
  const others = games.filter((x) => x.slug !== g.slug && x.category !== g.category && (x.pick || x.provider === 'own'));
  const out = [];
  if (g.provider !== 'own' && featured.slug !== g.slug) out.push(featured);
  for (const x of [...same, ...others]) { if (out.length >= 8) break; if (!out.includes(x)) out.push(x); }
  return out;
}

function gamePage(g) {
  const c = catOf(g.category);
  const url = gameUrl(g);
  const portrait = g.orientation === 'portrait';
  const title = g.provider === 'own'
    ? `${g.title} — Play Free Online (Desi Auto-Rickshaw Game) | ${NAME}`
    : `${g.title} — Play Free Online | ${NAME}`;
  const desc = clip(`Play ${g.title} free online — ${g.description}`, 158);
  const image = g.image || g.thumb;
  const vg = { '@context': 'https://schema.org', '@type': 'VideoGame', name: g.title, url: SITE + url, image: abs(image), description: clip(g.description, 500),
    genre: g.category, gamePlatform: ['Web browser', 'Android'], applicationCategory: 'Game', operatingSystem: 'Any (web browser)',
    playMode: 'SinglePlayer', inLanguage: g.provider === 'own' ? ['en', 'hi'] : 'en', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock' } };
  if (g.provider === 'own') { vg.author = { '@id': SITE + '/#dev', '@type': 'Person', name: cfg.developerName, url: SITE + '/about/' }; vg.gamePlatform = ['Web browser', 'Android']; }
  else vg.gamePlatform = 'Web browser';
  const crumbs = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
    { '@type': 'ListItem', position: 2, name: c.key + ' games', item: `${SITE}/category/${c.slug}/` },
    { '@type': 'ListItem', position: 3, name: g.title, item: SITE + url } ] };
  const src = embedSrc(g);
  const shareText = `${g.title} — free mein khelo! 🎮`;
  const fullUrl = SITE + url;
  const providerNote = g.provider === 'own' ? 'Made by Indiandevanish' : g.provider === 'gamemonetize' ? 'Game via GameMonetize · may show ads' : 'Game via GameDistribution · may show ads';
  const tags = (g.tags || []).slice(0, 8);
  page(`game/${g.slug}/index.html`, `${head({ title, desc, url, image, type: 'website', extra: ld(vg) + '\n' + ld(crumbs) })}
<body class="gamepage">
${header()}
<main id="main" class="wrap">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/category/${c.slug}/">${esc(c.key)}</a> › <span>${esc(g.title)}</span></nav>
  <div class="game-layout${portrait ? ' is-portrait' : ''}">
    <section class="player-col" aria-label="Game player">
      <div class="player" id="player" style="--ar:${g.width || 16}/${g.height || 9}" data-src="${esc(src)}" data-title="${esc(g.title)}">
        <img class="poster" src="${esc(g.thumb)}" alt="" width="512" height="384" decoding="async">
        <button type="button" class="playbtn" id="playbtn" aria-label="Play ${esc(g.title)}">
          <span class="playcircle"><svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg></span>
          <span class="playlabel">PLAY</span>
        </button>
      </div>
      <div class="player-bar">
        <span class="small muted">${esc(providerNote)}</span>
        <span class="bar-btns">
          <button type="button" class="ibtn" id="fsbtn" aria-label="Full screen"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z"/></svg> Full screen</button>
        </span>
      </div>
    </section>
    <section class="info-col">
      <h1 class="game-h">${esc(g.title)}</h1>
      <p class="game-sub"><a class="pill" href="/category/${c.slug}/">${c.emoji} ${esc(c.key)}</a>${g.kids ? '<span class="pill">🧒 Kids-safe</span>' : ''}${g.provider === 'own' ? '<span class="pill own">⭐ By Anish</span>' : ''}</p>
      ${g.links && g.links.apk ? `<a class="btn ghost wide" href="${esc(g.links.apk)}" target="_blank" rel="noopener">⬇ Download Android APK on itch.io</a>` : ''}
      <div class="share" aria-label="Share">
        <span class="small muted">Dosto ko bhejo:</span>
        <a class="sbtn wa" href="https://wa.me/?text=${encodeURIComponent(shareText + ' ' + fullUrl)}" target="_blank" rel="noopener">WhatsApp</a>
        <a class="sbtn" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}" target="_blank" rel="noopener">Facebook</a>
        <a class="sbtn" href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&amp;url=${encodeURIComponent(fullUrl)}" target="_blank" rel="noopener">X</a>
        <a class="sbtn" href="https://t.me/share/url?url=${encodeURIComponent(fullUrl)}&amp;text=${encodeURIComponent(shareText)}" target="_blank" rel="noopener">Telegram</a>
        <button type="button" class="sbtn" id="copybtn" data-url="${esc(fullUrl)}">Copy link</button>
      </div>
      <h2>About the game</h2>
      <p>${esc(g.description)}</p>
      ${g.controls ? `<h2>Controls</h2><p>${esc(g.controls)}</p>` : ''}
      ${g.screens ? `<h2>Screenshots</h2><div class="shots">${g.screens.map((s) => `<img src="${esc(s)}" alt="${esc(g.title)} screenshot" width="360" height="780" loading="lazy" decoding="async">`).join('')}</div>` : ''}
      ${tags.length ? `<p class="tags">${tags.map((t) => `<span>#${esc(String(t).toLowerCase().replace(/\s+/g, ''))}</span>`).join(' ')}</p>` : ''}
    </section>
  </div>
  <section aria-labelledby="rel-h" class="related">
    <h2 id="rel-h">Aur games khelo</h2>
    <div class="grid">
${related(g).map((x) => card(x)).join('\n')}
    </div>
  </section>
</main>
${footer()}
<script src="/assets/app.js?v=${V}" defer></script>
</body>
</html>`);
}

function simplePage(slug, h1, title, desc, body, active) {
  page(`${slug}/index.html`, `${head({ title: `${title} | ${NAME}`, desc, url: `/${slug}/` })}
<body>
${header(active)}
<main id="main" class="wrap prose">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <span>${esc(h1)}</span></nav>
  <h1 class="page-h">${esc(h1)}</h1>
${body}
</main>
${footer()}
</body>
</html>`);
}

function staticPages() {
  const updated = '30 October 2026';
  simplePage('about', 'About Indiandevanish', 'About — Indie game developer from Gorakhpur', `${NAME} is run by Indiandevanish, an indie game developer from Gorakhpur, India, making desi games like Indian Auto Wala Rush.`, `
  <div class="about-hero"><img src="/assets/img/awr-thumb.webp" alt="Indian Auto Wala Rush cover art" width="512" height="384" loading="lazy">
  <div><p class="lede">Namaste! 🙏 I'm <strong>Anish</strong> — on the internet, <strong>Indiandevanish</strong>. I'm an indie game developer from <strong>Gorakhpur, Uttar Pradesh</strong>, building games that feel like home: our roads, our festivals, our chai breaks.</p></div></div>
  <h2>My games</h2>
  <p>My main game is <a href="/game/indian-auto-wala-rush/">Indian Auto Wala Rush</a> — you drive an auto-rickshaw through busy Indian streets, pick up passengers, and survive baraats, red signals, cricket kids and one very naughty monkey. It runs in the browser and there's an Android APK on <a href="${esc(cfg.itchProfile)}" target="_blank" rel="noopener">itch.io</a>. More games are coming.</p>
  <h2>Why this site?</h2>
  <p>I wanted one place where friends (and anyone searching) can play my games instantly — plus a collection of good, family-friendly free games from partner networks, so there's always something to play. Partner games are made by other studios and are shown here through the official embeds from GameMonetize and GameDistribution; they may show ads, which helps keep this site free.</p>
  <h2>Find me</h2>
  <ul><li>itch.io: <a href="${esc(cfg.itchProfile)}" target="_blank" rel="noopener">${esc(cfg.itchProfile.replace(/^https?:\/\//, ''))}</a></li><li><a href="/contact/">Contact</a></li></ul>`, 'about');

  simplePage('contact', 'Contact', 'Contact', `How to contact ${NAME} — game suggestions, bug reports and business enquiries.`, `
  <p>Game ke baare mein kuch kehna hai? Bug mila, idea hai, ya business enquiry? Mujhse yahan baat karo:</p>
  <ul>
    ${cfg.contactEmail ? `<li>Email: <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></li>` : ''}
    <li>itch.io: <a href="${esc(cfg.itchProfile)}" target="_blank" rel="noopener">leave a comment on my itch.io page</a></li>
  </ul>
  <p class="muted small">Partner games (from GameMonetize / GameDistribution) are made by other developers — for problems inside those games, the developer's own page is the best place. If a game here should not be here, tell me and I'll remove it.</p>`);

  simplePage('privacy', 'Privacy Policy', 'Privacy Policy', `Privacy policy for ${NAME}: what data the site and the third-party game and ad partners may collect, cookies, and your choices.`, `
  <p class="muted small">Last updated: ${updated}</p>
  <p>This policy explains what happens to your information when you use <strong>${esc(SITE.replace(/^https?:\/\//, ''))}</strong> ("the site"), run by ${esc(cfg.developerName)}.</p>
  <h2>What the site itself collects</h2>
  <p>Nothing directly. The site is a set of static pages: there are no accounts, no sign-up forms and no comment boxes. The site's own pages do not set cookies. The site is hosted on GitHub Pages, and GitHub may log technical data such as your IP address when pages are requested (see GitHub's privacy statement).</p>
  <h2>Third-party games and advertising</h2>
  <p>Most games on the site are loaded from third-party game networks — <strong>GameMonetize</strong> and <strong>GameDistribution</strong> — inside an embedded frame. These games <strong>show advertisements</strong> (for example before a game starts or between levels). The game networks and their advertising partners, which can include Google, may use cookies, local storage, device identifiers and similar technologies to show ads, limit how often you see them, measure performance, prevent fraud and, where allowed, personalise ads based on your visits to this and other websites. Revenue from these ads is shared with the site owner.</p>
  <p>This happens under the third parties' own privacy policies:</p>
  <ul>
    <li>GameMonetize — <a href="https://gamemonetize.com/privacypolicy" target="_blank" rel="noopener">gamemonetize.com/privacypolicy</a></li>
    <li>GameDistribution — <a href="https://static.gamedistribution.com/policy/privacy-enduser.html" target="_blank" rel="noopener">GameDistribution end-user privacy notice</a></li>
    <li>How Google uses data from sites that use its services — <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">policies.google.com/technologies/partner-sites</a></li>
  </ul>
  <p>Games may also save your progress in your browser's local storage. Indian Auto Wala Rush saves your coins and settings only on your own device.</p>
  <h2>Your choices</h2>
  <ul>
    <li>You can block or delete cookies in your browser settings; games still work, ads may be less relevant.</li>
    <li>You can opt out of personalised ads from Google at <a href="https://adssettings.google.com" target="_blank" rel="noopener">adssettings.google.com</a> and from many networks at <a href="https://www.youronlinechoices.eu" target="_blank" rel="noopener">youronlinechoices.eu</a> or <a href="https://optout.aboutads.info" target="_blank" rel="noopener">optout.aboutads.info</a>.</li>
    <li>Where the law requires consent (for example in the EU/UK), the game networks show their own consent message before personalised ads.</li>
  </ul>
  <h2>Children</h2>
  <p>We pick family-friendly games, and the site does not knowingly collect personal information from children. The ad networks are responsible for serving ads in line with child-privacy laws for the games they deliver. Parents: if you have a concern, please <a href="/contact/">contact us</a>.</p>
  <h2>Links to other sites</h2>
  <p>The site links to other websites (itch.io, social share buttons, partner networks). Their privacy practices are their own.</p>
  <h2>Changes</h2>
  <p>If this policy changes, the new version will be posted on this page with a new date.</p>
  <h2>Contact</h2>
  <p>Questions? See the <a href="/contact/">contact page</a>.</p>`);

  simplePage('terms', 'Terms of Use', 'Terms of Use', `Terms of use for ${NAME}: free games for personal use, third-party content and ads, no warranty.`, `
  <p class="muted small">Last updated: ${updated}</p>
  <h2>Using the site</h2>
  <p>${esc(NAME)} lets you play free browser games for personal, non-commercial fun. Please don't try to break, overload or copy the site, and don't use it for anything illegal.</p>
  <h2>Games and content</h2>
  <p>Indian Auto Wala Rush and its art are made by ${esc(cfg.developerName)}. All other games, names and images belong to their own developers and are shown through the official embeds of GameMonetize and GameDistribution under those networks' terms. If you own a game shown here and want it removed, <a href="/contact/">contact us</a>.</p>
  <h2>Ads</h2>
  <p>Partner games may show advertisements provided by third parties. We don't control the content of each ad; if you see something inappropriate, please tell us. See the <a href="/privacy/">Privacy Policy</a> for how ads use data.</p>
  <h2>No warranty</h2>
  <p>The site and games are provided "as is". We do our best to keep everything working and family-friendly but can't promise every game will always load, and we are not liable for any loss from using the site.</p>
  <h2>Changes</h2>
  <p>We may update these terms, add or remove games at any time. The latest version is always on this page.</p>`);

  // 404 that can also play games added to games.json but not built yet
  page('404.html', `${head({ title: `Page not found | ${NAME}`, desc: 'This page does not exist.', url: '/404.html' }).replace('index,follow,max-image-preview:large', 'noindex')}
<body class="notfound">
${header()}
<main id="main" class="wrap prose" data-fallback="1">
  <h1 class="page-h">Arre! Ye page nahi mila 🛺💨</h1>
  <p>Shayad link galat hai. <a href="/">Home pe chalo</a> — wahan saare games hain.</p>
</main>
${footer()}
<script src="/assets/app.js?v=${V}" defer></script>
</body>
</html>`);
}

function seoFiles() {
  const urls = [['/', '1.0'], ...CATS.map((c) => [`/category/${c.slug}/`, '0.7']), ['/category/kids/', '0.6'], ...games.map((g) => [gameUrl(g), g.provider === 'own' ? '0.9' : '0.6']), ['/about/', '0.5'], ['/contact/', '0.3'], ['/privacy/', '0.2'], ['/terms/', '0.2']];
  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /tools/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  fs.writeFileSync(path.join(ROOT, 'manifest.webmanifest'), JSON.stringify({
    name: NAME, short_name: cfg.shortName || NAME, description: cfg.tagline, start_url: '/', scope: '/', display: 'standalone',
    background_color: '#0d0f14', theme_color: '#0d0f14', lang: cfg.lang,
    icons: [ { src: '/assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/assets/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ],
  }, null, 2));
  // ads.txt is a plain file in the repo root — edit it directly (it is never generated).
}

validate();
// clean old generated game pages so removed games disappear
for (const d of ['game', 'category']) fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
home();
for (const c of CATS) category(c, games.filter((g) => g.category === c.key));
category({ key: 'Kids', slug: 'kids', emoji: '🧒' }, games.filter((g) => g.kids), { title: 'Kids-safe games', chip: 'kids', desc: `Kids-safe free online games on ${NAME}: gentle puzzle, colouring, animal and board games picked for young players. No download.` });
for (const g of games) gamePage(g);
staticPages();
seoFiles();
console.log(`Built ${games.length} games, ${CATS.length + 1} categories → ${ROOT}`);
