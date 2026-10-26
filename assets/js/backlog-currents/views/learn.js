/* Backlog Currents: the "So what?" cards and their small data-driven drawings.
   Numbers come from insights.js; this file only draws. Colours are CSS variables set on .bc (and --c per card). */
import { esc } from '../format.js?v=2026-10-26b';
import { START_BUCKETS } from '../insights.js?v=2026-10-26b';

const P = x => Math.round(x);
const f1 = x => x.toFixed(1);
const SV = g => `<svg class="ldraw" viewBox="0 0 300 76" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${g}</svg>`;

const DRAW = {
  order({ counts: c }) {
    const m = Math.max(1, ...c);
    return SV(START_BUCKETS.map((b, i) => { const x = 22 + i * 34, h = Math.max(1.5, c[i] / m * 44); return `<rect x="${x}" y="${56 - h}" width="24" height="${h}" rx="2" fill="${b[0] > 10 ? 'var(--down)' : 'var(--accent)'}"/><text x="${x + 12}" y="69" text-anchor="middle">${b[2]}</text>`; }).join('')
      + `<line x1="18" x2="290" y1="56.5" y2="56.5" stroke="var(--line)"/><text x="226" y="12" text-anchor="middle">skipped the queue</text>`);
  },
  wait({ avgSize, little }) {
    const nb = Math.max(4, Math.min(16, Math.round(avgSize / 4))); let g = '';
    for (let i = 0; i < nb; i++) { const x = 24 + i * 14; g += `<rect x="${x}" y="38" width="10" height="16" rx="2" fill="${i === nb - 1 ? 'var(--accent)' : 'var(--steady)'}"/>`; }
    const dx = 24 + nb * 14 + 18;
    g += `<rect x="${dx}" y="26" width="18" height="28" rx="2" fill="none" stroke="var(--ink)" stroke-width="1.5"/><circle cx="${dx + 13}" cy="41" r="1.5" fill="var(--ink)"/><line x1="16" x2="292" y1="54.5" y2="54.5" stroke="var(--line)"/>`;
    g += `<path d="M24,26 L${dx - 8},26" stroke="var(--c)" stroke-width="1.5" fill="none" stroke-dasharray="3 3"/><path d="M${dx - 12},22 L${dx - 6},26 L${dx - 12},30" stroke="var(--c)" stroke-width="1.5" fill="none"/><text x="${(24 + dx) / 2}" y="18" text-anchor="middle" class="lb">${little == null ? '?' : f1(little)} weeks in the queue</text><text x="${dx + 9}" y="67" text-anchor="middle">work</text><text x="24" y="67">new request</text>`;
    return SV(g);
  },
  bottom({ pb }) {
    let g = '';
    for (let i = 0; i < 8; i++) { const y = 6 + i * 7.6, lo = i >= 4; g += `<rect x="40" y="${y}" width="${150 - i * 3}" height="5.5" rx="2" fill="${lo ? 'var(--steady)' : 'var(--accent)'}" opacity="${lo ? .9 : .75}"/>`; }
    const w = 2 + 14 * pb / 100;
    g += `<text x="34" y="20" text-anchor="end">top</text><text x="34" y="54" text-anchor="end">bottom</text><path d="M196,49 C230,49 236,30 270,30" stroke="var(--c)" stroke-width="${w.toFixed(1)}" fill="none"/><path d="M268,${30 - w / 2 - 4} L280,30 L268,${30 + w / 2 + 4}Z" fill="var(--c)"/><text x="238" y="66" text-anchor="middle" class="lb">${P(pb)}% ever started</text>`;
    return SV(g);
  },
  unplanned({ pu }) {
    const x0 = 20, x1 = 280, wu = (x1 - x0) * Math.min(1, pu / 100), xs = x1 - wu;
    return SV(`<rect x="${x0}" y="30" width="${x1 - x0}" height="24" rx="2" fill="var(--steady)"/><rect x="${xs}" y="30" width="${wu}" height="24" rx="2" fill="var(--c)"/>${wu > 20 ? `<path d="M${xs + wu / 2 + 3},33 l-8,10 h6 l-3,9 l9,-12 h-6 l3,-7z" fill="var(--surface)"/>` : ''}<text x="${x0}" y="22" class="lb">planned backlog work</text><text x="${x1}" y="22" text-anchor="end" class="lb" style="fill:var(--c)">unplanned ${P(pu)}%</text><text x="150" y="68" text-anchor="middle">one sprint’s capacity</text>`);
  },
  churn({ ser, peak, pv, from, to }) {
    const m = Math.max(.05, ...ser), X = i => 20 + i * (260 / Math.max(1, ser.length - 1)), Y = v => 60 - v / m * 44, pts = ser.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' '), pi = peak - 1;
    return SV(`<polygon points="20,60 ${pts} 280,60" fill="var(--c)" opacity=".18"/><polyline points="${pts}" fill="none" stroke="var(--c)" stroke-width="2" stroke-linejoin="round"/><line x1="20" x2="280" y1="60.5" y2="60.5" stroke="var(--line)"/><circle cx="${X(pi)}" cy="${Y(ser[pi])}" r="3.5" fill="var(--c)"/><text x="${X(pi)}" y="${Math.max(10, Y(ser[pi]) - 7)}" text-anchor="${pi > ser.length * .8 ? 'end' : 'middle'}" class="lb">${P(100 * pv)}% moved</text><text x="20" y="71">${from}</text><text x="280" y="71" text-anchor="end">${to}</text>`);
  },
  balance({ arr, st, rm, runway }) {
    const m = Math.max(arr, st + rm, .1), wi = 2 + 8 * arr / m, wo = 2 + 8 * (st + rm) / m, lvl = Math.max(.15, Math.min(.95, (runway || 0) / 26)), top = 32, bot = 62, wy = bot - (bot - top) * lvl;
    const tub = `M92,${top} L96,${bot - 6} Q98,${bot} 106,${bot} L196,${bot} Q204,${bot} 206,${bot - 6} L210,${top}`;
    return SV(`<path d="${tub}" fill="none" stroke="var(--ink)" stroke-width="1.6"/><clipPath id="bc-tub"><path d="${tub}Z"/></clipPath><rect x="100" y="${wy}" width="100" height="${bot - wy}" fill="var(--new)" opacity=".35" clip-path="url(#bc-tub)"/>`
      + `<path d="M24,22 L112,22 L112,${top + 6}" stroke="var(--new)" stroke-width="${wi.toFixed(1)}" fill="none"/><text x="24" y="${22 - wi / 2 - 5}" class="lb" style="fill:var(--new)">in ${f1(arr)}/wk</text>`
      + `<path d="M188,${bot - 2} L188,${bot + 4} M188,${bot + 1} L262,${bot + 1}" stroke="var(--started)" stroke-width="${wo.toFixed(1)}" fill="none"/><path d="M260,${bot + 1 - wo / 2 - 4} L272,${bot + 1} L260,${bot + 1 + wo / 2 + 4}Z" fill="var(--started)"/><text x="272" y="${bot - wo / 2 - 6}" text-anchor="end" class="lb" style="fill:var(--started)">out ${f1(st + rm)}/wk</text><text x="151" y="${(wy + bot) / 2 + 4}" text-anchor="middle" style="fill:var(--ink)">${runway == null ? '' : P(runway) + ' wk of work'}</text>`);
  },
  recency({ avg }) {
    const X = v => 30 + v / 100 * 240, ax = X(Math.max(0, Math.min(100, avg)));
    return SV(`<rect x="${X(62)}" y="34" width="${X(100) - X(62)}" height="10" fill="var(--down)" opacity=".18"/><rect x="${X(0)}" y="34" width="${X(38) - X(0)}" height="10" fill="var(--up)" opacity=".14"/><line x1="${X(0)}" x2="${X(100)}" y1="39" y2="39" stroke="var(--muted)" stroke-width="1.5"/><line x1="${X(50)}" x2="${X(50)}" y1="30" y2="48" stroke="var(--muted)" stroke-dasharray="2 2"/><text x="${X(50)}" y="60" text-anchor="middle">no bias</text><text x="${X(0)}" y="60">older picked</text><text x="${X(100)}" y="60" text-anchor="end">newer picked</text><path d="M${ax - 7},16 L${ax + 7},16 L${ax},30Z" fill="var(--c)"/><text x="${ax}" y="12" text-anchor="middle" class="lb">${P(avg)}%</text>`);
  },
  waste({ reached, started, dropped, sank, lab }) {
    const segs = [[started, 'var(--up)', 'started'], [reached - started - dropped - sank, 'var(--steady)', 'still near top'], [sank, 'var(--down)', 'sank'], [dropped, 'var(--gone)', 'dropped']], tot = Math.max(1, reached);
    let x = 20, g = '', lx = 20;
    for (const [v, c] of segs) { if (v <= 0) continue; const w = 260 * v / tot; g += `<rect x="${x}" y="26" width="${w}" height="20" fill="${c}"/>`; x += w; }
    g = `<clipPath id="bc-wclip"><rect x="20" y="26" width="260" height="20" rx="2"/></clipPath><g clip-path="url(#bc-wclip)">${g}</g><text x="20" y="18" class="lb">${reached} ${lab} items</text>`;
    for (const [v, c, l] of segs) { if (v <= 0) continue; g += `<rect x="${lx}" y="56" width="8" height="8" rx="2" fill="${c}"/><text x="${lx + 11}" y="64">${v} ${l}</text>`; lx += 24 + (String(v).length + l.length) * 6; }
    return SV(g);
  },
  topsrc({ news, below, rawNews, rawBelow }) {
    const m = Math.max(rawNews, rawBelow, 1), wn = 2 + 12 * rawNews / m, wb = 2 + 12 * rawBelow / m;
    return SV(`<rect x="176" y="8" width="96" height="30" rx="2" fill="var(--surface)" stroke="var(--ink)" stroke-width="1.4"/><text x="224" y="27" text-anchor="middle" class="lb">Top 10</text>`
      + `<path d="M30,23 L162,23" stroke="var(--new)" stroke-width="${wn.toFixed(1)}" fill="none"/><path d="M160,${23 - wn / 2 - 4} L172,23 L160,${23 + wn / 2 + 4}Z" fill="var(--new)"/><text x="30" y="${17 - wn / 2}" class="lb" style="fill:var(--new)">new ${f1(news)}/wk</text>`
      + `<path d="M224,72 L224,52" stroke="var(--up)" stroke-width="${wb.toFixed(1)}" fill="none"/><path d="M${224 - wb / 2 - 4},53 L224,41 L${224 + wb / 2 + 4},53Z" fill="var(--up)"/><text x="${216 - wb / 2}" y="66" text-anchor="end" class="lb" style="fill:var(--up)">climbed ${f1(below)}/wk</text>`);
  }
};

export function renderLearnCards(el, cards, activeKey) {
  el.innerHTML = cards.map(c => `<article class="lc ${c.warn ? 'warn' : 'good'}">
    <div class="lc-top"><span class="lc-tag">${c.tag}</span><span class="verdict">${c.warn ? 'Worth a conversation' : 'Looks healthy'}</span></div>
    ${DRAW[c.k](c.d)}<p class="hl">${c.hl}</p><p class="ev">${esc(c.ev)}</p>
    <dl><div><dt>So what</dt><dd>${esc(c.so)}</dd></div><div><dt>Try</dt><dd>${esc(c.tr)}</dd></div><div><dt>Ask the team</dt><dd class="ask">${esc(c.ask)}</dd></div></dl>
    ${c.show ? `<button class="btn show" type="button" data-k="${c.k}" aria-pressed="${activeKey === c.k}">${c.show}</button>` : ''}</article>`).join('');
}
