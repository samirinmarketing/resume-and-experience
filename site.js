/* =====================================================================
   site.js · shared behaviour for every page
   - mobile menu (a real button, keyboard accessible)
   - reveal-on-entry, once (content stays visible without JS)
   - one tooltip for every chart (hover + keyboard focus, textContent only)
   - small SVG chart kit: timeline, dumbbell, waffle, units, hbars, meters
   - case study filter + "show all"
   - Calendly loads only when asked
   ===================================================================== */
(function () {
  'use strict';
  const doc = document.documentElement;
  doc.classList.add('js');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  const cssVar = n => getComputedStyle(doc).getPropertyValue(n).trim();
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function svgText(parent, x, y, str, attrs) {
    const t = svgEl('text', Object.assign({ x, y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }

  /* ---------- mobile menu ---------- */
  const menuBtn = $('.menu-btn'), nav = $('#site-nav');
  if (menuBtn && nav) {
    const set = open => { nav.dataset.open = String(open); menuBtn.setAttribute('aria-expanded', String(open)); menuBtn.textContent = open ? 'Close' : 'Menu'; };
    menuBtn.addEventListener('click', () => set(nav.dataset.open !== 'true'));
    $$('a', nav).forEach(a => a.addEventListener('click', () => set(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.dataset.open === 'true') { set(false); menuBtn.focus(); } });
  }

  /* ---------- current section in nav ---------- */
  const navLinks = $$('#site-nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    const map = new Map(navLinks.map(a => [a.getAttribute('href').slice(1), a]));
    const spy = new IntersectionObserver(es => es.forEach(e => {
      const a = map.get(e.target.id);
      if (a && e.isIntersecting) { navLinks.forEach(l => l.removeAttribute('aria-current')); a.setAttribute('aria-current', 'true'); }
    }), { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((a, id) => { const s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- reveal once ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.rv').forEach((n, i) => { n.style.transitionDelay = `${(i % 4) * 60}ms`; io.observe(n); });
    // At the end of the page the last blocks can never clear the bottom margin: reveal whatever is left.
    const atEnd = () => {
      if (innerHeight + scrollY >= doc.scrollHeight - 4) {
        $$('.rv:not(.in)').forEach(n => { n.classList.add('in'); io.unobserve(n); });
        removeEventListener('scroll', atEnd);
      }
    };
    addEventListener('scroll', atEnd, { passive: true });
    addEventListener('load', atEnd);
    requestAnimationFrame(atEnd);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(atEnd);
  } else {
    $$('.rv').forEach(n => n.classList.add('in'));
  }

  /* ---------- tooltip ---------- */
  let tip = $('.tip');
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  function bindTip(node, value, label) {
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'img');
    node.classList.add('hit');
    node.setAttribute('aria-label', `${label}: ${value}`);
    const show = (x, y) => {
      tip.replaceChildren();
      const b = document.createElement('b'); b.textContent = value;
      const s = document.createElement('span'); s.textContent = label;
      tip.append(b, s);
      const w = tip.offsetWidth || 220;
      tip.style.transform = `translate(${Math.max(8, Math.min(x + 14, innerWidth - w - 8))}px, ${y + 16}px)`;
      tip.classList.add('on');
    };
    const hide = () => tip.classList.remove('on');
    node.addEventListener('pointermove', e => show(e.clientX, e.clientY));
    node.addEventListener('pointerleave', hide);
    node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); show(r.left + r.width / 2, r.bottom); });
    node.addEventListener('blur', hide);
  }
  addEventListener('scroll', () => tip.classList.remove('on'), { passive: true });

  /* ---------- chart kit ---------- */
  const Charts = {};

  // Career timeline (Gantt). roles: [company, role, 'YYYY-MM', 'YYYY-MM', category]; cats: {key: [label, colourVar]}
  Charts.timeline = (host, roles, cats, opts = {}) => {
    const from = opts.from || 2015, to = opts.to || 2027;
    const t0 = Date.UTC(from, 0, 1), t1 = Date.UTC(to, 0, 1);
    const toT = s => { const [y, m] = s.split('-').map(Number); return Date.UTC(y, m - 1, 1); };
    let lastW = 0;
    const draw = () => {
      const W = Math.round(host.clientWidth); if (!W || W === lastW) return; lastW = W; host.replaceChildren();
      const narrow = W < 620, rowH = narrow ? 44 : 32, top = 6, left = narrow ? 0 : 172, right = 8, H = top + roles.length * rowH + 28;
      const x = d => left + (d - t0) / (t1 - t0) * (W - left - right);
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': opts.label || 'Timeline' }, host);
      for (let y = from; y <= to; y++) {
        const gx = x(Date.UTC(y, 0, 1));
        svgEl('line', { x1: gx, x2: gx, y1: top, y2: H - 22, stroke: cssVar('--hairline'), 'stroke-width': 1 }, svg);
        if (y < to && (!narrow || (y - from) % 2 === 0)) svgText(svg, gx + (narrow ? 0 : 4), H - 6, narrow ? `'${String(y).slice(2)}` : String(y));
      }
      roles.forEach(([co, role, s, e, cat], i) => {
        const y = top + i * rowH + (narrow ? 20 : 8), x0 = x(toT(s)), x1 = x(toT(e) + 2.6e9);
        if (narrow) svgText(svg, Math.min(x0, W - 160), y - 6, co, { class: 't-sans' });
        else svgText(svg, left - 12, y + 11, co, { 'text-anchor': 'end', class: 't-sans' });
        const g = svgEl('g', {}, svg);
        svgEl('rect', { x: x0, y: y - 7, width: Math.max(x1 - x0, 8), height: 28, fill: 'transparent' }, g);
        svgEl('rect', { x: x0, y, width: Math.max(x1 - x0, 6), height: 14, rx: 4, fill: cssVar(cats[cat][1]), class: 'mk grow', style: `transition-delay:${i * 70}ms` }, g);
        const months = Math.round((toT(e) - toT(s)) / 2.63e9) + 1;
        bindTip(g, `${s.replace('-', '.')} – ${e.replace('-', '.')} · ${months} mo`, `${role}, ${co} (${cats[cat][0]})`);
      });
    };
    draw();
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(host);
  };

  // Before / after on one axis (indexed values)
  Charts.dumbbell = (host, before, after, opts = {}) => {
    const W = 320, H = 64, l = 6, r = 14, max = opts.max || 200;
    const x = v => l + v / max * (W - l - r);
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': opts.label || '' }, host);
    (opts.ticks || [0, 100, 200]).forEach((v, i, a) => {
      svgEl('line', { x1: x(v), x2: x(v), y1: 8, y2: 42, stroke: cssVar('--hairline'), 'stroke-width': 1 }, svg);
      svgText(svg, x(v), 58, String(v), { 'text-anchor': i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle' });
    });
    svgEl('line', { x1: x(before), x2: x(after), y1: 25, y2: 25, stroke: cssVar('--d1'), 'stroke-width': 2, class: 'grow' }, svg);
    const a = svgEl('g', {}, svg); svgEl('circle', { cx: x(before), cy: 25, r: 7, fill: cssVar('--d-muted'), stroke: '#fff', 'stroke-width': 2, class: 'mk' }, a);
    bindTip(a, String(before), opts.beforeLabel || 'Before');
    const b = svgEl('g', {}, svg); svgEl('circle', { cx: x(after), cy: 25, r: 7, fill: cssVar('--d1'), stroke: '#fff', 'stroke-width': 2, class: 'mk pop', style: 'transition-delay:700ms' }, b);
    bindTip(b, String(after), opts.afterLabel || 'After');
  };

  // 10 x 10 waffle: share of 100
  Charts.waffle = (host, filled, opts = {}) => {
    const s = 16, gap = 3, W = 10 * (s + gap) - gap;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${W}`, role: 'group', style: 'max-width:200px' }, host);
    const g = svgEl('g', {}, svg);
    for (let i = 0; i < 100; i++) {
      const on = i < filled;
      svgEl('rect', { x: (i % 10) * (s + gap), y: Math.floor(i / 10) * (s + gap), width: s, height: s, rx: 3,
        fill: on ? cssVar('--d1') : cssVar('--mist'), class: on ? 'pop' : '', style: on ? `transition-delay:${i * 40}ms` : '' }, g);
    }
    bindTip(g, `${filled}%`, opts.label || '');
  };

  // Unit dots: total, of which `hi` are emphasised
  Charts.units = (host, total, hi, opts = {}) => {
    const cols = opts.cols || 10, d = 13, gap = 6, rows = Math.ceil(total / cols), W = cols * (d + gap) - gap, H = rows * (d + gap) - gap;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', style: `max-width:${W}px` }, host);
    const on = svgEl('g', {}, svg), off = svgEl('g', {}, svg);
    for (let i = 0; i < total; i++) {
      const lit = i < hi;
      svgEl('circle', { cx: (i % cols) * (d + gap) + d / 2, cy: Math.floor(i / cols) * (d + gap) + d / 2, r: d / 2,
        fill: lit ? cssVar('--d1') : cssVar('--d-muted'), class: 'mk pop', style: `transition-delay:${Math.floor(i / cols) * 90}ms` }, lit ? on : off);
    }
    bindTip(on, String(hi), opts.hiLabel || '');
    if (total > hi) bindTip(off, String(total - hi), opts.restLabel || '');
  };

  // Horizontal bars, one series. rows: [label, value, tooltipValue]
  Charts.hbars = (host, rows, opts = {}) => {
    let lastW = 0;
    const draw = () => {
      const W = Math.round(host.clientWidth); if (!W || W === lastW) return; lastW = W; host.replaceChildren();
      const narrow = W < 400, rowH = narrow ? 50 : 36, l = narrow ? 0 : (opts.labelW || 170), r = 56, H = rows.length * rowH + 22;
      const max = opts.max || Math.max(...rows.map(d => d[1]));
      const x = v => l + v / max * (W - l - r);
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'group', 'aria-label': opts.label || '' }, host);
      (opts.ticks || []).forEach(v => {
        svgEl('line', { x1: x(v), x2: x(v), y1: 0, y2: H - 20, stroke: cssVar('--hairline'), 'stroke-width': 1 }, svg);
        svgText(svg, x(v), H - 4, opts.tickFmt ? opts.tickFmt(v) : String(v), { 'text-anchor': 'middle' });
      });
      rows.forEach(([label, v, tv], i) => {
        const y = i * rowH + (narrow ? 22 : 9);
        if (narrow) svgText(svg, 0, y - 6, label, { class: 't-sans' });
        else svgText(svg, l - 12, y + 13, label, { 'text-anchor': 'end', class: 't-sans' });
        const g = svgEl('g', opts.onPick ? { style: 'cursor:pointer' } : {}, svg);
        svgEl('rect', { x: l, y: y - 6, width: W - l, height: 30, fill: 'transparent' }, g);
        const bw = Math.max(x(v) - l, 6);
        svgEl('path', { d: `M${l},${y} h${bw - 4} a4,4 0 0 1 4,4 v10 a4,4 0 0 1 -4,4 h${-(bw - 4)} z`, fill: cssVar('--d1'), class: 'mk grow', style: `transition-delay:${i * 90}ms` }, g);
        svgText(svg, l + bw + 8, y + 13, tv || String(v), { class: 't-strong' });
        bindTip(g, tv || String(v), opts.tipLabel ? opts.tipLabel(label) : label);
        if (opts.onPick) {
          g.addEventListener('click', () => opts.onPick(label));
          g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onPick(label); } });
        }
      });
    };
    draw();
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(host);
  };

  // Meters: rows [label, value, max]
  Charts.meters = (host, rows) => {
    const W = 480, rowH = 40, l = 96, r = 46, H = rows.length * rowH;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group' }, host);
    rows.forEach(([label, v, max], i) => {
      const y = i * rowH + 10, full = W - l - r;
      svgText(svg, l - 12, y + 12, label, { 'text-anchor': 'end', class: 't-sans' });
      svgEl('rect', { x: l, y, width: full, height: 14, rx: 7, fill: cssVar('--teal-wash') }, svg);
      const g = svgEl('g', {}, svg);
      svgEl('rect', { x: l, y, width: full * v / max, height: 14, rx: 7, fill: cssVar('--d1'), class: 'mk grow' }, g);
      svgText(svg, W - r + 8, y + 12, `${v}/${max}`, { class: 't-strong' });
      bindTip(g, `${v} of ${max}`, label);
    });
  };

  /* ---------- case study filter ---------- */
  function initIndex(root) {
    const cards = $$('.card', root), chipsHost = $('[data-chips]', root), more = $('[data-more]', root);
    if (!cards.length || !chipsHost) return null;
    const cats = [...new Set(cards.map(c => c.dataset.cat))];
    const limit = Number(root.dataset.limit || 6);
    let current = 'All', expanded = false;
    const chips = ['All', ...cats].map(c => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.cat = c;
      const n = c === 'All' ? cards.length : cards.filter(k => k.dataset.cat === c).length;
      const s = document.createElement('span'); s.className = 'n'; s.textContent = n;
      b.append(document.createTextNode(c), s);
      b.addEventListener('click', () => pick(c));
      chipsHost.appendChild(b);
      return b;
    });
    const render = () => {
      const match = cards.filter(c => current === 'All' || c.dataset.cat === current);
      cards.forEach(c => { c.hidden = true; });
      match.forEach((c, i) => { c.hidden = !(expanded || i < limit); });
      if (more) { more.hidden = match.length <= limit; more.textContent = expanded ? 'Show fewer' : `Show all ${match.length}`; more.setAttribute('aria-expanded', String(expanded)); }
      chips.forEach(ch => ch.setAttribute('aria-pressed', String(ch.dataset.cat === current)));
    };
    const pick = c => { current = c; expanded = false; render(); };
    if (more) more.addEventListener('click', () => { expanded = !expanded; render(); });
    render();
    return pick;
  }

  /* ---------- Calendly on demand ---------- */
  $$('[data-calendly]').forEach(btn => {
    btn.addEventListener('click', e => {
      const slot = document.getElementById(btn.dataset.calendly);
      if (!slot) return;
      e.preventDefault();
      if (!slot.dataset.loaded) {
        slot.dataset.loaded = '1';
        const w = document.createElement('div');
        w.className = 'calendly-inline-widget';
        w.dataset.url = btn.getAttribute('href');
        w.style.minWidth = '320px'; w.style.height = '700px';
        slot.appendChild(w);
        const s = document.createElement('script');
        s.src = 'https://assets.calendly.com/assets/external/widget.js'; s.async = true;
        document.body.appendChild(s);
      }
      slot.hidden = false;
      slot.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
    });
  });

  window.Site = { Charts, initIndex, bindTip, cssVar };
})();
