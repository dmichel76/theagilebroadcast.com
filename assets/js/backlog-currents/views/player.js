/* Backlog Currents: the animated backlog column, the "This week" side panel and the followed item.
   Shared state (t, selected, hover, highlighted set, model) lives in `S`, owned by app.js. */
import { esc, fmtD } from '../format.js?v=2026-10-26b';
import { SECTIONS, rlab } from '../model.js?v=2026-10-26b';

const ease = f => f < .5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
const lerp = (a, b, f) => a + (b - a) * f;
const COLOUR_VARS = ['ink', 'muted', 'line', 'soft', 'surface', 'up', 'down', 'new', 'started', 'gone', 'steady'];

export function createPlayer(S, els) {
  const { canvas: cv, board, tip, side, detail } = els;
  let C = {}, rowH = 14, hits = [], lastStep = -1;
  const emph = it => it === S.selected || it === S.hover || (S.patSet && S.patSet.has(it));
  const active = () => S.selected || S.hover || S.patSet;

  function readColors() {
    const cs = getComputedStyle(els.root);
    COLOUR_VARS.forEach(n => C[n] = cs.getPropertyValue('--' + n).trim());
    S.dirty = true;
  }

  function fit() {
    if (!S.M) return;
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    rowH = S.M.maxSize <= 70 ? 14 : Math.max(5, 980 / S.M.maxSize);
    const h = Math.round(30 + S.M.maxSize * rowH + 12); cv.style.height = h + 'px';
    cv.cssW = r.width; cv.cssH = h; cv.width = Math.round(r.width * dpr); cv.height = Math.round(h * dpr);
    cv.ctx = cv.getContext('2d'); cv.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); S.dirty = true;
  }

  function draw() {
    const M = S.M, t = S.t, ctx = cv.ctx, w = cv.cssW, h = cv.cssH; if (!ctx || !w) return; ctx.clearRect(0, 0, w, h);
    const N = M.N, s = Math.min(Math.floor(t), N - 2), f = t - s, fe = ease(f), ms = f > 0.001 ? s + 1 : s;
    const gut = w < 520 ? 54 : 92, laneR = w < 520 ? 64 : 110, x0 = gut, x1 = w - laneR, colW = x1 - x0, padT = 28, bh = Math.max(1, rowH - 1.5);
    const Y = r => padT + (r - 1) * rowH;
    // section bands
    SECTIONS.forEach((sc, i) => {
      if (sc.from > M.maxSize) return; const y0 = Y(sc.from), y1 = Y(Math.min(sc.to, M.maxSize) + 1);
      ctx.fillStyle = i % 2 ? C.surface : C.soft; ctx.fillRect(0, y0, x1, y1 - y0);
      ctx.textAlign = 'left'; ctx.fillStyle = C.ink; ctx.font = '600 12px "Instrument Sans","Segoe UI",sans-serif'; ctx.fillText(sc.name, 6, y0 + 15);
      ctx.fillStyle = C.muted; ctx.font = '500 11px "JetBrains Mono",monospace'; ctx.fillText('#' + rlab(sc), 6, y0 + 29);
    });
    ctx.fillStyle = C.muted; ctx.font = '500 11px "JetBrains Mono",monospace'; ctx.textAlign = 'left'; ctx.fillText('rank 1 ▾', x0, padT - 10);
    ctx.textAlign = 'center'; ctx.fillText('started ▸', x1 + laneR / 2, padT - 10);
    const draws = [], arcs = [];
    const exitOf = (it, k) => it.exits.find(d => d.k === k);
    if (f <= 0.001) {
      // at rest: show snapshot s, coloured by the move that brought each item there
      for (const it of M.items) { const r = it.rank[s]; if (!r) continue; draws.push({ it, x: x0, y: Y(r), wd: colW, al: 1, kind: M.kindAt(it, s) }); }
    } else {
      for (const it of M.items) {
        const a = it.rank[s], b = it.rank[s + 1]; let x = x0, y, wd = colW, al = 1, kind;
        if (a && b) {
          y = lerp(Y(a), Y(b), fe); kind = M.kindAt(it, ms);
          const d = M.steps[s + 1].moves.get(it) || 0;
          if (Math.abs(d) >= 3 && f < 1) arcs.push({ y0: Y(a) + bh / 2, y1: Y(b) + bh / 2, c: d > 0 ? C.up : C.down, al: Math.sin(Math.PI * f), it });
        } else if (!a && b) { y = Y(b); kind = 'new'; x = x0 - 40 * (1 - fe); al = Math.min(1, f * 1.8); }
        else if (a && !b) {
          const d = exitOf(it, s + 1); y = Y(a);
          if (d && d.type === 'started') { kind = 'started'; x = lerp(x0, x1 + 12, fe); wd = lerp(colW, laneR - 24, fe); al = 1 - Math.max(0, (f - .7) / .3); }
          else { kind = 'gone'; wd = colW * (1 - .5 * fe); al = 1 - fe; }
        } else continue;
        if (al <= .01) continue;
        draws.push({ it, x, y, wd, al, kind });
      }
    }
    for (const a of arcs) {
      const em = emph(a.it); if (active() && !em) continue; const bx = x1 + 6, dx = Math.min(laneR - 14, 10 + Math.abs(a.y1 - a.y0) * .25);
      ctx.globalAlpha = a.al * .85; ctx.strokeStyle = a.c; ctx.lineWidth = em ? 2 : 1.3; ctx.beginPath(); ctx.moveTo(bx, a.y0); ctx.bezierCurveTo(bx + dx, a.y0, bx + dx, a.y1, bx, a.y1); ctx.stroke();
      ctx.beginPath(); const dir = a.y1 < a.y0 ? 1 : -1; ctx.moveTo(bx, a.y1); ctx.lineTo(bx + 5, a.y1 + 4 * dir); ctx.stroke();
    }
    draws.sort((p, q) => (emph(p.it) ? 1 : 0) - (emph(q.it) ? 1 : 0));
    hits = []; const showText = rowH >= 12; ctx.font = '11px "Instrument Sans","Segoe UI",system-ui'; ctx.textAlign = 'left';
    for (const d of draws) {
      const col = C[d.kind], dim = active() && !emph(d.it) ? .22 : 1, al = d.al * dim;
      ctx.globalAlpha = al * (d.kind === 'steady' ? 1 : .24); ctx.fillStyle = d.kind === 'steady' ? C.steady : col;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(d.x, d.y, d.wd, bh, 2) : ctx.rect(d.x, d.y, d.wd, bh); ctx.fill();
      if (d.kind !== 'steady') { ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fillRect(d.x, d.y, 3, bh); }
      if (showText && d.wd > 60) {
        ctx.globalAlpha = al; ctx.fillStyle = C.ink; let txt = d.it.id + '  ' + d.it.title; const max = d.wd - 12;
        if (ctx.measureText(txt).width > max) { while (txt.length > 4 && ctx.measureText(txt + '…').width > max) txt = txt.slice(0, -1); txt += '…'; }
        ctx.fillText(txt, d.x + 8, d.y + bh - 3);
      }
      if (d.it === S.selected) { ctx.globalAlpha = 1; ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.strokeRect(d.x - .5, d.y - .5, d.wd + 1, bh + 1); }
      hits.push({ it: d.it, x: d.x, y: d.y, w: d.wd, h: Math.max(bh, 4) });
    }
    ctx.globalAlpha = 1;
  }

  function updateSide(force) {
    const M = S.M, N = M.N, s = Math.min(Math.floor(S.t), N - 2), f = S.t - s, ms = f > 0.001 ? s + 1 : s;
    if (ms === lastStep && !force) return; lastStep = ms;
    const st = M.steps[ms];
    side.lab.textContent = ms === 0 ? 'Starting snapshot' : 'Week to';
    side.date.textContent = fmtD(M.dates[ms], true);
    let up = 0, down = 0; st.moves.forEach(d => { if (d >= 3) up++; else if (d <= -3) down++; });
    const started = st.departures.filter(d => d.type === 'started').length + st.straight.length;
    side.n.new.textContent = ms === 0 ? 0 : st.arrivals.length; side.n.started.textContent = started;
    side.n.up.textContent = up; side.n.down.textContent = down;
    side.n.gone.textContent = st.departures.filter(d => d.type !== 'started').length; side.n.size.textContent = M.sizes[ms];
    const notes = [];
    if (ms > 0) {
      [...st.moves.entries()].filter(([, d]) => d >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([it, d]) => notes.push({ it, c: 'up', mv: '↑' + d, sub: '#' + it.rank[ms - 1] + ' → #' + it.rank[ms] }));
      [...st.moves.entries()].filter(([, d]) => d <= -3).sort((a, b) => a[1] - b[1]).slice(0, 2).forEach(([it, d]) => notes.push({ it, c: 'down', mv: '↓' + (-d), sub: '#' + it.rank[ms - 1] + ' → #' + it.rank[ms] }));
      st.arrivals.filter(it => it.rank[ms] <= 10).slice(0, 2).forEach(it => notes.push({ it, c: 'new', mv: 'new', sub: 'arrived at #' + it.rank[ms] }));
      st.departures.filter(d => d.type === 'started' && d.from > 10).slice(0, 2).forEach(d => notes.push({ it: d.it, c: 'started', mv: 'start', sub: 'started from #' + d.from }));
      st.straight.slice(0, 2).forEach(it => notes.push({ it, c: 'started', mv: 'start', sub: 'straight into work' }));
    }
    side.notable.innerHTML = notes.length
      ? notes.map((n, i) => `<li><button type="button" data-i="${i}"><span class="mv" style="color:var(--${n.c})">${n.mv}</span><span class="tt">${esc(n.it.title || n.it.id)}<small>${esc(n.it.id)} · ${n.sub}</small></span></button></li>`).join('')
      : `<li class="quiet">${ms === 0 ? 'Press Play to step through the weeks.' : 'A quiet week: no big re-prioritisation.'}</li>`;
    side.notable.onclick = e => { const b = e.target.closest('button'); if (!b) return; S.selected = notes[+b.dataset.i].it; renderDetail(); S.dirty = true; };
  }

  function renderDetail() {
    const M = S.M, el = detail; if (!S.selected) { el.hidden = true; return; }
    const it = S.selected, N = M.N; const pts = []; for (let k = 0; k < N; k++) if (it.rank[k]) pts.push([k, it.rank[k]]);
    const facts = [];
    if (pts.length) {
      facts.push(it.first === 0 ? `In the first snapshot at #${pts[0][1]}` : `Arrived ${fmtD(M.dates[it.first])} at #${pts[0][1]}`);
      const best = Math.min(...pts.map(p => p[1])), worst = Math.max(...pts.map(p => p[1])); facts.push(`best #${best}, worst #${worst}`);
    }
    it.exits.forEach(d => facts.push(`${d.type === 'started' ? 'started' : d.type === 'removed' ? 'removed' : 'left the backlog'} ${fmtD(M.dates[d.k])} from #${d.from}`));
    if (it.straight) facts.push(`went straight into work ${fmtD(M.dates[it.straight])}`);
    if (it.rank[N - 1]) facts.push(`still waiting at #${it.rank[N - 1]}`);
    const W = 240, H = 56, mx = Math.max(...pts.map(p => p[1]), 10);
    const P = pts.map(([k, r]) => [(4 + k / (N - 1) * (W - 8)).toFixed(1), (4 + (r - 1) / (mx - 1 || 1) * (H - 8)).toFixed(1)]);
    el.innerHTML = `<div class="info"><span class="eyebrow">Following</span><span class="ttl">${esc(it.title || it.id)}</span><span class="facts mono">${esc(it.id)}${it.type ? ' · ' + esc(it.type) : ''}</span><span class="facts">${esc(facts.join('; '))}.</span></div>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Rank history, top is rank 1"><rect x="0" y="0" width="${W}" height="${H}" rx="6" fill="var(--soft)"/>
      ${P.length > 1 ? `<polyline points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round"/>` : ''}
      ${P.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.8" fill="var(--accent)"/>`).join('')}
      <text x="6" y="13" font-size="10" fill="var(--muted)" font-family="JetBrains Mono, monospace">#1</text></svg>
      <button class="btn" type="button" data-clear>Clear</button>`;
    el.hidden = false;
    el.querySelector('[data-clear]').onclick = () => { S.selected = null; renderDetail(); S.dirty = true; };
  }

  // pointer: hover tooltips and tap-to-follow
  function pick(x, y) { for (let i = hits.length - 1; i >= 0; i--) { const h = hits[i]; if (x >= h.x - 2 && x <= h.x + h.w + 2 && y >= h.y - 1 && y <= h.y + h.h + 1) return h.it; } return null; }
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(), it = pick(e.clientX - r.left, e.clientY - r.top);
    if (it !== S.hover) { S.hover = it; S.dirty = true; }
    if (it) {
      const k = Math.round(S.t), rk = it.rank[k];
      tip.innerHTML = `<b>${esc(it.title || it.id)}</b><br><span class="m">${esc(it.id)}${rk ? ' · #' + rk : ''}${it.type ? ' · ' + esc(it.type) : ''}</span>`; tip.hidden = false;
      const br = board.getBoundingClientRect(); let lx = e.clientX - br.left + 14; if (lx > br.width - 270) lx = e.clientX - br.left - 270;
      tip.style.left = Math.max(4, lx) + 'px'; tip.style.top = (e.clientY - br.top + 14) + 'px';
    } else tip.hidden = true;
  });
  cv.addEventListener('pointerleave', () => { S.hover = null; tip.hidden = true; S.dirty = true; });
  cv.addEventListener('click', e => { const r = cv.getBoundingClientRect(), it = pick(e.clientX - r.left, e.clientY - r.top); S.selected = it && it !== S.selected ? it : null; renderDetail(); S.dirty = true; });

  new ResizeObserver(() => fit()).observe(board);
  const mq = matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', readColors);
  new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  readColors();

  return { fit, draw, updateSide, renderDetail, reset() { lastStep = -1; }, readColors };
}
