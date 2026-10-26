/* Backlog Currents: Arrivals and departures (headline stats + the SVG flow map).
   Arrivals come in from the left, exits leave to the right, promotions arc up on the left, demotions arc down on the right.
   Stroke width is proportional to the rate; animated dashes show direction (off for reduced motion, in CSS).
   Below 700px wide the compact phone layout is used. */
import { esc } from '../format.js?v=2026-10-26';
import { SECTIONS, rlab } from '../model.js?v=2026-10-26';
import { flowStats } from '../insights.js?v=2026-10-26';

const DISPLAY = 'Archivo, Arial Black, sans-serif';
const MONO = 'IBM Plex Mono, monospace';

export function renderFlowStats(el, M) {
  const s = flowStats(M);
  const stat = (k, v, unit, n, c) => `<div class="fs" style="--c:${c}"><span class="k">${k}</span><span class="v">${v}<small>${unit}</small></span><span class="n">${n}</span></div>`;
  el.innerHTML =
    stat('Arriving', s.arriving.toFixed(1), '/ week', `${s.newTotal} new items in ${M.N - 1} weeks`, 'var(--new)') +
    stat('Started', s.started.toFixed(1), '/ week', s.straight ? `incl. ${s.straight} straight into work` : 'taken into work', 'var(--started)') +
    stat('Removed or left', s.gone.toFixed(1), '/ week', `${s.goneTotal} items cleared out`, 'var(--gone)') +
    stat('Net change', (s.net > 0 ? '+' : '') + s.net.toFixed(1), '/ week', `backlog ${M.sizes[0]} → ${M.sizes[M.N - 1]} items`, s.net > 0.05 ? 'var(--down)' : s.net < -0.05 ? 'var(--up)' : 'var(--muted)');
}

export function renderFlow(el, M) {
  const W = Math.round(el.clientWidth); if (!W || !M) return;
  const narrow = W < 700, wk = M.weeks, secs = SECTIONS.map((s, i) => ({ s, i })).filter(x => x.s.from <= M.maxSize), n = secs.length;
  const T = M.tot, mv = M.mv;
  let maxR = .1; secs.forEach(({ i }) => { maxR = Math.max(maxR, T[i].news, T[i].started, T[i].gone); secs.forEach(({ i: j }) => maxR = Math.max(maxR, mv[i][j])); });
  const thick = c => c <= 0 ? 0 : Math.max(2, c / maxR * (narrow ? 16 : 28)), r1 = c => (c / wk).toFixed(1);
  const aL = narrow ? 42 : 190, arcL = narrow ? 38 : 96, exL = narrow ? 50 : 230;
  const bx = aL + arcL, bw = Math.max(110, W - bx - arcL - exL), bR = bx + bw, head = narrow ? 20 : 30, bh = narrow ? 104 : 128, gap = narrow ? 40 : 52;
  const top = k => head + k * (bh + gap), mid = k => top(k) + bh / 2, H = top(n - 1) + bh + 8;
  const out = [], streams = [];
  const tri = (x, y, dir, w, col) => { const s = Math.max(7, w * .75); return dir === 'r' ? `<path d="M${x - s},${y - s * .75}L${x},${y}L${x - s},${y + s * .75}Z" fill="${col}"/>` : `<path d="M${x + s},${y - s * .75}L${x},${y}L${x + s},${y + s * .75}Z" fill="${col}"/>`; };
  const ribbon = (d, w, col, tip, tx) => { out.push(`<g><title>${esc(tip)}</title><path class="ribbon" d="${d}" stroke="${col}" stroke-width="${w.toFixed(1)}"/>${tx || ''}</g>`); if (w >= 3) streams.push(`<path class="stream" d="${d}" stroke-width="${Math.max(1.2, w * .32).toFixed(1)}"/>`); };
  const T1 = (x, y, txt, anchor, cls) => `<text x="${x}" y="${y}" text-anchor="${anchor || 'start'}" ${cls || ''}>${txt}</text>`;
  // column headers
  if (!narrow) out.push(`<g font-size="11" fill="var(--muted)" letter-spacing=".08em" font-family="${MONO}">${T1(0, 12, 'ARRIVE')}${T1(bx - arcL / 2, 12, 'PROMOTED ↑', 'middle')}${T1(bR + arcL / 2, 12, 'DEMOTED ↓', 'middle')}${T1(W, 12, 'LEAVE', 'end')}</g>`);
  // promotions (left) and demotions (right)
  secs.forEach(({ i }, ai) => {
    let up = 0, dn = 0;
    secs.forEach(({ i: j, s: sj }, bi) => {
      const c = mv[i][j]; if (!c || i === j) return; const w = thick(c), span = Math.abs(ai - bi);
      if (bi < ai) {
        const y1 = top(ai) + 18 + up * 9, y2 = top(bi) + bh - 18 - up * 4, d = Math.min(arcL - 8, 24 + span * 22 + up * 6); up++;
        const path = `M${bx},${y1}C${bx - d},${y1} ${bx - d},${y2} ${bx - 6},${y2}`;
        ribbon(path, w, 'var(--up)', `${SECTIONS[i].name} → ${sj.name}: ${r1(c)} promoted per week`,
          T1(bx - d * .75 - 8 - w / 2, (y1 + y2) / 2 + 4, r1(c), 'end', `font-size="${narrow ? 10 : 12}" font-family="${MONO}" font-weight="500" fill="var(--up)"`));
        out.push(tri(bx, y2, 'r', w, 'var(--up)'));
      } else {
        const y1 = top(ai) + bh - 18 - dn * 9, y2 = top(bi) + 18 + dn * 4, d = Math.min(arcL - 8, 24 + span * 22 + dn * 6); dn++;
        const path = `M${bR},${y1}C${bR + d},${y1} ${bR + d},${y2} ${bR + 6},${y2}`;
        ribbon(path, w, 'var(--down)', `${SECTIONS[i].name} → ${sj.name}: ${r1(c)} demoted per week`,
          T1(bR + d * .75 + 8 + w / 2, (y1 + y2) / 2 + 4, r1(c), 'start', `font-size="${narrow ? 10 : 12}" font-family="${MONO}" font-weight="500" fill="var(--down)"`));
        out.push(tri(bR, y2, 'l', w, 'var(--down)'));
      }
    });
  });
  // arrivals and exits
  secs.forEach(({ i, s }, k) => {
    const o = T[i], y = mid(k);
    if (o.news) {
      const w = thick(o.news), x0 = narrow ? 2 : 16;
      ribbon(`M${x0},${y}L${bx - 8},${y}`, w, 'var(--new)', `${r1(o.news)} new items per week land in ${s.name}`); out.push(tri(bx - 1, y, 'r', w, 'var(--new)'));
      out.push(narrow ? T1(x0, y - w / 2 - 5, r1(o.news), 'start', `font-size="12" font-family="${MONO}" font-weight="500" fill="var(--new)"`)
        : `<text x="${x0}" y="${y - w / 2 - 8}"><tspan font-family="${DISPLAY}" font-weight="800" font-size="22" fill="var(--new)">${r1(o.news)}</tspan><tspan dx="6" font-size="12" fill="var(--muted)">new / wk</tspan></text>`);
    }
    const lane = [['started', 'var(--started)', 'started', -1], ['gone', 'var(--gone)', 'removed', 1]];
    lane.forEach(([key, col, lab, sg]) => {
      const c = o[key]; if (!c) return; const w = thick(c), yy = y + sg * (narrow ? 16 : 22), x1 = W - (narrow ? 2 : 8);
      ribbon(`M${bR + 1},${yy}L${x1 - 8},${yy}`, w, col, `${r1(c)} ${lab} per week from ${s.name}`); out.push(tri(x1, yy, 'r', w, col));
      out.push(narrow ? T1(x1, yy + (sg < 0 ? -w / 2 - 5 : w / 2 + 13), r1(c), 'end', `font-size="12" font-family="${MONO}" font-weight="500" fill="${col}"`)
        : `<text x="${x1}" y="${sg < 0 ? yy - w / 2 - 7 : yy + w / 2 + 17}" text-anchor="end"><tspan font-family="${DISPLAY}" font-weight="800" font-size="${key === 'started' ? 22 : 17}" fill="${key === 'started' ? 'var(--started)' : 'var(--muted)'}">${r1(c)}</tspan><tspan dx="6" font-size="12" fill="var(--muted)">${lab} / wk</tspan></text>`);
    });
  });
  // section boxes
  const maxW = Math.max(1, ...secs.flatMap(({ i }) => [...M.weekly[i].i, ...M.weekly[i].o]));
  secs.forEach(({ i, s }, k) => {
    const o = T[i], y = top(k), ins = o.news + o.below + o.above, outs = o.started + o.up + o.down + o.gone, net = (ins - outs) / wk, stay = outs ? o.avg / (outs / wk) : null;
    const netCol = net > 0.05 ? 'var(--down)' : net < -0.05 ? 'var(--up)' : 'var(--muted)', netTxt = Math.abs(net) < 0.05 ? 'balanced' : (net > 0 ? 'filling +' : 'draining ') + net.toFixed(1) + '/wk';
    let g = `<rect x="${bx}" y="${y}" width="${bw}" height="${bh}" fill="var(--soft)" stroke="var(--line)"/><rect x="${bx}" y="${y}" width="4" height="${bh}" fill="var(--ink)"/>`;
    g += T1(bx + 14, y + 22, s.name.toUpperCase(), 'start', `font-size="${narrow ? 13 : 15}" font-family="${DISPLAY}" font-weight="800" fill="var(--ink)"`);
    g += T1(bx + 14, y + 38, '#' + rlab(s), 'start', `font-size="11" font-family="${MONO}" fill="var(--muted)"`);
    const sx = narrow ? bx + 14 : bR - 12, sa = narrow ? 'start' : 'end';
    g += `<text x="${sx}" y="${y + (narrow ? 62 : 30)}" text-anchor="${sa}"><tspan font-family="${DISPLAY}" font-weight="800" font-size="${narrow ? 20 : 26}" fill="var(--ink)">${stay == null ? '–' : stay.toFixed(1)}</tspan><tspan dx="4" font-size="11" fill="var(--muted)">wk stay</tspan></text>`;
    g += T1(sx, y + (narrow ? 77 : 48), `${Math.round(o.avg)} items avg`, sa, 'font-size="11.5" fill="var(--muted)"');
    g += T1(bx + 14, y + (narrow ? 94 : 60), netTxt, 'start', `font-size="12" font-weight="600" fill="${netCol}"`);
    if (!narrow) {
      const x0 = bx + 14, x1 = bR - 12, base = y + bh - 22, hh = 16, cnt = M.N - 1, bwid = Math.max(1, (x1 - x0) / cnt - 1.5);
      for (let w = 1; w < M.N; w++) {
        const xx = x0 + (w - 1) * ((x1 - x0) / cnt), hi = M.weekly[i].i[w] / maxW * hh, ho = M.weekly[i].o[w] / maxW * hh;
        if (hi) g += `<rect x="${xx.toFixed(1)}" y="${(base - hi).toFixed(1)}" width="${bwid.toFixed(1)}" height="${hi.toFixed(1)}" fill="var(--new)" opacity=".8"/>`;
        if (ho) g += `<rect x="${xx.toFixed(1)}" y="${(base + 1).toFixed(1)}" width="${bwid.toFixed(1)}" height="${ho.toFixed(1)}" fill="var(--muted)" opacity=".7"/>`;
      }
      g += `<line x1="${x0}" x2="${x1}" y1="${base + .5}" y2="${base + .5}" stroke="var(--line)"/>`;
      if (k === 0) g += T1(x1, base - hh - 4, 'weekly in ▲ / out ▼', 'end', 'font-size="10" fill="var(--muted)"');
    }
    out.push(`<g><title>${esc(s.name)}: ${r1(ins)} in and ${r1(outs)} out per week</title>${g}</g>`);
  });
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Flow of items into, between and out of backlog sections">${out.join('')}${streams.join('')}</svg>`;
}
