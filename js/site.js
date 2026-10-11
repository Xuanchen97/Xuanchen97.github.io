/* Shared behaviour for every page: nav, mobile menu, scroll-spy, reveals,
   card spotlight, clock, copy-to-clipboard, lazy autoplay video and the
   ⌘K command palette. No dependencies. */
(() => {
  'use strict';

  const ROOT = new URL('../', document.currentScript.src).href;
  const EMAIL = 'jasonliu97424@gmail.com';
  const RESUME = ROOT + 'resume/Xuanchen(Jason)%20Liu%20-%20Resume.pdf';
  const doc = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Toast ---------- */
  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      toast('Email copied — ' + EMAIL);
    } catch {
      window.location.href = 'mailto:' + EMAIL;
    }
  }

  /* ---------- Nav, progress bar, timeline (one rAF-throttled scroll handler) ---------- */
  const nav = $('.site-nav');
  const progress = $('.scroll-progress');
  const timeline = $('.timeline');
  const roles = timeline ? $$('.role', timeline) : [];
  let lastY = window.scrollY;
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 24);
      const menuOpen = document.body.classList.contains('menu-open');
      if (!menuOpen && !nav.contains(document.activeElement)) {
        nav.classList.toggle('is-hidden', y > lastY && y > 480);
      }
    }
    if (progress) {
      const max = doc.scrollHeight - vh;
      progress.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const line = vh * 0.55;
      const pct = Math.max(0, Math.min(1, (line - r.top) / r.height));
      timeline.style.setProperty('--tl', (pct * 100).toFixed(2) + '%');
      roles.forEach(el => el.classList.toggle('is-active', el.getBoundingClientRect().top < line));
    }
    lastY = Math.max(0, y);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();
  nav?.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('.menu-btn');
  const menu = $('#mobile-menu');
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.toggleAttribute('inert', !open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) nav?.classList.remove('is-hidden');
  }
  if (menu) menu.setAttribute('inert', '');
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu?.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); }
  });
  window.matchMedia('(min-width: 921px)').addEventListener?.('change', e => { if (e.matches) setMenu(false); });

  /* ---------- Scroll-spy ---------- */
  const spyLinks = $$('.nav-links a[href^="#"]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    const byId = new Map(spyLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        spyLinks.forEach(a => a.removeAttribute('aria-current'));
        byId.get(entry.target.id)?.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- Reveal on scroll + count-up ---------- */
  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.querySelector('sup')?.outerHTML || '';
    if (reduceMotion || !target) return;
    const start = performance.now();
    const dur = 1200;
    (function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.innerHTML = Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  const revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        $$('[data-count]', entry.target).forEach(countUp);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-in'));
  }

  /* ---------- Pointer spotlight on cards ---------- */
  if (canHover && !reduceMotion) {
    document.addEventListener('pointermove', e => {
      const card = e.target.closest?.('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* ---------- Local clock ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short'
    });
    const tick = () => { const s = 'Local time · ' + fmt.format(new Date()); clocks.forEach(c => { c.textContent = s; }); };
    tick();
    setInterval(tick, 30000);
  }

  /* ---------- Copy email / current year ---------- */
  $$('[data-copy-email]').forEach(btn => btn.addEventListener('click', copyEmail));
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Mobile project carousel progress ---------- */
  $$('[data-carousel]').forEach(track => {
    const bar = document.getElementById(track.dataset.carousel);
    if (!bar) return;
    const update = () => {
      const p = track.scrollWidth > track.clientWidth ? (track.scrollLeft + track.clientWidth) / track.scrollWidth : 1;
      bar.style.setProperty('--cp', p.toFixed(3));
    };
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  });

  /* ---------- Lazy autoplay video (plays only while on screen) ---------- */
  const videos = $$('video[data-autoplay]');
  if (videos.length && 'IntersectionObserver' in window && !reduceMotion) {
    const vio = new IntersectionObserver(entries => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) { v.play().catch(() => { v.controls = true; }); } else { v.pause(); }
      });
    }, { threshold: 0.25 });
    videos.forEach(v => { v.controls = false; v.muted = true; vio.observe(v); });
  }

  /* ---------- Command palette ---------- */
  const ICON = {
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    ext: '<path d="M7 17 17 7M8 7h9v9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name]}</svg>`;

  const COMMANDS = [
    { g: 'Navigate', label: 'Home', icon: 'home', href: ROOT + '#top', k: 'top start hero' },
    { g: 'Navigate', label: 'About', icon: 'hash', href: ROOT + '#about', k: 'bio skills stack education' },
    { g: 'Navigate', label: 'Experience', icon: 'hash', href: ROOT + '#experience', k: 'work jobs career hhs phri orispark world vision' },
    { g: 'Navigate', label: 'Projects', icon: 'hash', href: ROOT + '#projects', k: 'work portfolio built' },
    { g: 'Navigate', label: 'FAQ', icon: 'hash', href: ROOT + '#faq', k: 'questions facts' },
    { g: 'Navigate', label: 'Contact', icon: 'hash', href: ROOT + '#contact', k: 'email hire hello' },
    { g: 'Projects', label: 'Site Payments Platform', icon: 'folder', href: ROOT + 'projects/site-payments.html', k: 'vb6 payment clinical trial fee schedule redcap datafax trialmaster' },
    { g: 'Projects', label: 'D3.js World Impact Map', icon: 'folder', href: ROOT + 'projects/d3map.html', k: 'd3 map visualization world vision' },
    { g: 'Projects', label: 'Video Intelligence', icon: 'folder', href: ROOT + 'projects/videointellignece.html', k: 'angular firebase google api video' },
    { g: 'Projects', label: 'Tools Inventory System', icon: 'folder', href: ROOT + 'projects/toolslibrary.html', k: 'php mysql tools library' },
    { g: 'Projects', label: 'Uzooka · Shopify', icon: 'folder', href: ROOT + 'projects/uzooka.html', k: 'shopify liquid ecommerce bing' },
    { g: 'Projects', label: 'Polar Bear Dip PWA', icon: 'folder', href: ROOT + 'projects/polarbeardip.html', k: 'pwa progressive web app event' },
    { g: 'Projects', label: 'Nerd Overflow (GitHub)', icon: 'ext', href: 'https://github.com/Xuanchen97/NerdOverflow', ext: true, k: 'forum asp.net c#' },
    { g: 'Actions', label: 'Copy email address', icon: 'copy', run: copyEmail, hint: EMAIL, k: 'contact mail' },
    { g: 'Actions', label: 'Send an email', icon: 'mail', href: 'mailto:' + EMAIL, k: 'contact mail hello' },
    { g: 'Actions', label: 'Open résumé (PDF)', icon: 'file', href: RESUME, ext: true, k: 'resume cv pdf' },
    { g: 'Profiles', label: 'GitHub', icon: 'ext', href: 'https://github.com/Xuanchen97', ext: true, hint: '@Xuanchen97', k: 'code' },
    { g: 'Profiles', label: 'LinkedIn', icon: 'ext', href: 'https://www.linkedin.com/in/xuanchen-liu-jason/', ext: true, k: 'profile' }
  ];

  let dlg, input, list, filtered = [], active = 0, opener = null;

  const samePage = url => {
    const strip = p => p.replace(/index\.html$/, '');
    return url.origin === location.origin && strip(url.pathname) === strip(location.pathname);
  };

  function run(cmd) {
    if (!cmd) return;
    dlg.close();
    if (cmd.run) return cmd.run();
    const url = new URL(cmd.href, location.href);
    if (url.hash && samePage(url)) {
      const target = document.querySelector(url.hash);
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        history.replaceState(null, '', url.hash);
        return;
      }
    }
    if (cmd.ext) window.open(cmd.href, '_blank', 'noopener');
    else window.location.href = cmd.href;
  }

  function mark() {
    $$('.cmdk-item', list).forEach((el, i) => {
      const on = i === active;
      el.setAttribute('aria-selected', String(on));
      if (on) { input.setAttribute('aria-activedescendant', el.id); el.scrollIntoView({ block: 'nearest' }); }
    });
  }

  function render() {
    const q = input.value.trim().toLowerCase();
    filtered = COMMANDS.filter(c => !q || (c.label + ' ' + (c.k || '') + ' ' + c.g).toLowerCase().includes(q));
    if (!filtered.length) {
      list.innerHTML = '<p class="cmdk-empty">No results. Try “projects”, “email” or “résumé”.</p>';
      input.removeAttribute('aria-activedescendant');
      return;
    }
    let html = '', group = '';
    filtered.forEach((c, i) => {
      if (c.g !== group) { group = c.g; html += `<p class="cmdk-group" role="presentation">${group}</p>`; }
      html += `<button type="button" class="cmdk-item" role="option" id="cmdk-${i}" data-i="${i}" tabindex="-1">${svg(c.icon)}<span>${c.label}</span>${c.hint ? `<span class="hint">${c.hint}</span>` : c.ext ? '<span class="hint">↗</span>' : ''}</button>`;
    });
    list.innerHTML = html;
    active = Math.min(active, filtered.length - 1);
    mark();
  }

  function buildPalette() {
    dlg = document.createElement('dialog');
    dlg.className = 'cmdk';
    dlg.setAttribute('aria-label', 'Command menu');
    dlg.innerHTML =
      `<div class="cmdk-head">${svg('search')}<input class="cmdk-input" type="text" placeholder="Search pages, projects, actions…" role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-autocomplete="list" autocomplete="off" spellcheck="false" aria-label="Search"><span class="kbd">esc</span></div>` +
      '<div class="cmdk-list" id="cmdk-list" role="listbox" aria-label="Results"></div>' +
      '<div class="cmdk-foot" aria-hidden="true"><span>↑↓ navigate</span><span>↵ open</span><span>esc close</span></div>';
    document.body.appendChild(dlg);
    input = $('.cmdk-input', dlg);
    list = $('.cmdk-list', dlg);
    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % filtered.length; mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % filtered.length; mark(); }
      else if (e.key === 'Enter') { e.preventDefault(); run(filtered[active]); }
    });
    list.addEventListener('click', e => { const b = e.target.closest('.cmdk-item'); if (b) run(filtered[+b.dataset.i]); });
    list.addEventListener('pointermove', e => {
      const b = e.target.closest('.cmdk-item');
      if (b && +b.dataset.i !== active) { active = +b.dataset.i; mark(); }
    });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { opener?.focus?.(); });
  }

  function openPalette() {
    if (!dlg) buildPalette();
    if (dlg.open) return;
    opener = document.activeElement;
    input.value = '';
    active = 0;
    render();
    dlg.showModal();
    input.focus();
  }

  $$('[data-cmdk]').forEach(b => b.addEventListener('click', openPalette));
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dlg?.open ? dlg.close() : openPalette();
    } else if (e.key === '/' && !e.target.closest('input, textarea, [contenteditable="true"]') && !dlg?.open) {
      e.preventDefault();
      openPalette();
    }
  });
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  $$('[data-cmdk-key]').forEach(el => { el.textContent = isMac ? '⌘K' : 'Ctrl K'; });
})();
