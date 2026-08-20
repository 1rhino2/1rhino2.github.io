/* the lab: two live demos.
   1. pipeline - the shape of basically every scraper/bot i ship.
      token bucket -> queue -> worker pool -> retry w/ backoff, circuit breaker.
      the algorithms are the real ones, not an animation pretending.
   2. bot - a discord bot you can actually type at.
   no deps, no build step. runs at 60fps or it does not ship. */

(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (id) => document.getElementById(id);

  /* ---------------------------------------------------------------- */
  /* pipeline sim                                                      */
  /* ---------------------------------------------------------------- */

  const canvas = $('sim-canvas');
  const spark = $('sim-spark');
  if (!canvas || !canvas.getContext) return;

  const ctx = canvas.getContext('2d');
  const sctx = spark ? spark.getContext('2d') : null;

  // pull the palette out of css so there is one source of truth
  const css = getComputedStyle(document.documentElement);
  const C = {
    ink: css.getPropertyValue('--ink').trim() || '#eef1f6',
    dim: css.getPropertyValue('--dim').trim() || '#6e7787',
    line: css.getPropertyValue('--line-2').trim() || '#2e3846',
    accent: css.getPropertyValue('--accent').trim() || '#9fb6d9',
    mauve: css.getPropertyValue('--mauve').trim() || '#b6a6c9',
    ok: css.getPropertyValue('--ok').trim() || '#8fb894',
    warn: css.getPropertyValue('--warn').trim() || '#c4ae7c',
    rose: css.getPropertyValue('--rose').trim() || '#c4838c',
    panel: css.getPropertyValue('--panel').trim() || '#151a22',
  };

  const CAP_QUEUE = 120;      // backpressure. real queues are bounded too
  const BUCKET_CAP = 20;      // burst
  const BUCKET_REFILL = 60;   // sustained rps the limiter allows
  const SERVICE_MIN = 0.12;   // seconds
  const SERVICE_MAX = 0.26;
  const MAX_ATTEMPTS = 3;
  const BACKOFF_BASE = 0.15;
  const BACKOFF_CAP = 2.0;
  const BREAKER_WINDOW = 20;
  const BREAKER_TRIP = 0.5;
  const BREAKER_COOLDOWN = 3.0;
  const KILL_SECONDS = 7;

  const cfg = { rps: 20, fail: 5, workers: 4, down: false };

  const sim = {
    t: 0,
    tokens: BUCKET_CAP,
    spawnAcc: 0,
    queue: [],
    retry: [],
    workers: [],
    ents: [],
    outcomes: [],           // rolling win of true/false for the breaker
    breaker: 'closed',
    openUntil: 0,
    probing: false,
    lat: [],                // last N latencies, seconds
    doneStamps: [],         // completion timestamps for throughput
    retried: 0,
    dropped: 0,
    killUntil: 0,
    spark: [],
  };

  let nextId = 1;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function setWorkerCount(n) {
    while (sim.workers.length < n) sim.workers.push({ job: null, left: 0, total: 1 });
    while (sim.workers.length > n) {
      const w = sim.workers.pop();
      // do not vanish a job mid flight, put it back at the front
      if (w && w.job) sim.queue.unshift(w.job);
    }
  }
  setWorkerCount(cfg.workers);

  function spawn() {
    const e = {
      id: nextId++,
      born: sim.t,
      attempts: 0,
      state: 'in',
      x: 0, y: 0, tx: 0, ty: 0,
      wait: 0,
      life: 0,
      placed: false,
    };
    sim.ents.push(e);
    return e;
  }

  function kill(e, why) {
    e.state = 'gone';
    e.why = why;
    e.life = 0.45;
    sim.dropped++;
  }

  function finish(e) {
    e.state = 'out';
    e.life = 0.5;
    sim.lat.push(sim.t - e.born);
    if (sim.lat.length > 120) sim.lat.shift();
    sim.doneStamps.push(sim.t);
  }

  function recordOutcome(good) {
    sim.outcomes.push(good);
    if (sim.outcomes.length > BREAKER_WINDOW) sim.outcomes.shift();
    if (sim.breaker === 'half') {
      // one probe decides it
      if (good) {
        sim.breaker = 'closed';
        sim.outcomes.length = 0;
      } else {
        sim.breaker = 'open';
        sim.openUntil = sim.t + BREAKER_COOLDOWN;
      }
      sim.probing = false;
      return;
    }
    if (sim.breaker === 'closed' && sim.outcomes.length >= 8) {
      const bad = sim.outcomes.filter((o) => !o).length / sim.outcomes.length;
      if (bad > BREAKER_TRIP) {
        sim.breaker = 'open';
        sim.openUntil = sim.t + BREAKER_COOLDOWN;
      }
    }
  }

  const DT = 1 / 60;

  function step() {
    sim.t += DT;

    if (sim.killUntil && sim.t >= sim.killUntil) {
      cfg.down = false;
      sim.killUntil = 0;
      syncKillBtn();
    }

    // token bucket refill
    sim.tokens = Math.min(BUCKET_CAP, sim.tokens + BUCKET_REFILL * DT);

    // breaker cooldown -> half open, let a single probe through
    if (sim.breaker === 'open' && sim.t >= sim.openUntil) {
      sim.breaker = 'half';
      sim.probing = false;
    }

    // arrivals
    sim.spawnAcc += cfg.rps * DT;
    while (sim.spawnAcc >= 1) {
      sim.spawnAcc -= 1;
      const e = spawn();
      if (sim.breaker === 'open') {
        kill(e, 'breaker');           // fail fast, do not touch a dead upstream
      } else if (sim.tokens >= 1) {
        sim.tokens -= 1;
        if (sim.queue.length >= CAP_QUEUE) {
          kill(e, 'full');            // bounded queue, shed load
        } else {
          e.state = 'queued';
          sim.queue.push(e);
        }
      } else {
        kill(e, '429');
      }
    }

    // retry timers
    for (let i = sim.retry.length - 1; i >= 0; i--) {
      const e = sim.retry[i];
      e.wait -= DT;
      if (e.wait <= 0) {
        sim.retry.splice(i, 1);
        if (sim.queue.length >= CAP_QUEUE) {
          kill(e, 'full');
        } else {
          e.state = 'queued';
          sim.queue.push(e);
        }
      }
    }

    // workers pull work
    for (const w of sim.workers) {
      if (w.job) continue;
      if (!sim.queue.length) continue;
      if (sim.breaker === 'half') {
        if (sim.probing) continue;    // only one probe in flight
        sim.probing = true;
      }
      const e = sim.queue.shift();
      e.state = 'work';
      w.job = e;
      w.total = rand(SERVICE_MIN, SERVICE_MAX);
      w.left = w.total;
    }

    // service
    for (const w of sim.workers) {
      if (!w.job) continue;
      w.left -= DT;
      if (w.left > 0) continue;
      const e = w.job;
      w.job = null;
      const failed = cfg.down || Math.random() < cfg.fail / 100;
      recordOutcome(!failed);
      if (!failed) {
        finish(e);
        continue;
      }
      e.attempts++;
      if (e.attempts >= MAX_ATTEMPTS) {
        kill(e, 'gave up');
        continue;
      }
      // exponential backoff, full jitter
      const ceiling = Math.min(BACKOFF_CAP, BACKOFF_BASE * Math.pow(2, e.attempts));
      e.wait = Math.random() * ceiling;
      e.waitTotal = e.wait || 0.001;
      e.state = 'retry';
      sim.retry.push(e);
      sim.retried++;
    }

    // trim throughput window
    const cutoff = sim.t - 1;
    while (sim.doneStamps.length && sim.doneStamps[0] < cutoff) sim.doneStamps.shift();

    // age out finished/dropped visuals
    for (let i = sim.ents.length - 1; i >= 0; i--) {
      const e = sim.ents[i];
      if (e.state === 'out' || e.state === 'gone') {
        e.life -= DT;
        if (e.life <= 0) sim.ents.splice(i, 1);
      }
    }
  }

  /* ---- layout + drawing ------------------------------------------- */

  let W = 0, H = 0, dpr = 1;
  let L = null;

  function layout() {
    const tight = W < 640;
    const padX = tight ? 8 : 16;
    const top = tight ? 26 : 30;
    const laneH = tight ? 96 : 118;
    const cols = 5;
    const gap = tight ? 6 : 14;
    const boxW = (W - padX * 2 - gap * (cols - 1)) / cols;
    const x = (i) => padX + i * (boxW + gap);
    L = {
      tight,
      boxW,
      top,
      laneH,
      inBox: { x: x(0), y: top, w: boxW, h: laneH },
      limBox: { x: x(1), y: top, w: boxW, h: laneH },
      qBox: { x: x(2), y: top, w: boxW, h: laneH },
      wBox: { x: x(3), y: top, w: boxW, h: laneH },
      outBox: { x: x(4), y: top, w: boxW, h: laneH },
      retryBox: { x: x(2), y: top + laneH + (tight ? 22 : 30), w: boxW * 2 + gap, h: tight ? 40 : 46 },
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(300, rect.width);
    H = Math.max(190, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
    // resizing wipes the bitmap, so repaint if the loop is not going to
    if (!running && L) {
      targets();
      draw();
    }
  }

  function slotFor(e, idx) {
    const b = L.qBox;
    const perCol = Math.max(3, Math.floor((b.h - 18) / 9));
    const col = Math.floor(idx / perCol);
    const row = idx % perCol;
    return { x: b.x + 8 + col * 8, y: b.y + b.h - 10 - row * 9 };
  }

  function targets() {
    // queue stacks bottom up, oldest at the bottom
    for (let i = 0; i < sim.queue.length; i++) {
      const e = sim.queue[i];
      const p = slotFor(e, i);
      e.tx = p.x;
      e.ty = p.y;
    }
    const b = L.wBox;
    const n = sim.workers.length;
    const slotH = (b.h - 16) / Math.max(n, 1);
    for (let i = 0; i < n; i++) {
      const w = sim.workers[i];
      if (!w.job) continue;
      w.job.tx = b.x + b.w / 2;
      w.job.ty = b.y + 10 + slotH * i + slotH / 2;
    }
    for (let i = 0; i < sim.retry.length; i++) {
      const e = sim.retry[i];
      const rb = L.retryBox;
      e.tx = rb.x + 10 + (i % 28) * 9;
      e.ty = rb.y + 14 + Math.floor(i / 28) * 9;
    }
    for (const e of sim.ents) {
      if (e.state === 'in') {
        e.tx = L.limBox.x + L.limBox.w / 2;
        e.ty = L.limBox.y + L.limBox.h / 2;
      } else if (e.state === 'out') {
        e.tx = L.outBox.x + L.outBox.w / 2 + rand(-10, 10);
        e.ty = L.outBox.y + L.outBox.h / 2;
      } else if (e.state === 'gone') {
        e.ty = e.y + 3;
      }
      if (!e.placed) {
        // enter from the left edge so arrivals read as traffic
        e.x = L.inBox.x + 6;
        e.y = L.inBox.y + rand(12, L.inBox.h - 12);
        e.placed = true;
      }
    }
  }

  function box(b, label, sub) {
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5, Math.round(b.w), Math.round(b.h));
    ctx.fillStyle = C.dim;
    ctx.font = '600 9px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(label.toUpperCase(), b.x + 1, b.y - 8);
    if (sub && !L.tight) {
      ctx.fillStyle = C.line;
      ctx.fillText(sub, b.x + 1, b.y + b.h + 12);
    }
  }

  function link(a, b) {
    const y = a.y + a.h / 2;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a.x + a.w, y);
    ctx.lineTo(b.x, y);
    ctx.stroke();
  }

  function dot(e) {
    let col = C.accent;
    let a = 1;
    if (e.state === 'retry') col = C.warn;
    else if (e.state === 'out') { col = C.ok; a = Math.max(0, e.life / 0.5); }
    else if (e.state === 'gone') { col = C.rose; a = Math.max(0, e.life / 0.45); }
    else if (e.state === 'work') col = C.mauve;
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(e.x) - 2, Math.round(e.y) - 2, 5, 5);
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    link(L.inBox, L.limBox);
    link(L.limBox, L.qBox);
    link(L.qBox, L.wBox);
    link(L.wBox, L.outBox);

    box(L.inBox, 'in', cfg.rps + '/s');
    box(L.limBox, 'limit', L.tight ? '' : BUCKET_REFILL + '/s burst ' + BUCKET_CAP);
    box(L.qBox, 'queue', sim.queue.length + '/' + CAP_QUEUE);
    box(L.wBox, 'workers', sim.workers.length + ' slots');
    box(L.outBox, 'done', '');
    box(L.retryBox, 'retry, backoff + jitter', '');

    // token bucket gauge
    const lb = L.limBox;
    const gh = lb.h - 20;
    const lvl = (sim.tokens / BUCKET_CAP) * gh;
    ctx.fillStyle = C.line;
    ctx.fillRect(lb.x + lb.w - 12, lb.y + 10, 5, gh);
    ctx.fillStyle = sim.tokens < 1 ? C.rose : C.accent;
    ctx.fillRect(lb.x + lb.w - 12, lb.y + 10 + (gh - lvl), 5, lvl);

    // worker slots + progress
    const wb = L.wBox;
    const n = sim.workers.length;
    const slotH = (wb.h - 16) / Math.max(n, 1);
    for (let i = 0; i < n; i++) {
      const w = sim.workers[i];
      const y = wb.y + 10 + slotH * i + slotH / 2;
      ctx.strokeStyle = C.line;
      ctx.strokeRect(wb.x + 6.5, Math.round(y - slotH / 2 + 2) + 0.5, wb.w - 13, Math.max(6, slotH - 5));
      if (w.job) {
        const p = 1 - w.left / w.total;
        ctx.fillStyle = C.mauve;
        ctx.globalAlpha = 0.28;
        ctx.fillRect(wb.x + 7, y - slotH / 2 + 3, (wb.w - 14) * p, Math.max(5, slotH - 6));
        ctx.globalAlpha = 1;
      }
    }

    // retry countdown bars
    for (const e of sim.retry) {
      const p = Math.max(0, e.wait / (e.waitTotal || 1));
      ctx.fillStyle = C.line;
      ctx.fillRect(e.x - 3, e.y + 4, 7, 2);
      ctx.fillStyle = C.warn;
      ctx.fillRect(e.x - 3, e.y + 4, 7 * (1 - p), 2);
    }

    for (const e of sim.ents) dot(e);

    // breaker badge sits on the wire it protects
    const bx = L.wBox.x + L.wBox.w + 4;
    const by = L.wBox.y + L.wBox.h / 2;
    const st = sim.breaker;
    const bc = st === 'closed' ? C.ok : st === 'open' ? C.rose : C.warn;
    ctx.fillStyle = bc;
    ctx.beginPath();
    ctx.arc(bx + (L.tight ? 3 : 5), by, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (!L.tight) {
      ctx.fillStyle = bc;
      ctx.font = '600 8px "IBM Plex Mono", monospace';
      ctx.fillText(st.toUpperCase(), bx, by - 8);
    }

    if (cfg.down) {
      ctx.fillStyle = C.rose;
      ctx.font = '600 9px "IBM Plex Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('UPSTREAM DOWN', W - 6, 14);
      ctx.textAlign = 'left';
    }
  }

  function drawSpark() {
    if (!sctx) return;
    const w = spark.width / dpr;
    const h = spark.height / dpr;
    sctx.clearRect(0, 0, w, h);
    const data = sim.spark;
    if (data.length < 2) return;
    const max = Math.max(10, ...data);
    sctx.strokeStyle = C.accent;
    sctx.lineWidth = 1;
    sctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - (data[i] / max) * (h - 2) - 1;
      if (i === 0) sctx.moveTo(x, y);
      else sctx.lineTo(x, y);
    }
    sctx.stroke();
  }

  /* ---- metrics readout -------------------------------------------- */

  const M = {
    thru: $('m-thru'), p50: $('m-p50'), p95: $('m-p95'),
    queue: $('m-queue'), retry: $('m-retry'), drop: $('m-drop'),
    brk: $('m-breaker'),
  };

  function pct(arr, p) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(s.length * p))];
  }

  function setText(el, v) {
    if (el && el.textContent !== v) el.textContent = v;
  }

  let metricAcc = 0;

  function updateMetrics() {
    const thru = sim.doneStamps.length;
    setText(M.thru, String(thru));
    setText(M.p50, Math.round(pct(sim.lat, 0.5) * 1000) + 'ms');
    setText(M.p95, Math.round(pct(sim.lat, 0.95) * 1000) + 'ms');
    setText(M.queue, String(sim.queue.length));
    setText(M.retry, String(sim.retried));
    setText(M.drop, String(sim.dropped));
    if (M.brk) {
      setText(M.brk, sim.breaker);
      M.brk.dataset.state = sim.breaker;
    }
    sim.spark.push(thru);
    if (sim.spark.length > 64) sim.spark.shift();
    drawSpark();
  }

  /* ---- loop -------------------------------------------------------- */

  let raf = 0;
  let last = 0;
  let acc = 0;
  let running = false;
  let visible = false;
  let tabOn = true;

  function frame(now) {
    raf = 0;
    if (!running) return;
    const dt = Math.min(0.25, (now - last) / 1000 || 0);
    last = now;
    acc += dt;
    // fixed timestep so the sim behaves the same on any refresh rate
    let guard = 0;
    while (acc >= DT && guard < 8) {
      step();
      acc -= DT;
      guard++;
    }
    if (guard >= 8) acc = 0;

    // smooth, frame rate independent approach to target slots
    const k = 1 - Math.pow(0.0001, dt);
    targets();
    for (const e of sim.ents) {
      e.x += (e.tx - e.x) * k;
      e.y += (e.ty - e.y) * k;
    }

    draw();

    metricAcc += dt;
    if (metricAcc >= 0.1) {
      metricAcc = 0;
      updateMetrics();
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    last = performance.now();
    acc = 0;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function maybeRun() {
    if (visible && tabOn && !document.hidden) start();
    else stop();
  }

  /* ---- controls ---------------------------------------------------- */

  function bindRange(id, valId, key, fmt) {
    const el = $(id);
    const out = $(valId);
    if (!el) return;
    const apply = () => {
      const v = Number(el.value);
      cfg[key] = v;
      if (key === 'workers') setWorkerCount(v);
      if (out) out.textContent = fmt ? fmt(v) : String(v);
    };
    el.addEventListener('input', apply);
    apply();
  }

  bindRange('c-rps', 'v-rps', 'rps', (v) => v + '/s');
  bindRange('c-fail', 'v-fail', 'fail', (v) => v + '%');
  bindRange('c-workers', 'v-workers', 'workers');

  const killBtn = $('c-kill');

  function syncKillBtn() {
    if (!killBtn) return;
    if (cfg.down) {
      const left = Math.max(0, Math.ceil(sim.killUntil - sim.t));
      killBtn.textContent = 'upstream down (' + left + 's)';
      killBtn.dataset.on = 'true';
    } else {
      killBtn.textContent = 'kill upstream';
      killBtn.dataset.on = 'false';
    }
  }

  if (killBtn) {
    killBtn.addEventListener('click', () => {
      cfg.down = true;
      sim.killUntil = sim.t + KILL_SECONDS;
      syncKillBtn();
    });
    setInterval(() => {
      if (cfg.down) syncKillBtn();
    }, 250);
  }

  /* ---- reduced motion fallback ------------------------------------- */

  const runBtn = $('sim-run');
  if (reduce) {
    const stage = $('sim-stage');
    if (stage) stage.dataset.static = 'true';
    if (runBtn) {
      runBtn.hidden = false;
      runBtn.addEventListener('click', () => {
        if (running) {
          stop();
          runBtn.textContent = 'run the sim';
        } else {
          running = true;
          last = performance.now();
          raf = requestAnimationFrame(frame);
          runBtn.textContent = 'pause';
        }
      });
    }
  }

  /* ---- wiring ------------------------------------------------------ */

  const ro = 'ResizeObserver' in window ? new ResizeObserver(() => {
    resize();
    if (spark && sctx) {
      const r = spark.getBoundingClientRect();
      spark.width = Math.round(Math.max(40, r.width) * dpr);
      spark.height = Math.round(Math.max(18, r.height) * dpr);
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }) : null;
  if (ro) ro.observe(canvas);
  window.addEventListener('resize', resize, { passive: true });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      for (const e of entries) visible = e.isIntersecting;
      maybeRun();
    }, { threshold: 0.01 }).observe(canvas);
  } else {
    visible = true;
  }

  document.addEventListener('visibilitychange', maybeRun);

  resize();
  if (spark && sctx) {
    const r = spark.getBoundingClientRect();
    spark.width = Math.round(Math.max(40, r.width) * dpr);
    spark.height = Math.round(Math.max(18, r.height) * dpr);
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  targets();
  draw();
  updateMetrics();

  /* ---------------------------------------------------------------- */
  /* tabs                                                              */
  /* ---------------------------------------------------------------- */

  const tabs = Array.from(document.querySelectorAll('.lab-tab'));
  const panels = {
    pipeline: $('panel-pipeline'),
    bot: $('panel-bot'),
  };

  function showTab(name) {
    if (!panels[name]) return;
    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.classList.toggle('is-on', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    for (const k of Object.keys(panels)) {
      if (panels[k]) panels[k].hidden = k !== name;
    }
    tabOn = name === 'pipeline';
    maybeRun();
    if (name === 'pipeline') resize();
  }

  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));

  /* ---------------------------------------------------------------- */
  /* discord bot playground                                            */
  /* ---------------------------------------------------------------- */

  const log = $('chan-log');
  const form = $('chan-form');
  const input = $('chan-in');
  const acBox = $('chan-ac');

  const bot = {
    roles: new Set(['member']),
    cases: 411,
    tickets: 0,
    slowmode: 0,
    lastMsg: 0,
    cooldown: new Map(),
  };

  const COMMANDS = [
    ['/help', 'what this bot does'],
    ['/role mod', 'give yourself the mod role'],
    ['/ban @user [reason]', 'ban someone, needs mod'],
    ['/poll q | a | b', 'run a poll with a live timer'],
    ['/ticket open <subject>', 'open a support ticket'],
    ['/roll 2d6', 'roll dice'],
    ['/mod slowmode <sec>', 'set channel slowmode'],
    ['/clear', 'wipe the channel'],
  ];

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function stamp() {
    const d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function pushMsg(node) {
    if (!log) return;
    log.appendChild(node);
    log.scrollTop = log.scrollHeight;
  }

  function userMsg(text) {
    const m = el('div', 'msg msg--user');
    const head = el('div', 'msg-head');
    head.appendChild(el('span', 'msg-name', 'you'));
    head.appendChild(el('span', 'msg-time', stamp()));
    m.appendChild(head);
    m.appendChild(el('div', 'msg-body', text));
    pushMsg(m);
  }

  function botMsg(build, ms) {
    const m = el('div', 'msg msg--bot');
    const head = el('div', 'msg-head');
    head.appendChild(el('span', 'msg-name', 'rhino'));
    head.appendChild(el('span', 'msg-tag', 'BOT'));
    head.appendChild(el('span', 'msg-time', stamp()));
    m.appendChild(head);
    const body = el('div', 'msg-body');
    build(body);
    m.appendChild(body);
    if (ms != null) {
      m.appendChild(el('div', 'msg-foot', 'took ' + ms + 'ms'));
    }
    pushMsg(m);
    return m;
  }

  function embed(body, opts) {
    const e = el('div', 'embed');
    if (opts.color) e.style.setProperty('--embed', opts.color);
    if (opts.title) e.appendChild(el('div', 'embed-title', opts.title));
    if (opts.desc) e.appendChild(el('div', 'embed-desc', opts.desc));
    if (opts.fields) {
      const f = el('div', 'embed-fields');
      for (const [k, v] of opts.fields) {
        const cell = el('div', 'embed-field');
        cell.appendChild(el('span', 'embed-k', k));
        cell.appendChild(el('span', 'embed-v', v));
        f.appendChild(cell);
      }
      e.appendChild(f);
    }
    if (opts.foot) e.appendChild(el('div', 'embed-foot', opts.foot));
    body.appendChild(e);
    return e;
  }

  function typing(then) {
    const t = el('div', 'typing');
    t.appendChild(el('span', 'typing-name', 'rhino'));
    const dots = el('span', 'typing-dots');
    dots.appendChild(el('i'));
    dots.appendChild(el('i'));
    dots.appendChild(el('i'));
    t.appendChild(dots);
    pushMsg(t);
    const wait = reduce ? 60 : 260 + Math.random() * 280;
    setTimeout(() => {
      t.remove();
      then(Math.round(12 + Math.random() * 28));
    }, wait);
  }

  function sysMsg(text, kind) {
    const m = el('div', 'msg msg--sys' + (kind ? ' is-' + kind : ''));
    m.appendChild(el('div', 'msg-body', text));
    pushMsg(m);
  }

  function onCooldown(name) {
    const now = Date.now();
    const until = bot.cooldown.get(name) || 0;
    if (now < until) return ((until - now) / 1000).toFixed(1);
    bot.cooldown.set(name, now + 2000);
    return null;
  }

  const handlers = {
    help(_args, ms) {
      botMsg((b) => {
        embed(b, {
          color: C.accent,
          title: 'commands',
          desc: 'everything here runs locally. no server, no tracking.',
          fields: COMMANDS.map(([c, d]) => [c, d]),
        });
      }, ms);
    },

    role(args, ms) {
      const want = (args[0] || '').toLowerCase();
      if (want !== 'mod') {
        sysMsg('usage: /role mod', 'warn');
        return;
      }
      bot.roles.add('mod');
      botMsg((b) => {
        embed(b, { color: C.ok, title: 'role added', desc: 'you now have @mod. try /ban again.' });
      }, ms);
    },

    ban(args, ms) {
      if (!bot.roles.has('mod')) {
        botMsg((b) => {
          embed(b, {
            color: C.rose,
            title: 'missing permission',
            desc: 'you need BAN_MEMBERS for that. run /role mod to grant yourself the role here.',
          });
        }, ms);
        return;
      }
      const who = args[0] || '@someone';
      const reason = args.slice(1).join(' ') || 'no reason given';
      bot.cases++;
      botMsg((b) => {
        embed(b, {
          color: C.rose,
          title: 'member banned',
          fields: [['user', who], ['reason', reason], ['case', '#' + bot.cases], ['by', 'you']],
          foot: 'logged to #mod-actions, appeal link sent by dm',
        });
      }, ms);
    },

    poll(args, ms) {
      const raw = args.join(' ');
      const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);
      if (parts.length < 3) {
        sysMsg('usage: /poll question | option a | option b', 'warn');
        return;
      }
      const q = parts[0];
      const opts = parts.slice(1, 5);
      const votes = opts.map(() => Math.floor(Math.random() * 4));
      botMsg((b) => {
        const e = embed(b, { color: C.mauve, title: q, foot: 'click a bar to vote' });
        const wrap = el('div', 'poll');
        opts.forEach((o, i) => {
          const row = el('button', 'poll-row');
          row.type = 'button';
          const label = el('span', 'poll-label', o);
          const bar = el('span', 'poll-bar');
          const fill = el('i');
          bar.appendChild(fill);
          const n = el('span', 'poll-n', String(votes[i]));
          row.appendChild(label);
          row.appendChild(bar);
          row.appendChild(n);
          row.addEventListener('click', () => {
            votes[i]++;
            n.textContent = String(votes[i]);
            paint();
          });
          wrap.appendChild(row);
          row._fill = fill;
        });
        function paint() {
          const total = Math.max(1, votes.reduce((a, c) => a + c, 0));
          Array.from(wrap.children).forEach((row, i) => {
            row._fill.style.width = Math.round((votes[i] / total) * 100) + '%';
          });
        }
        paint();
        e.appendChild(wrap);
        const timer = el('div', 'poll-timer');
        e.appendChild(timer);
        let left = 30;
        timer.textContent = 'closes in 30s';
        const iv = setInterval(() => {
          left--;
          if (left <= 0) {
            clearInterval(iv);
            const win = votes.indexOf(Math.max(...votes));
            timer.textContent = 'closed. winner: ' + opts[win];
            Array.from(wrap.children).forEach((r) => { r.disabled = true; });
            return;
          }
          timer.textContent = 'closes in ' + left + 's';
        }, 1000);
      }, ms);
    },

    ticket(args, ms) {
      const sub = args.slice(1).join(' ') || args.join(' ') || 'no subject';
      bot.tickets++;
      const num = String(bot.tickets).padStart(4, '0');
      botMsg((b) => {
        embed(b, {
          color: C.accent,
          title: 'ticket opened',
          fields: [['channel', '#ticket-' + num], ['subject', sub], ['sla', 'first reply under 12h']],
          foot: 'staff pinged. close it with /ticket close',
        });
      }, ms);
    },

    roll(args, ms) {
      const spec = (args[0] || '1d20').toLowerCase();
      const m = spec.match(/^(\d{1,2})?d(\d{1,3})$/);
      if (!m) {
        sysMsg('usage: /roll 2d6', 'warn');
        return;
      }
      const n = Math.min(20, Number(m[1] || 1));
      const sides = Math.min(100, Math.max(2, Number(m[2])));
      const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
      const total = rolls.reduce((a, c) => a + c, 0);
      botMsg((b) => {
        embed(b, {
          color: C.warn,
          title: n + 'd' + sides + '  ->  ' + total,
          desc: rolls.join('  '),
        });
      }, ms);
    },

    mod(args, ms) {
      const sub = (args[0] || '').toLowerCase();
      if (sub !== 'slowmode') {
        sysMsg('usage: /mod slowmode <seconds>', 'warn');
        return;
      }
      const sec = Math.max(0, Math.min(120, parseInt(args[1], 10) || 0));
      bot.slowmode = sec;
      botMsg((b) => {
        embed(b, {
          color: C.ok,
          title: sec ? 'slowmode on' : 'slowmode off',
          desc: sec
            ? sec + 's between messages. it applies to you too, try spamming.'
            : 'channel is open again.',
        });
      }, ms);
    },

    clear(_args, ms) {
      if (log) log.innerHTML = '';
      botMsg((b) => {
        embed(b, { color: C.dim, title: 'channel cleared', desc: 'nothing was really deleted, this is a toy.' });
      }, ms);
    },
  };

  handlers.h = handlers.help;

  function runCommand(raw) {
    const text = raw.trim();
    if (!text) return;

    // real slowmode, applies to the person who set it
    if (bot.slowmode) {
      const since = (Date.now() - bot.lastMsg) / 1000;
      if (bot.lastMsg && since < bot.slowmode) {
        sysMsg('slowmode is on. wait ' + (bot.slowmode - since).toFixed(1) + 's', 'warn');
        return;
      }
    }
    bot.lastMsg = Date.now();

    userMsg(text);

    if (text[0] !== '/') {
      typing((ms) => {
        botMsg((b) => {
          embed(b, {
            color: C.dim,
            title: 'not a command',
            desc: 'this channel only takes slash commands. type / to see them.',
          });
        }, ms);
      });
      return;
    }

    const parts = text.slice(1).split(/\s+/);
    const name = parts[0].toLowerCase();
    const args = parts.slice(1);
    const fn = handlers[name];

    if (!fn) {
      typing((ms) => {
        botMsg((b) => {
          embed(b, {
            color: C.rose,
            title: 'unknown command',
            desc: '/' + name + ' is not a thing. type / for the list.',
          });
        }, ms);
      });
      return;
    }

    const wait = onCooldown(name);
    if (wait) {
      sysMsg('you are going too fast. /' + name + ' is on cooldown for ' + wait + 's', 'warn');
      return;
    }

    typing((ms) => fn(args, ms));
  }

  /* ---- slash autocomplete ------------------------------------------ */

  let acIndex = 0;
  let acItems = [];

  function closeAc() {
    if (!acBox) return;
    acBox.hidden = true;
    acItems = [];
    acIndex = 0;
  }

  function openAc(q) {
    if (!acBox) return;
    const list = COMMANDS.filter(([c]) => c.slice(1).startsWith(q));
    if (!list.length) return closeAc();
    acItems = list;
    acIndex = Math.min(acIndex, list.length - 1);
    acBox.innerHTML = '';
    list.forEach(([c, d], i) => {
      const row = el('button', 'ac-row' + (i === acIndex ? ' is-on' : ''));
      row.type = 'button';
      row.appendChild(el('span', 'ac-cmd', c));
      row.appendChild(el('span', 'ac-desc', d));
      row.addEventListener('mousedown', (ev) => {
        ev.preventDefault();
        pickAc(i);
      });
      acBox.appendChild(row);
    });
    acBox.hidden = false;
  }

  function pickAc(i) {
    const item = acItems[i];
    if (!item || !input) return;
    // keep only the command word, drop the usage hint in brackets
    const cmd = item[0].split(' ')[0];
    input.value = cmd + ' ';
    closeAc();
    input.focus();
  }

  function syncAc() {
    if (!input) return;
    const v = input.value;
    if (v[0] !== '/' || v.includes(' ')) return closeAc();
    openAc(v.slice(1).toLowerCase());
  }

  if (input) {
    input.addEventListener('input', syncAc);
    input.addEventListener('blur', () => setTimeout(closeAc, 120));
    input.addEventListener('keydown', (e) => {
      if (acItems.length) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          acIndex = (acIndex + 1) % acItems.length;
          openAc(input.value.slice(1).toLowerCase());
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          acIndex = (acIndex - 1 + acItems.length) % acItems.length;
          openAc(input.value.slice(1).toLowerCase());
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && acItems.length && input.value.indexOf(' ') === -1)) {
          e.preventDefault();
          pickAc(acIndex);
          return;
        }
        if (e.key === 'Escape') {
          closeAc();
          return;
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      closeAc();
      runCommand(v);
    });
  }

  // seed the channel so it never looks empty
  if (log) {
    sysMsg('you joined #support. this bot runs entirely in your browser.');
    botMsg((b) => {
      embed(b, {
        color: C.accent,
        title: 'rhino is online',
        desc: 'type / to see what it does. everything responds for real, including cooldowns and permissions.',
        foot: 'uptime 41d 6h  ping 18ms',
      });
    });
  }

  /* ---------------------------------------------------------------- */
  /* small api so the shell can drive the lab                          */
  /* ---------------------------------------------------------------- */

  window.__lab = {
    show(tab) {
      const name = tab === 'bot' ? 'bot' : 'pipeline';
      showTab(name);
      const sec = document.getElementById('lab');
      if (sec) sec.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      return name;
    },
    stress(n) {
      const v = Math.max(1, Math.min(200, Math.round(n)));
      cfg.rps = v;
      const el2 = $('c-rps');
      const out = $('v-rps');
      if (el2) el2.value = String(v);
      if (out) out.textContent = v + '/s';
      return v;
    },
    workers(n) {
      const v = Math.max(1, Math.min(8, Math.round(n)));
      cfg.workers = v;
      setWorkerCount(v);
      const el2 = $('c-workers');
      const out = $('v-workers');
      if (el2) el2.value = String(v);
      if (out) out.textContent = String(v);
      return v;
    },
    kill() {
      cfg.down = true;
      sim.killUntil = sim.t + KILL_SECONDS;
      syncKillBtn();
      return KILL_SECONDS;
    },
    stats() {
      return {
        rps: cfg.rps,
        workers: sim.workers.length,
        queue: sim.queue.length,
        thru: sim.doneStamps.length,
        p95: Math.round(pct(sim.lat, 0.95) * 1000),
        retried: sim.retried,
        dropped: sim.dropped,
        breaker: sim.breaker,
      };
    },
  };
})();
