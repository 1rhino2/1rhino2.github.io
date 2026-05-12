document.getElementById('y').textContent = String(new Date().getFullYear());

const OWNER = '1rhino2';
const EXCLUDED = new Set(['RhinoWAFNoah']);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const RAIL = {
  TypeScript: '#3178c6',
  Go: '#00add8',
  Python: '#3572a5',
  JavaScript: '#f1e05a',
  HTML: '#e34c26',
  C: '#8b8b8b',
  'C++': '#f34b7d',
  'C#': '#178600',
  Rust: '#dea584',
  Java: '#b07219',
  Lua: '#000080',
  D: '#ba595e',
  Ruby: '#701516',
  Shell: '#89e051',
};

function railColor(lang) {
  if (!lang) return '#5c5349';
  return RAIL[lang] || '#8b8278';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(n) {
  return Math.floor(Math.random() * n);
}

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

function keepRepo(r) {
  return (
    r &&
    r.owner &&
    r.owner.login === OWNER &&
    !r.fork &&
    !EXCLUDED.has(r.name)
  );
}

function sortRepos(list, mode) {
  const out = [...list];
  if (mode === 'stars') {
    out.sort((a, b) => b.stargazers_count - a.stargazers_count || a.name.localeCompare(b.name));
  } else if (mode === 'updated') {
    out.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  } else {
    out.sort((a, b) => a.name.localeCompare(b.name));
  }
  return out;
}

function filterRepos(list, q) {
  const t = q.trim().toLowerCase();
  if (!t) return list;
  return list.filter((r) => {
    const d = (r.description || '').toLowerCase();
    return r.name.toLowerCase().includes(t) || d.includes(t);
  });
}

function setStats(count) {
  const n = document.getElementById('stat-repos');
  const note = document.getElementById('stat-note');
  if (note) note.textContent = '';
  if (!n) return;
  if (reduceMotion || !count) {
    n.textContent = count ? String(count) : '—';
    return;
  }
  animateCount(n, count);
}

function animateCount(el, target) {
  const from = 0;
  const dur = 900;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - (1 - t) * (1 - t) * (1 - t);
    el.textContent = String(Math.round(from + (target - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function runOctoGame(canvas, scoreEl, isRunning) {
  if (!canvas || !canvas.getContext) {
    return () => {};
  }
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  let playerX = W / 2;
  const pw = 52;
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
    });
  }

  function frame(now) {
    if (!isRunning()) {
      return;
    }
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

    ctx.fillStyle = '#0a0908';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1f1c18';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 34) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
      ctx.stroke();
    }

    for (const it of items) {
      if (it.type === 'star') {
        ctx.fillStyle = '#e6a21a';
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#b84444';
        ctx.fillRect(it.x - it.r, it.y - it.r, it.r * 2, it.r * 2);
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.strokeRect(it.x - it.r + 0.5, it.y - it.r + 0.5, it.r * 2 - 1, it.r * 2 - 1);
      }
    }

    ctx.fillStyle = '#e6a21a';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = '#f5d080';
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

  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  let touchId = null;
  function touchToX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scale = W / rect.width;
    return (clientX - rect.left) * scale;
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
    window.removeEventListener('keydown', kd);
    window.removeEventListener('keyup', ku);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
  };
}

async function fetchReposDesperate(statusEl) {
  const url = `https://api.github.com/users/${OWNER}/repos?per_page=100&sort=updated`;
  const maxAttempts = 16;
  let lastErr = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (statusEl) {
      statusEl.textContent = `GitHub is stalling… attempt ${attempt} of ${maxAttempts}. Keep playing.`;
    }
    try {
      const res = await fetch(url);
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
    statusEl.textContent =
      'No luck after ' + maxAttempts + ' tries. Hit retry or open GitHub in Contact.';
  }
  return { ok: false, error: lastErr };
}

function renderRepos(repos) {
  const grid = document.getElementById('repo-grid');
  const empty = document.getElementById('repo-empty');
  if (!grid) return;
  grid.innerHTML = '';

  if (!repos.length) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  for (let i = 0; i < repos.length; i++) {
    const r = repos[i];
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.className = 'repo-tile';
    a.href = r.html_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.setProperty('--rail', railColor(r.language));
    if (!reduceMotion) a.style.setProperty('--stagger', String(Math.min(i, 14)));

    const top = document.createElement('div');
    top.className = 'repo-top';
    const name = document.createElement('span');
    name.className = 'repo-name';
    name.textContent = r.name;
    const stars = document.createElement('span');
    stars.className = 'repo-stars';
    stars.textContent = r.stargazers_count ? `${r.stargazers_count} ★` : '';
    top.appendChild(name);
    top.appendChild(stars);

    const desc = document.createElement('p');
    desc.className = 'repo-desc';
    desc.textContent = r.description || 'No description.';

    const topics = Array.isArray(r.topics) ? r.topics.slice(0, 2) : [];
    let tagsEl = null;
    if (topics.length) {
      tagsEl = document.createElement('div');
      tagsEl.className = 'repo-tags';
      for (const topic of topics) {
        const tag = document.createElement('span');
        tag.className = 'repo-tag';
        tag.textContent = topic;
        tagsEl.appendChild(tag);
      }
    }

    const meta = document.createElement('div');
    meta.className = 'repo-meta';
    const bits = [r.language || 'misc'];
    if (r.archived) bits.push('archived');
    meta.textContent = bits.join(' · ');

    a.appendChild(top);
    a.appendChild(desc);
    if (tagsEl) a.appendChild(tagsEl);
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
  const mode = sortEl ? sortEl.value : 'stars';
  const q = filterEl ? filterEl.value : '';
  let list = sortRepos(allRepos, mode);
  list = filterRepos(list, q);
  renderRepos(list);
}

function setToolbarLocked(locked) {
  const toolbar = document.getElementById('repo-toolbar');
  const filterEl = document.getElementById('repo-filter');
  const sortEl = document.getElementById('repo-sort');
  if (toolbar) toolbar.classList.toggle('is-locked', locked);
  if (filterEl) filterEl.disabled = locked;
  if (sortEl) sortEl.disabled = locked;
}

async function load() {
  const waitEl = document.getElementById('repo-wait');
  const statusEl = document.getElementById('repo-wait-status');
  const errEl = document.getElementById('repo-error');
  const retryBtn = document.getElementById('repo-retry');
  const canvas = document.getElementById('octo-canvas');
  const scoreEl = document.getElementById('octo-score');

  if (retryBtn) retryBtn.classList.add('hidden');
  if (errEl) {
    errEl.classList.add('hidden');
    errEl.textContent = '';
  }
  if (waitEl) waitEl.classList.remove('hidden');
  setToolbarLocked(true);

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
    setStats(allRepos.length);
    if (waitEl) waitEl.classList.add('hidden');
    setToolbarLocked(false);
    refresh();
    return;
  }

  setStats(0);
  if (errEl) {
    errEl.textContent =
      'GitHub never answered. Profile link is in Contact. Or hammer retry.';
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

if (!reduceMotion) {
  const els = document.querySelectorAll('[data-reveal]');
  if (els.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    els.forEach((el) => io.observe(el));
  }
} else {
  document.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
}
