/* 1rhino2.github.io - site behavior */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

document.getElementById('y').textContent = String(new Date().getFullYear());

/* --- boot overlay --------------------------------------------------- */

window.addEventListener('load', () => {
  // small delay lets type and canvas settle before peeling overlay off
  setTimeout(() => {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
  }, reduceMotion ? 50 : 650);
});

/* --- local clock for hero meta ------------------------------------- */

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

/* --- mobile nav toggle --------------------------------------------- */

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

/* --- scroll progress bar ------------------------------------------- */

const progressEl = document.getElementById('progress');
let progRaf = 0;

function setProgress() {
  if (!progressEl) return;
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  const pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
  progressEl.style.setProperty('--prog', pct.toFixed(2) + '%');
  progRaf = 0;
}

function onScrollProgress() {
  if (progRaf) return;
  progRaf = requestAnimationFrame(setProgress);
}

window.addEventListener('scroll', onScrollProgress, { passive: true });
window.addEventListener('resize', onScrollProgress, { passive: true });
setProgress();

/* --- active section in nav ----------------------------------------- */

const navLinks = Array.from(document.querySelectorAll('.nav a[data-link]'));
const sectionIds = navLinks.map((a) => a.getAttribute('data-link')).filter(Boolean);
const sectionEls = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

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

/* --- generic reveal observer --------------------------------------- */

if (!reduceMotion && 'IntersectionObserver' in window) {
  const reveal = (sel) => document.querySelectorAll(sel);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          if (e.target.classList.contains('block')) {
            e.target.classList.add('in-view');
          }
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  reveal('[data-reveal], [data-reveal-stagger], [data-split-text], .block').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('[data-reveal], [data-reveal-stagger], [data-split-text], .block').forEach((el) => {
    el.classList.add('is-visible');
    el.classList.add('in-view');
  });
}

/* --- custom cursor (PC only) --------------------------------------- */

if (finePointer && !reduceMotion) {
  const dot = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');

  if (dot && ring) {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let dotX = targetX;
    let dotY = targetY;
    let ringX = targetX;
    let ringY = targetY;
    let raf = 0;

    function loop() {
      // dot tracks instantly, ring trails for that high-quality feel
      dotX += (targetX - dotX) * 0.5;
      dotY += (targetY - dotY) * 0.5;
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    }

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!document.body.classList.contains('cursor-active')) {
        document.body.classList.add('cursor-active');
        dotX = targetX;
        dotY = targetY;
        ringX = targetX;
        ringY = targetY;
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-active');
    });

    // hover state on interactive elements
    const hotSelector = 'a, button, input, select, textarea, [data-magnetic], [data-tilt], .repo-tile, .work-card, .stack-row span, .menu-btn';
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest(hotSelector);
      if (t) document.body.classList.add('cursor-hot');
    });
    document.addEventListener('mouseout', (e) => {
      const t = e.target.closest(hotSelector);
      if (t && !e.relatedTarget?.closest?.(hotSelector)) {
        document.body.classList.remove('cursor-hot');
      }
    });

    document.addEventListener('mousedown', () => document.body.classList.add('cursor-grab'));
    document.addEventListener('mouseup', () => document.body.classList.remove('cursor-grab'));
  }
}

/* --- magnetic buttons ---------------------------------------------- */

if (finePointer && !reduceMotion) {
  const magnets = document.querySelectorAll('[data-magnetic]');
  magnets.forEach((el) => {
    const strength = Number(el.getAttribute('data-magnetic-strength') || 18);
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    function tick() {
      cx += (tx - cx) * 0.25;
      cy += (ty - cy) * 0.25;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = 0;
      }
    }

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      tx = (mx / r.width) * strength;
      ty = (my / r.height) * strength;
      if (!raf) raf = requestAnimationFrame(tick);
    });

    el.addEventListener('mouseleave', () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  });
}

/* --- tilt on selected cards ---------------------------------------- */

if (finePointer && !reduceMotion) {
  const tilts = document.querySelectorAll('[data-tilt]');
  tilts.forEach((el) => {
    let raf = 0;
    let rx = 0;
    let ry = 0;
    let trx = 0;
    let tryy = 0;

    function frame() {
      rx += (trx - rx) * 0.18;
      ry += (tryy - ry) * 0.18;
      const transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
      el.style.transform = transform;
      if (Math.abs(trx - rx) > 0.05 || Math.abs(tryy - ry) > 0.05) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    }

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      // tilt range stays gentle on purpose
      tryy = (px - 0.5) * 7;
      trx = (0.5 - py) * 7;
      if (!raf) raf = requestAnimationFrame(frame);
    });

    el.addEventListener('mouseleave', () => {
      trx = 0;
      tryy = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    });
  });
}

/* --- hero canvas: drifting constellation --------------------------- */

function startHeroCanvas() {
  if (reduceMotion) return;
  const canvas = document.getElementById('hero-bg');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let points = [];
  let mouseX = -9999;
  let mouseY = -9999;
  let raf = 0;
  let running = true;
  let lastT = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.floor(W * dpr));
    canvas.height = Math.max(1, Math.floor(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    // density scaled by area so phones stay light
    const target = Math.min(110, Math.max(32, Math.round((W * H) / 18000)));
    points = [];
    for (let i = 0; i < target; i++) {
      points.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.4 + 0.5,
      });
    }
  }

  function step(now) {
    if (!running) return;
    const dt = Math.min(40, now - lastT);
    lastT = now;
    ctx.clearRect(0, 0, W, H);

    const linkDist = 130;
    const linkDistSq = linkDist * linkDist;
    const pullDist = 160;
    const pullDistSq = pullDist * pullDist;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      // slight pull toward cursor for a quiet alive feel
      const dx = mouseX - p.x;
      const dy = mouseY - p.y;
      const dsq = dx * dx + dy * dy;
      if (dsq < pullDistSq) {
        const f = (1 - dsq / pullDistSq) * 0.04;
        p.vx += (dx / Math.sqrt(dsq + 0.01)) * f;
        p.vy += (dy / Math.sqrt(dsq + 0.01)) * f;
      }
      // small damping keeps velocities sane
      p.vx *= 0.992;
      p.vy *= 0.992;
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);

      if (p.x < -20) p.x = W + 20;
      else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      else if (p.y > H + 20) p.y = -20;

      // dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(226, 168, 47, 0.55)';
      ctx.fill();
    }

    // links between near points and to cursor
    ctx.lineWidth = 1;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      for (let j = i + 1; j < points.length; j++) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dsq = dx * dx + dy * dy;
        if (dsq < linkDistSq) {
          const op = 1 - dsq / linkDistSq;
          ctx.strokeStyle = `rgba(226, 168, 47, ${(op * 0.22).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      // cursor line
      const cdx = a.x - mouseX;
      const cdy = a.y - mouseY;
      const cdsq = cdx * cdx + cdy * cdy;
      if (cdsq < pullDistSq) {
        const op = 1 - cdsq / pullDistSq;
        ctx.strokeStyle = `rgba(240, 192, 89, ${(op * 0.35).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.stroke();
      }
    }

    raf = requestAnimationFrame(step);
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  }

  function onLeave() {
    mouseX = -9999;
    mouseY = -9999;
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('mouseout', onLeave);
  window.addEventListener('resize', resize, { passive: true });

  // pause when offscreen for battery
  const visObserver = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        running = e.isIntersecting;
        if (running) {
          lastT = performance.now();
          raf = requestAnimationFrame(step);
        }
      }
    },
    { threshold: 0 }
  );
  visObserver.observe(canvas);

  resize();
  raf = requestAnimationFrame(step);
}

startHeroCanvas();

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
  CSS: '#563d7c',
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
    const topics = (r.topics || []).join(' ').toLowerCase();
    return r.name.toLowerCase().includes(t) || d.includes(t) || topics.includes(t);
  });
}

function setStats(count) {
  const n = document.getElementById('stat-repos');
  const note = document.getElementById('stat-note');
  if (!n) return;
  if (reduceMotion || !count) {
    n.textContent = count ? String(count) : '--';
  } else {
    animateCount(n, count);
  }
  if (note && count) note.textContent = 'Live from the GitHub API.';
}

function animateCount(el, target) {
  const dur = 1100;
  const start = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
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
    statusEl.textContent = 'GitHub took too long. Tap retry or use the profile link below.';
  }
  return { ok: false, error: lastErr };
}

function formatPushed(iso) {
  if (!iso) return '';
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.round(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
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
    if (r.stargazers_count) {
      const starGlyph = document.createElement('span');
      starGlyph.textContent = '\u2605';
      starGlyph.setAttribute('aria-hidden', 'true');
      stars.appendChild(starGlyph);
      const starN = document.createTextNode(' ' + r.stargazers_count);
      stars.appendChild(starN);
    }
    top.appendChild(name);
    top.appendChild(stars);

    const desc = document.createElement('p');
    desc.className = 'repo-desc';
    desc.textContent = r.description || 'No description.';

    const topics = Array.isArray(r.topics) ? r.topics.slice(0, 3) : [];
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
    const dot = document.createElement('span');
    dot.className = 'dot';
    meta.appendChild(dot);
    const bits = [r.language || 'misc'];
    const ago = formatPushed(r.pushed_at);
    if (ago) bits.push(ago);
    if (r.archived) bits.push('archived');
    const metaText = document.createElement('span');
    metaText.textContent = bits.join(' \u00b7 ');
    meta.appendChild(metaText);

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

    ctx.fillStyle = '#060509';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#1a1714';
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
        ctx.fillStyle = '#e6a21a';
        ctx.beginPath();
        ctx.arc(0, 0, it.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#b84444';
        ctx.fillRect(-it.r, -it.r, it.r * 2, it.r * 2);
        ctx.strokeStyle = '#ff6666';
        ctx.lineWidth = 1;
        ctx.strokeRect(-it.r + 0.5, -it.r + 0.5, it.r * 2 - 1, it.r * 2 - 1);
      }
      ctx.restore();
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
  function clearKeys() {
    keys.clear();
  }

  canvas.addEventListener('keydown', kd);
  canvas.addEventListener('keyup', ku);
  canvas.addEventListener('blur', clearKeys);

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
    errEl.textContent = 'GitHub did not answer. Try again or use the profile link in Contact.';
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

/* --- signature shell ---------------------------------------------- */
/* a tiny real CLI that responds to commands tied to live page state.
   press / anywhere to open, esc to close. arrow keys cycle history,
   tab autocompletes commands. */

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
    printLine('backend, bots, apis, scrapers, automation, cli tools.', 'cli-muted');
    printRaw([
      'type ',
      span('k', 'help'),
      ' for commands. press ',
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
        printRaw([
          '  ',
          span('k', padRight(name, 18)),
          span('sep', desc),
        ], 'cli-ok');
      });
    },

    about() {
      printLine('rhino / 1rhino2', 'cli-ok');
      printLine('backend engineer. new england, available remote.', 'cli-muted');
      printLine('builds bots, apis, scrapers, automations, and cli tools.', 'cli-muted');
      printLine('plain contracts, useful logs, small services. ships and stays up.', 'cli-muted');
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
        printRaw([
          '  ',
          span('k', padRight(stars, 6)),
          link(r.html_url, r.name),
        ], 'cli-ok');
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
        printRaw([
          'opening ',
          link('https://github.com/1rhino2', 'github.com/1rhino2'),
        ], 'cli-ok');
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
      printRaw(['payment  ', span('sep', 'cash app once scope and price are locked')], 'cli-ok');
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
      printLine('guest@rhino.field -- bring the messy job.', 'cli-ok');
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

  /* --- runner ------------------------------------------------------- */

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

  /* --- bindings ----------------------------------------------------- */

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
