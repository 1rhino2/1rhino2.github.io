/* 1rhino2.github.io - site behavior */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('y').textContent = String(new Date().getFullYear());

// for whoever opens devtools. you are the target audience.
console.log(
  '%c1rhino2%c  bots, apis, scrapers, automation.\n' +
  'the pipeline in /lab is a real sim: token bucket, backoff w/ jitter,\n' +
  'bounded queue, worker pool, circuit breaker. source is right there.\n' +
  'press / anywhere for the shell. discord: 1rhino2',
  'font-weight:700;color:#9fb6d9', 'color:#99a2b0'
);

/* --- local clock ---------------------------------------------------- */

function updateClock() {
  const el = document.getElementById('hero-clock');
  if (!el) return;
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    el.textContent = fmt.format(new Date()) + ' ET';
  } catch (_e) {
    const d = new Date();
    el.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} local`;
  }
}

updateClock();
setInterval(updateClock, 30000);

/* --- mobile nav ----------------------------------------------------- */

const toggle = document.getElementById('nav-toggle');
const nav = document.getElementById('nav');

if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/* --- active section in nav ------------------------------------------ */

const navLinks = Array.from(document.querySelectorAll('.nav a[data-link]'));
const sectionEls = navLinks
  .map((a) => document.getElementById(a.getAttribute('data-link')))
  .filter(Boolean);

if ('IntersectionObserver' in window && sectionEls.length) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      let topMost = null;
      let topRatio = 0;
      for (const e of entries) {
        if (e.isIntersecting && e.intersectionRatio > topRatio) {
          topMost = e.target.id;
          topRatio = e.intersectionRatio;
        }
      }
      if (topMost) {
        navLinks.forEach((a) => {
          a.classList.toggle('is-active', a.getAttribute('data-link') === topMost);
        });
      }
    },
    { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
  );
  sectionEls.forEach((el) => navObserver.observe(el));
}

/* --- section fade-in ------------------------------------------------ */

if (!reduceMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
  );
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}

/* --- GitHub repos --------------------------------------------------- */

const OWNER = '1rhino2';
const EXCLUDED = new Set(['RhinoWAFNoah']);

const LIVE_DEMOS = {
  'pocket-net': 'https://pocket-net.vercel.app/',
  pocket: 'https://pocket-net.vercel.app/',
  rhinonet: 'https://pocket-net.vercel.app/',
  'ryoki-tenkai': 'https://ryoki-tenkai.vercel.app/',
  ryoki: 'https://ryoki-tenkai.vercel.app/',
  tenkai: 'https://ryoki-tenkai.vercel.app/',
};

/* github lang colors go neon against this palette, so these are muted
   cousins that still read as distinct */
const RAIL = {
  TypeScript: '#7d97c4',
  Go: '#78aabb',
  Python: '#7f95b8',
  JavaScript: '#bfb583',
  HTML: '#bd8873',
  C: '#9399a4',
  'C++': '#b57b96',
  'C#': '#88a98d',
  Rust: '#bda691',
  Java: '#b39575',
  Lua: '#8a89bd',
  D: '#b98a8e',
  Ruby: '#ac7378',
  Shell: '#95b795',
  CSS: '#9585b3',
  Node: '#8fae93',
  R: '#8ba2c0',
};

function railColor(lang) {
  if (!lang) return '#5b6474';
  return RAIL[lang] || '#78818f';
}

// tint the stack chips with the same language colors as the repo list
document.querySelectorAll('.chip[data-lang]').forEach((el) => {
  el.style.setProperty('--dot', railColor(el.getAttribute('data-lang')));
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(n) {
  return Math.floor(Math.random() * n);
}

async function fetchWithTimeout(url, ms) {
  if (typeof AbortController === 'undefined') return fetch(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function keepRepo(r) {
  return r && r.owner && r.owner.login === OWNER && !r.fork && !EXCLUDED.has(r.name);
}

function sortRepos(list, mode) {
  const out = [...list];
  if (mode === 'stars') {
    out.sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name));
  } else if (mode === 'name') {
    out.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    out.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  }
  return out;
}

function filterRepos(list, q) {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  return list.filter((r) => {
    const d = (r.description || '').toLowerCase();
    const topics = (r.topics || []).join(' ').toLowerCase();
    return r.name.toLowerCase().includes(t) || d.includes(t) || topics.includes(t);
  });
}

/* --- the receipts: everything below is computed from the one repos
   call we already make. no second request, no invented numbers. ---- */

function countUp(el, target, suffix) {
  if (!el) return;
  if (reduceMotion || target < 2) {
    el.textContent = String(target) + (suffix || '');
    return;
  }
  const dur = 900;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased)) + (suffix || '');
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(d) {
  return MONTHS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2);
}

function setStats(repos) {
  const list = Array.isArray(repos) ? repos : [];
  const stars = list.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const langs = new Set(list.map((r) => r.language).filter(Boolean));
  const born = list.length
    ? new Date(Math.min(...list.map((r) => new Date(r.created_at).getTime())))
    : null;

  countUp(document.getElementById('stat-stars'), stars);
  const nRepos = document.getElementById('stat-repos');
  if (nRepos) nRepos.textContent = list.length ? String(list.length) : '--';

  countUp(document.getElementById('rs-stars'), stars);
  countUp(document.getElementById('rs-repos'), list.length);
  countUp(document.getElementById('rs-langs'), langs.size);
  const since = document.getElementById('rs-since');
  if (since && born) since.textContent = monthLabel(born);

  renderLangBar(list);
  renderTimeline(list);

  const wrap = document.getElementById('repo-stats');
  if (wrap && list.length) wrap.hidden = false;
}

function renderLangBar(repos) {
  const bar = document.getElementById('lang-bar');
  const legend = document.getElementById('lang-legend');
  if (!bar) return;
  const counts = new Map();
  for (const r of repos) {
    const k = r.language || 'other';
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = repos.length || 1;
  bar.innerHTML = '';
  if (legend) legend.innerHTML = '';
  for (const [lang, n] of ranked) {
    const seg = document.createElement('span');
    seg.className = 'lang-seg';
    seg.style.width = (n / total) * 100 + '%';
    seg.style.background = railColor(lang === 'other' ? null : lang);
    seg.title = lang + ' ' + n;
    bar.appendChild(seg);
    if (legend) {
      const tag = document.createElement('span');
      tag.className = 'lang-tag';
      const dot = document.createElement('i');
      dot.style.background = railColor(lang === 'other' ? null : lang);
      tag.appendChild(dot);
      tag.appendChild(document.createTextNode(lang + ' ' + n));
      legend.appendChild(tag);
    }
  }
}

function renderTimeline(repos) {
  const tl = document.getElementById('repo-timeline');
  if (!tl || !repos.length) return;
  const rows = repos
    .map((r) => ({
      name: r.name,
      lang: r.language,
      from: new Date(r.created_at).getTime(),
      to: new Date(r.pushed_at).getTime(),
      stars: r.stargazers_count || 0,
    }))
    .sort((a, b) => a.from - b.from);

  const min = Math.min(...rows.map((r) => r.from));
  const max = Math.max(...rows.map((r) => r.to));
  const span = Math.max(1, max - min);

  tl.innerHTML = '';

  // month ticks across the top so the span reads as real time
  const axis = document.createElement('div');
  axis.className = 'tl-axis';
  const d = new Date(min);
  d.setDate(1);
  while (d.getTime() <= max) {
    const pos = ((d.getTime() - min) / span) * 100;
    if (pos >= 0 && pos <= 100) {
      const tick = document.createElement('span');
      tick.className = 'tl-tick';
      tick.style.left = pos + '%';
      // label every third month so it does not turn to mush
      if (d.getMonth() % 3 === 0) tick.dataset.label = monthLabel(d);
      axis.appendChild(tick);
    }
    d.setMonth(d.getMonth() + 1);
  }
  tl.appendChild(axis);

  for (const r of rows) {
    const lane = document.createElement('div');
    lane.className = 'tl-lane';
    const label = document.createElement('span');
    label.className = 'tl-name';
    label.textContent = r.name;
    const track = document.createElement('span');
    track.className = 'tl-track';
    const bar = document.createElement('i');
    const left = ((r.from - min) / span) * 100;
    const w = Math.max(1.5, ((r.to - r.from) / span) * 100);
    bar.style.left = left + '%';
    bar.style.width = Math.min(100 - left, w) + '%';
    bar.style.background = railColor(r.lang);
    const fromTxt = monthLabel(new Date(r.from));
    const toTxt = monthLabel(new Date(r.to));
    bar.title = r.name + ': ' + fromTxt + ' to ' + toTxt + (r.stars ? ', ' + r.stars + ' stars' : '');
    track.appendChild(bar);
    lane.appendChild(label);
    lane.appendChild(track);
    tl.appendChild(lane);
  }
}

async function fetchReposDesperate(statusEl) {
  const url = `https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`;
  const maxAttempts = 4;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (statusEl) {
      statusEl.textContent = `Loading projects... attempt ${attempt} of ${maxAttempts}.`;
    }
    try {
      const res = await fetchWithTimeout(url, 6500);
      if (res.ok) {
        const data = await res.json();
        return { ok: true, data };
      }
      lastErr = new Error('HTTP ' + res.status);
      const rate = res.status === 403 || res.status === 429;
      const base = Math.min(16000, 420 * Math.pow(1.86, attempt - 1));
      await sleep(base * (rate ? 2.4 : 1) + jitter(rate ? 1200 : 650));
    } catch (e) {
      lastErr = e;
      const base = Math.min(14000, 360 * Math.pow(1.94, attempt - 1));
      await sleep(base + jitter(800));
    }
  }

  if (statusEl) {
    statusEl.textContent = 'GitHub took too long. Hit retry or use the profile link below.';
  }
  return { ok: false, error: lastErr };
}

function formatPushed(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  const days = Math.floor((Date.now() - then.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} mo ago`;
  const years = Math.round(days / 365);
  return `${years} yr${years === 1 ? '' : 's'} ago`;
}

function starEl(count, cls) {
  const s = document.createElement('span');
  s.className = cls;
  const glyph = document.createElement('span');
  glyph.textContent = '\u2605';
  glyph.setAttribute('aria-hidden', 'true');
  s.appendChild(glyph);
  s.appendChild(document.createTextNode(' ' + (count || 0)));
  return s;
}

function renderPinned(repos) {
  const wrap = document.getElementById('repo-pinned');
  const grid = document.getElementById('pin-grid');
  if (!wrap || !grid) return;
  const top = [...repos]
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 3);
  if (!top.length || !top[0].stargazers_count) {
    wrap.hidden = true;
    return;
  }
  grid.innerHTML = '';
  for (const r of top) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'pin-card';
    a.href = r.html_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.setProperty('--rail', railColor(r.language));

    const top2 = document.createElement('div');
    top2.className = 'pin-top';
    const name = document.createElement('span');
    name.className = 'pin-name';
    name.textContent = r.name;
    top2.appendChild(name);
    top2.appendChild(starEl(r.stargazers_count, 'pin-stars'));

    const desc = document.createElement('p');
    desc.className = 'pin-desc';
    desc.textContent = r.description || 'No description.';

    const meta = document.createElement('div');
    meta.className = 'pin-meta';
    const dot = document.createElement('span');
    dot.className = 'dot';
    meta.appendChild(dot);
    const bits = [r.language || 'misc'];
    const ago = formatPushed(r.pushed_at);
    if (ago) bits.push(ago);
    const metaText = document.createElement('span');
    metaText.textContent = bits.join(' \u00b7 ');
    meta.appendChild(metaText);

    a.appendChild(top2);
    a.appendChild(desc);
    a.appendChild(meta);
    li.appendChild(a);
    grid.appendChild(li);
  }
  wrap.hidden = false;
}

function renderRepos(repos) {
  const grid = document.getElementById('repo-grid');
  const empty = document.getElementById('repo-empty');
  const count = document.getElementById('repo-count');
  if (!grid) return;
  grid.innerHTML = '';
  if (count) count.textContent = repos.length ? '(' + repos.length + ')' : '';

  if (!repos.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  for (const r of repos) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'repo-row';
    a.href = r.html_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.setProperty('--rail', railColor(r.language));

    const main = document.createElement('span');
    main.className = 'row-main';
    const name = document.createElement('span');
    name.className = 'row-name';
    name.textContent = r.name;
    const desc = document.createElement('span');
    desc.className = 'row-desc';
    desc.textContent = r.description || 'No description.';
    main.appendChild(name);
    main.appendChild(desc);

    // wrapper goes display:contents on desktop so these drop into columns
    const meta = document.createElement('span');
    meta.className = 'row-meta-mobile';

    const lang = document.createElement('span');
    lang.className = 'row-lang';
    const dot = document.createElement('span');
    dot.className = 'dot';
    lang.appendChild(dot);
    lang.appendChild(document.createTextNode(r.language || 'misc'));

    const date = document.createElement('span');
    date.className = 'row-date';
    date.textContent = formatPushed(r.pushed_at) + (r.archived ? ' \u00b7 archived' : '');

    meta.appendChild(lang);
    meta.appendChild(starEl(r.stargazers_count, 'row-stars'));
    meta.appendChild(date);

    a.appendChild(main);
    a.appendChild(meta);
    li.appendChild(a);
    grid.appendChild(li);
  }
}

let allRepos = [];
let stopOctoGame = () => {};

function refresh() {
  const sortEl = document.getElementById('repo-sort');
  const filterEl = document.getElementById('repo-filter');
  const mode = sortEl ? sortEl.value : 'updated';
  const q = filterEl ? filterEl.value : '';
  renderRepos(filterRepos(sortRepos(allRepos, mode), q));
}

function setControlsEnabled(on) {
  const filterEl = document.getElementById('repo-filter');
  const sortEl = document.getElementById('repo-sort');
  if (filterEl) filterEl.disabled = !on;
  if (sortEl) sortEl.disabled = !on;
}

/* --- loading mini-game ---------------------------------------------- */

function runOctoGame(canvas, scoreEl, isRunning) {
  if (!canvas || !canvas.getContext) return () => {};
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  let playerX = W / 2;
  const pw = 56;
  const ph = 10;
  const py = H - 22;
  let items = [];
  let score = 0;
  let lastSpawn = 0;
  let raf = 0;
  const keys = new Set();

  function spawn() {
    const x = 24 + Math.random() * (W - 48);
    const bad = Math.random() < 0.3;
    items.push({
      x,
      y: -14,
      vy: bad ? 3.1 + Math.random() * 2.3 : 1.9 + Math.random() * 1.9,
      type: bad ? 'bug' : 'star',
      r: bad ? 7 : 8,
      rot: 0,
    });
  }

  function frame(now) {
    if (!isRunning()) return;
    if (!lastSpawn) lastSpawn = now;
    if (now - lastSpawn > 620 + Math.random() * 380) {
      spawn();
      lastSpawn = now;
    }

    if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) playerX -= 6.5;
    if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) playerX += 6.5;
    playerX = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, playerX));

    const px = playerX - pw / 2;

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy;
      it.rot += 0.06;
      if (it.type === 'star') {
        const dx = it.x - playerX;
        const dy = it.y - (py + ph / 2);
        if (Math.hypot(dx, dy) < it.r + 18) {
          score += 10;
          items.splice(i, 1);
          continue;
        }
      } else {
        const bugL = it.x - it.r;
        const bugR = it.x + it.r;
        const bugT = it.y - it.r;
        const bugB = it.y + it.r;
        if (bugR > px && bugL < px + pw && bugB > py && bugT < py + ph) {
          score = Math.max(0, score - 15);
          items.splice(i, 1);
          continue;
        }
      }
      if (it.y > H + 24) items.splice(i, 1);
    }

    if (scoreEl) scoreEl.textContent = String(score);

    ctx.fillStyle = '#0a0d12';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#191f29';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 34) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
      ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 34) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
      ctx.stroke();
    }

    for (const it of items) {
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      if (it.type === 'star') {
        ctx.fillStyle = '#9fb6d9';
        ctx.beginPath();
        ctx.arc(0, 0, it.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#8d5a63';
        ctx.fillRect(-it.r, -it.r, it.r * 2, it.r * 2);
        ctx.strokeStyle = '#c4838c';
        ctx.lineWidth = 1;
        ctx.strokeRect(-it.r + 0.5, -it.r + 0.5, it.r * 2 - 1, it.r * 2 - 1);
      }
      ctx.restore();
    }

    ctx.fillStyle = '#9fb6d9';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#eef1f6';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

    raf = requestAnimationFrame(frame);
  }

  function kd(e) {
    if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
      e.preventDefault();
      keys.add(e.key);
    }
  }
  function ku(e) {
    keys.delete(e.key);
  }
  function clearKeys() {
    keys.clear();
  }

  canvas.addEventListener('keydown', kd);
  canvas.addEventListener('keyup', ku);
  canvas.addEventListener('blur', clearKeys);

  let touchId = null;
  function touchToX(clientX) {
    const rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (W / rect.width);
  }
  function onTouchStart(e) {
    e.preventDefault();
    const t = e.changedTouches[0];
    touchId = t.identifier;
    playerX = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, touchToX(t.clientX)));
  }
  function onTouchMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== touchId) continue;
      playerX = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, touchToX(t.clientX)));
    }
  }
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('click', () => canvas.focus());

  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    canvas.removeEventListener('keydown', kd);
    canvas.removeEventListener('keyup', ku);
    canvas.removeEventListener('blur', clearKeys);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
  };
}

async function load() {
  const waitEl = document.getElementById('repo-wait');
  const statusEl = document.getElementById('repo-wait-status');
  const errEl = document.getElementById('repo-error');
  const retryBtn = document.getElementById('repo-retry');
  const indexEl = document.getElementById('repo-index');
  const canvas = document.getElementById('octo-canvas');
  const scoreEl = document.getElementById('octo-score');

  if (retryBtn) retryBtn.classList.add('hidden');
  if (errEl) {
    errEl.classList.add('hidden');
    errEl.textContent = '';
  }
  if (waitEl) waitEl.classList.remove('hidden');
  setControlsEnabled(false);

  stopOctoGame();
  let running = true;
  stopOctoGame = runOctoGame(canvas, scoreEl, () => running);
  if (scoreEl) scoreEl.textContent = '0';

  const result = await fetchReposDesperate(statusEl);

  running = false;
  stopOctoGame();
  stopOctoGame = () => {};

  if (result.ok) {
    allRepos = Array.isArray(result.data) ? result.data.filter(keepRepo) : [];
    setStats(allRepos);
    if (waitEl) waitEl.classList.add('hidden');
    if (indexEl) indexEl.hidden = false;
    setControlsEnabled(true);
    renderPinned(allRepos);
    refresh();
    return;
  }

  setStats([]);
  if (errEl) {
    errEl.textContent = 'GitHub did not answer. Try again, or use the profile link in Contact.';
    errEl.classList.remove('hidden');
  }
  if (retryBtn) retryBtn.classList.remove('hidden');

  running = true;
  stopOctoGame = runOctoGame(canvas, scoreEl, () => running);
}

const filterInput = document.getElementById('repo-filter');
const sortSelect = document.getElementById('repo-sort');
const retryBtn = document.getElementById('repo-retry');

if (filterInput) {
  let t;
  filterInput.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(refresh, 100);
  });
}
if (sortSelect) sortSelect.addEventListener('change', refresh);
if (retryBtn) retryBtn.addEventListener('click', () => load());

load();

/* --- signature shell ------------------------------------------------ */
/* a tiny real CLI wired to live page state. press / to open, esc to
   close. arrows cycle history, tab autocompletes. */

(function initShell() {
  const root = document.getElementById('cli');
  if (!root) return;

  const pill = document.getElementById('cli-open');
  const panel = document.getElementById('cli-panel');
  const out = document.getElementById('cli-out');
  const form = document.getElementById('cli-form');
  const input = document.getElementById('cli-in');
  const closeBtn = document.getElementById('cli-close');

  if (!pill || !panel || !out || !form || !input || !closeBtn) return;

  const history = [];
  let hPos = -1;
  let opened = false;
  let introPrinted = false;

  function scrollOut() {
    out.scrollTop = out.scrollHeight;
  }

  function clearOut() {
    while (out.firstChild) out.removeChild(out.firstChild);
  }

  function makeLine(cls) {
    const p = document.createElement('p');
    p.className = 'cli-line ' + (cls || 'cli-ok');
    return p;
  }

  function printLine(text, cls) {
    const p = makeLine(cls);
    p.textContent = text;
    out.appendChild(p);
    scrollOut();
    return p;
  }

  function printRaw(node, cls) {
    const p = makeLine(cls);
    if (node instanceof Node) p.appendChild(node);
    else if (Array.isArray(node)) {
      node.forEach((n) => {
        if (n instanceof Node) p.appendChild(n);
        else p.appendChild(document.createTextNode(String(n)));
      });
    } else {
      p.textContent = String(node);
    }
    out.appendChild(p);
    scrollOut();
    return p;
  }

  function printBlank() {
    const p = makeLine('cli-muted');
    p.textContent = '\u00a0';
    out.appendChild(p);
    scrollOut();
  }

  function printCmd(text) {
    const p = makeLine('cli-cmd');
    const prompt = document.createElement('span');
    prompt.className = 'cli-prompt-out';
    prompt.textContent = 'guest@rhino:~$';
    p.appendChild(prompt);
    p.appendChild(document.createTextNode(text));
    out.appendChild(p);
    scrollOut();
  }

  function link(href, text) {
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  }

  function span(cls, text) {
    const s = document.createElement('span');
    s.className = cls;
    s.textContent = text;
    return s;
  }

  function padRight(str, n) {
    if (str.length >= n) return str;
    return str + ' '.repeat(n - str.length);
  }

  function open() {
    if (opened) {
      input.focus();
      return;
    }
    opened = true;
    panel.hidden = false;
    root.dataset.state = 'open';
    pill.setAttribute('aria-expanded', 'true');
    if (!introPrinted) {
      printIntro();
      introPrinted = true;
    }
    requestAnimationFrame(() => input.focus());
  }

  function close() {
    if (!opened) return;
    opened = false;
    root.dataset.state = 'collapsed';
    pill.setAttribute('aria-expanded', 'false');
    setTimeout(() => {
      if (!opened) panel.hidden = true;
    }, 240);
    pill.focus();
  }

  function printIntro() {
    const banner = [
      ' ____  _   _ ___ _   _  ___  ',
      '|  _ \\| | | |_ _| \\ | |/ _ \\ ',
      '| |_) | |_| || ||  \\| | | | |',
      '|  _ <|  _  || || |\\  | |_| |',
      '|_| \\_\\_| |_|___|_| \\_|\\___/ ',
    ];
    banner.forEach((row) => printLine(row, 'cli-art'));
    printLine('bots, apis, scrapers, automation, cli. new england.', 'cli-muted');
    printRaw([
      'type ',
      span('k', 'help'),
      '. press ',
      span('k', 'esc'),
      ' to close.',
    ], 'cli-muted');
    printBlank();
  }

  /* --- commands ----------------------------------------------------- */

  const sections = ['work', 'stack', 'featured', 'repos', 'contact'];

  const commands = {
    help() {
      const rows = [
        ['help',            'this list'],
        ['about',           'who i am'],
        ['lab [bot]',       'jump to the live demos'],
        ['stress <rps>',    'push traffic into the pipeline'],
        ['workers <n>',     'resize the worker pool'],
        ['break',           'kill the upstream, watch it recover'],
        ['sim',             'current pipeline numbers'],
        ['stack',           'tools i reach for'],
        ['repos [n]',       'list latest repos (default 6)'],
        ['top',             'top repos by stars'],
        ['open <name>',     'open a repo or live demo'],
        ['nav <section>',   'jump to ' + sections.join(' | ')],
        ['contact',         'how to reach me'],
        ['time',            'clock in new england'],
        ['date',            'full local date'],
        ['whoami',          'who is at this prompt'],
        ['ls',              'sections of this site'],
        ['echo <text>',     'print text back'],
        ['ping',            'pong'],
        ['clear',           'wipe the terminal'],
        ['rhino',           'something fitting'],
      ];
      printLine('available commands:', 'cli-muted');
      rows.forEach(([name, desc]) => {
        printRaw(['  ', span('k', padRight(name, 18)), span('sep', desc)], 'cli-ok');
      });
    },

    about() {
      printLine('1rhino2', 'cli-ok');
      printLine('new england. remote ok.', 'cli-muted');
      printLine('bots, apis, scrapers, automations, cli tools.', 'cli-muted');
      printLine('scope it, build it, hand over notes. still works after the demo.', 'cli-muted');
    },

    stack() {
      const langs = [
        'Python', 'Go', 'TypeScript', 'JavaScript',
        'Rust', 'C', 'C++', 'C#', 'Java', 'Lua', 'D', 'R',
      ];
      printLine('primary lane:', 'cli-muted');
      printLine('  Go, Python, TypeScript', 'cli-ok');
      printLine('also written:', 'cli-muted');
      printLine('  ' + langs.join(', '), 'cli-ok');
    },

    lab(args) {
      if (!window.__lab) {
        printLine('lab did not load. odd. reload?', 'cli-err');
        return;
      }
      const which = (args[0] || 'pipeline').toLowerCase();
      const shown = window.__lab.show(which.startsWith('b') ? 'bot' : 'pipeline');
      printLine('-> lab / ' + shown, 'cli-ok');
    },

    stress(args) {
      if (!window.__lab) return printLine('lab did not load.', 'cli-err');
      const n = parseInt(args[0], 10);
      if (!n) {
        printLine('stress <rps>  -- 1 to 200', 'cli-warn');
        return;
      }
      window.__lab.show('pipeline');
      const v = window.__lab.stress(n);
      printLine('incoming set to ' + v + '/s. watch the queue and p95.', 'cli-ok');
    },

    workers(args) {
      if (!window.__lab) return printLine('lab did not load.', 'cli-err');
      const n = parseInt(args[0], 10);
      if (!n) {
        printLine('workers <n>  -- 1 to 8', 'cli-warn');
        return;
      }
      window.__lab.show('pipeline');
      printLine('worker pool set to ' + window.__lab.workers(n), 'cli-ok');
    },

    break() {
      if (!window.__lab) return printLine('lab did not load.', 'cli-err');
      window.__lab.show('pipeline');
      const s = window.__lab.kill();
      printLine('upstream killed for ' + s + 's. breaker trips, retries back off, then it heals.', 'cli-warn');
    },

    sim() {
      if (!window.__lab) return printLine('lab did not load.', 'cli-err');
      const s = window.__lab.stats();
      const rows = [
        ['incoming', s.rps + '/s'],
        ['workers', String(s.workers)],
        ['queued', String(s.queue)],
        ['done/s', String(s.thru)],
        ['p95', s.p95 + 'ms'],
        ['retried', String(s.retried)],
        ['dropped', String(s.dropped)],
        ['breaker', s.breaker],
      ];
      rows.forEach(([k, v]) => {
        printRaw(['  ', span('k', padRight(k, 10)), span('v', v)], 'cli-ok');
      });
    },

    repos(args) {
      const limit = Math.max(1, Math.min(20, parseInt(args[0], 10) || 6));
      if (!Array.isArray(allRepos) || allRepos.length === 0) {
        printLine('no repos loaded yet. github fetch may still be running.', 'cli-warn');
        return;
      }
      const list = allRepos.slice().sort((a, b) => {
        const ta = new Date(a.pushed_at || a.updated_at || 0).getTime();
        const tb = new Date(b.pushed_at || b.updated_at || 0).getTime();
        return tb - ta;
      }).slice(0, limit);
      printLine('latest ' + list.length + ' originals:', 'cli-muted');
      list.forEach((r) => {
        const stars = '\u2605 ' + (r.stargazers_count || 0);
        printRaw([
          '  ',
          link(r.html_url, r.name),
          '  ',
          span('sep', padRight(stars, 8)),
          span('v', r.description || ''),
        ], 'cli-ok');
      });
    },

    top() {
      if (!Array.isArray(allRepos) || allRepos.length === 0) {
        printLine('no repos loaded yet.', 'cli-warn');
        return;
      }
      const list = allRepos.slice()
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 5);
      printLine('top 5 by stars:', 'cli-muted');
      list.forEach((r) => {
        const stars = '\u2605 ' + (r.stargazers_count || 0);
        printRaw(['  ', span('k', padRight(stars, 6)), link(r.html_url, r.name)], 'cli-ok');
      });
    },

    open(args) {
      const name = (args[0] || '').toLowerCase().trim();
      if (!name) {
        printLine('open <name>  -- repo, demo, or `github`', 'cli-warn');
        return;
      }
      const demoUrl = LIVE_DEMOS[name];
      if (demoUrl) {
        printRaw(['opening ', link(demoUrl, demoUrl.replace(/^https:\/\//, ''))], 'cli-ok');
        window.open(demoUrl, '_blank', 'noopener');
        return;
      }
      if (name === 'github' || name === 'profile') {
        printRaw(['opening ', link('https://github.com/1rhino2', 'github.com/1rhino2')], 'cli-ok');
        window.open('https://github.com/1rhino2', '_blank', 'noopener');
        return;
      }
      const r = (allRepos || []).find((x) => x.name.toLowerCase() === name)
        || (allRepos || []).find((x) => x.name.toLowerCase().includes(name));
      if (!r) {
        printLine('no repo matched `' + (args[0] || '') + '`. try `repos` first.', 'cli-err');
        return;
      }
      printRaw(['opening ', link(r.html_url, r.name)], 'cli-ok');
      window.open(r.html_url, '_blank', 'noopener');
    },

    nav(args) {
      const target = (args[0] || '').toLowerCase().trim();
      if (!target) {
        printLine('nav <section>  -- ' + sections.join(' | '), 'cli-warn');
        return;
      }
      if (sections.indexOf(target) === -1) {
        printLine('unknown section. try: ' + sections.join(', '), 'cli-err');
        return;
      }
      const el = document.getElementById(target);
      if (!el) {
        printLine('section element missing.', 'cli-err');
        return;
      }
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      printLine('-> ' + target, 'cli-ok');
    },

    contact() {
      printRaw(['discord  ', span('v', '1rhino2')], 'cli-ok');
      printRaw(['github   ', link('https://github.com/1rhino2', 'github.com/1rhino2')], 'cli-ok');
      printRaw(['payment  ', span('sep', 'cash app after we lock scope. cashtag in dms only')], 'cli-ok');
    },

    time() {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
          weekday: 'short',
        });
        printLine(fmt.format(new Date()) + '  (New England / ET)', 'cli-ok');
      } catch (_e) {
        printLine(new Date().toLocaleTimeString(), 'cli-ok');
      }
    },

    date() {
      try {
        const fmt = new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'America/New_York',
        });
        printLine(fmt.format(new Date()) + '  (ET)', 'cli-ok');
      } catch (_e) {
        printLine(new Date().toDateString(), 'cli-ok');
      }
    },

    whoami() {
      printLine('guest@rhino.field -- dm discord if you got work.', 'cli-ok');
    },

    ls() {
      printLine(sections.join('  '), 'cli-ok');
    },

    echo(args, raw) {
      printLine(raw.slice(5).trim() || '', 'cli-ok');
    },

    ping() {
      printLine('pong', 'cli-ok');
    },

    clear() {
      clearOut();
    },

    rhino() {
      const art = [
        '                  ___',
        '              ,-~~   ~~-.',
        '          ,-~`             `~-.',
        '   /\\___,-~`                    \\',
        '  /  o  o                         \\',
        ' |     >                          |',
        '  \\__/  \\__         _.--.        /',
        '         /  ~~--~~~`     \\______/',
        '         |                       ||',
        '         ||                      ||',
      ];
      art.forEach((row) => printLine(row, 'cli-art'));
      printLine('stay sharp.', 'cli-muted');
    },

    sudo() {
      printLine('permission denied: you are guest. nice try.', 'cli-err');
    },

    exit() {
      printLine('bye.', 'cli-muted');
      setTimeout(close, 250);
    },
  };

  commands.man = commands.help;
  commands.quit = commands.exit;
  commands.cls = commands.clear;

  function run(raw) {
    const trimmed = raw.trim();
    if (!trimmed) {
      printCmd('');
      return;
    }
    printCmd(trimmed);
    history.push(trimmed);
    if (history.length > 80) history.shift();
    hPos = -1;

    const parts = trimmed.split(/\s+/);
    const name = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fn = commands[name];

    if (!fn) {
      printLine('unknown command: ' + name + '. type `help`.', 'cli-err');
      return;
    }

    try {
      fn(args, trimmed);
    } catch (err) {
      printLine('error: ' + (err && err.message ? err.message : 'failed'), 'cli-err');
    }
  }

  pill.addEventListener('click', open);
  closeBtn.addEventListener('click', close);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    input.value = '';
    run(val);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      if (history.length === 0) return;
      e.preventDefault();
      hPos = hPos < 0 ? history.length - 1 : Math.max(0, hPos - 1);
      input.value = history[hPos] || '';
      requestAnimationFrame(() => {
        input.setSelectionRange(input.value.length, input.value.length);
      });
    } else if (e.key === 'ArrowDown') {
      if (hPos < 0) return;
      e.preventDefault();
      hPos = hPos + 1;
      if (hPos >= history.length) {
        hPos = -1;
        input.value = '';
      } else {
        input.value = history[hPos];
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = input.value;
      const space = v.indexOf(' ');
      const stub = (space >= 0 ? v.slice(0, space) : v).toLowerCase();
      if (!stub) return;
      const matches = Object.keys(commands).filter((c) => c.startsWith(stub));
      if (matches.length === 1) {
        input.value = matches[0] + (space >= 0 ? v.slice(space) : ' ');
        input.setSelectionRange(input.value.length, input.value.length);
      } else if (matches.length > 1) {
        printLine(matches.join('  '), 'cli-muted');
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      clearOut();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented) return;
    // cmd/ctrl+k works from anywhere, including inside the filter box
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      open();
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Escape' && opened) {
      e.preventDefault();
      close();
      return;
    }
    const t = e.target;
    const inField = t && (
      t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable
    );
    if (inField) return;
    if (e.key === '/') {
      e.preventDefault();
      open();
    }
  });

  panel.addEventListener('click', () => {
    if (opened) input.focus();
  });
})();
