/* Homepage-only hero effects: the "raw signal → structured data" canvas strip
   and the career_log.sql terminal. Both pause while off-screen or in a
   background tab, and render a single static frame for reduced-motion users. */
(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Tracks whether an element is on screen and the tab is visible. */
  function visibility(el, onChange) {
    let inView = false;
    const update = () => onChange(inView && !document.hidden);
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; update(); }).observe(el);
    document.addEventListener('visibilitychange', update);
  }

  /* ---------------- Signal strip ---------------- */
  (function signal() {
    const wrap = document.querySelector('.signal');
    const canvas = wrap?.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let BEAT = 240;        // px per heartbeat (shorter on narrow screens)
    const SPEED = 46;      // px per second
    const STEP = 9;        // px between data bars
    const LEVELS = 7;      // quantisation levels
    let w = 0, h = 0, t = 0, last = 0, raf = 0, running = false;
    let pointerX = -1e4, boost = 0;

    const gauss = (x, mu, s) => Math.exp(-((x - mu) ** 2) / (2 * s * s));
    const ecg = p =>
        0.10 * gauss(p, 0.12, 0.025)
      - 0.12 * gauss(p, 0.205, 0.009)
      + 1.00 * gauss(p, 0.225, 0.011)
      - 0.28 * gauss(p, 0.245, 0.010)
      + 0.26 * gauss(p, 0.42, 0.040);
    function sample(x) {
      const u = x / BEAT;
      const beat = Math.floor(u);
      const amp = 0.82 + 0.18 * Math.abs(Math.sin(beat * 12.9898));
      return ecg(u - beat) * amp + 0.018 * Math.sin(x * 0.31) + 0.01 * Math.sin(x * 1.7);
    }
    // "Structured" value: a windowed envelope of the raw signal plus a slow trend,
    // so the right-hand side reads as a bar chart rather than isolated spikes.
    function structured(x) {
      let peak = 0;
      for (let j = -3; j <= 3; j++) peak = Math.max(peak, Math.abs(sample(x + j * 8)) * (1 - Math.abs(j) * 0.12));
      return Math.min(1, 0.14 + 0.1 * (1 + Math.sin(x * 0.017)) + 0.8 * peak);
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      BEAT = w < 640 ? 150 : 240;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function draw() {
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      const mid = h * 0.62;
      const amp = h * 0.44;
      const gate = w / 2;
      const off = t * SPEED;
      const lift = x => 1 + 0.7 * boost * Math.exp(-((x - pointerX) ** 2) / 7200);

      // Baseline
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, mid + 0.5); ctx.lineTo(w, mid + 0.5); ctx.stroke();
      ctx.setLineDash([]);

      // Raw signal (left of the gate)
      ctx.beginPath();
      for (let x = 0; x <= gate; x += 2) {
        const y = mid - sample(x - off) * amp * lift(x);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,107,87,0.14)';
      ctx.lineWidth = 7;
      ctx.stroke();
      const g = ctx.createLinearGradient(0, 0, gate, 0);
      g.addColorStop(0, 'rgba(255,107,87,0)');
      g.addColorStop(0.3, 'rgba(255,107,87,0.85)');
      g.addColorStop(1, 'rgba(255,107,87,1)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Structured data (right of the gate): quantised bars anchored in world space
      const kStart = Math.ceil((gate + 6 - off) / STEP);
      const kEnd = Math.floor((w - off) / STEP);
      for (let k = kStart; k <= kEnd; k++) {
        const wx = k * STEP;
        const sx = wx + off;
        const v = Math.min(1, structured(wx) * lift(sx));
        const q = Math.round(v * LEVELS) / LEVELS;
        const bh = Math.max(2, q * amp * 0.95);
        const fadeIn = Math.min(1, (sx - gate) / 60);
        const fadeOut = Math.min(1, (w - sx) / 120);
        const a = (0.28 + 0.72 * q) * fadeIn * fadeOut;
        ctx.fillStyle = `rgba(198,255,77,${a.toFixed(3)})`;
        ctx.fillRect(sx - 1.5, mid - bh, 3, bh);
        ctx.fillStyle = `rgba(198,255,77,${(a * 0.16).toFixed(3)})`;
        ctx.fillRect(sx - 1.5, mid + 3, 3, bh * 0.35);
      }

      // Gate
      const gg = ctx.createLinearGradient(0, 0, 0, h);
      gg.addColorStop(0, 'rgba(198,255,77,0)');
      gg.addColorStop(0.5, 'rgba(198,255,77,0.55)');
      gg.addColorStop(1, 'rgba(198,255,77,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(gate - 0.5, 0, 1, h);
      const glow = ctx.createRadialGradient(gate, mid, 0, gate, mid, 90);
      glow.addColorStop(0, 'rgba(198,255,77,0.10)');
      glow.addColorStop(1, 'rgba(198,255,77,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(gate - 90, 0, 180, h);
    }

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now;
      t += dt;
      boost += ((pointerX > -1e3 ? 1 : 0) - boost) * Math.min(1, dt * 6);
      draw();
      if (running) raf = requestAnimationFrame(frame);
    }

    new ResizeObserver(resize).observe(canvas);
    resize();
    if (reduceMotion) return;

    wrap.addEventListener('pointermove', e => { pointerX = e.clientX - canvas.getBoundingClientRect().left; }, { passive: true });
    wrap.addEventListener('pointerleave', () => { pointerX = -1e4; });
    visibility(wrap, on => {
      if (on && !running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
      else if (!on && running) { running = false; cancelAnimationFrame(raf); }
    });
  })();

  /* ---------------- career_log.sql terminal ---------------- */
  (function terminal() {
    const codeEl = document.getElementById('term-code');
    const resEl = document.getElementById('term-results');
    if (!codeEl || !resEl) return;

    // Years are derived from real start/end months, so the numbers stay current.
    const now = new Date();
    const months = (y1, m1, y2, m2) => (y2 - y1) * 12 + (m2 - m1);
    const ROLES = [
      { role: 'Tech R&D',   m: months(2019, 8, 2020, 8),  rank: 3 },
      { role: 'Full-Stack', m: months(2021, 0, 2023, 7),  rank: 1 },
      { role: 'Solutions',  m: months(2023, 7, now.getFullYear(), now.getMonth()), rank: 2, current: true }
    ];
    const fmt = m => (Math.floor((m / 12) * 10) / 10).toFixed(1);
    let cumul = 0;
    const ROWS = ROLES.map(r => {
      cumul += r.m;
      const plus = r.current ? '+' : '';
      return [r.role, fmt(r.m) + plus, fmt(cumul) + plus, String(r.rank)];
    });
    const SUMMARY = `${ROLES.length} roles  ·  ${fmt(cumul)}+ yrs experience`;

    const SQL = [
      ['-- Xuanchen (Jason) Liu · career summary', 'c'],
      ['SELECT', 'k'],
      ['  role,', 'i'],
      ['  yrs,', 'i'],
      ['  SUM(yrs) OVER (', 'f'],
      ['    ORDER BY start_yr', 'k'],
      ['    ROWS UNBOUNDED PRECEDING', 'k'],
      ['  )          AS exp_cumul,', 'i'],
      ['  DENSE_RANK() OVER (', 'f'],
      ['    ORDER BY tech_count DESC', 'k'],
      ['  )          AS complexity', 'i'],
      ['FROM career_log', 'k'],
      ['ORDER BY start_yr;', 'k']
    ];

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let active = false;
    let resume = null;
    const gate = () => active ? Promise.resolve() : new Promise(r => { resume = r; });
    const wait = async ms => { await sleep(ms); await gate(); };

    const line = (text, cls) => {
      const el = document.createElement('span');
      el.className = 'term-line tk-' + cls;
      el.textContent = text;
      return el;
    };
    const row = (cells, extra = '') => {
      const el = document.createElement('div');
      el.className = 'term-row' + extra;
      cells.forEach((c, i) => {
        const s = document.createElement('span');
        s.textContent = c;
        if (i === 2 && !extra) s.className = 'is-num';
        el.appendChild(s);
      });
      return el;
    };
    function showResults() {
      resEl.hidden = false;
      resEl.replaceChildren(row(['role', 'yrs', 'exp_cumul', 'complexity'], ' is-head'));
    }
    function summary() {
      const s = document.createElement('div');
      s.className = 'term-summary';
      s.textContent = SUMMARY;
      resEl.appendChild(s);
    }

    if (reduceMotion) {
      SQL.forEach(([t, c]) => codeEl.appendChild(line(t, c)));
      const st = line('> Done', 'i'); st.className = 'term-line term-status is-done'; codeEl.appendChild(st);
      showResults(); ROWS.forEach(r => resEl.appendChild(row(r))); summary();
      return;
    }

    visibility(codeEl, on => { active = on; if (on && resume) { resume(); resume = null; } });

    (async function loop() {
      for (;;) {
        await gate();
        codeEl.replaceChildren();
        resEl.hidden = true;
        const cursor = document.createElement('span');
        cursor.className = 'term-cursor';
        codeEl.appendChild(cursor);

        for (const [text, cls] of SQL) {
          const el = line('', cls);
          codeEl.insertBefore(el, cursor);
          for (const ch of text) {
            el.textContent += ch;
            await wait(18 + Math.random() * 16);
          }
          await wait(60);
        }
        cursor.remove();
        const st = line('> Executing…', 'i');
        st.className = 'term-line term-status';
        codeEl.appendChild(st);
        await wait(800);
        st.textContent = '> Done · 3 rows';
        st.classList.add('is-done');
        await wait(160);
        showResults();
        for (const r of ROWS) { await wait(130); resEl.appendChild(row(r)); }
        await wait(160);
        summary();
        await wait(5200);
      }
    })();
  })();
})();
