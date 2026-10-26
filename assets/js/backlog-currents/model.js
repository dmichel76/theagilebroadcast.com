/* Backlog Currents: the model.
   Pure functions, no DOM. Turns the snapshots from buildSource into ranks per snapshot, arrivals and departures,
   moves between sections and the movement patterns. Logic ported unchanged from the prototype. */
import { norm, REMOVED_ST } from './csv.js?v=2026-10-26';

export const SECTIONS = [
  { name: 'Top', from: 1, to: 10 },
  { name: 'Next up', from: 11, to: 25 },
  { name: 'Middle', from: 26, to: 50 },
  { name: 'Deep', from: 51, to: Infinity }
];
export const secOf = r => { for (let i = 0; i < SECTIONS.length; i++) if (r <= SECTIONS[i].to) return i; return SECTIONS.length - 1; };
export const rlab = s => s.to === Infinity ? s.from + '+' : s.from + '–' + s.to;

/* "Moved" = re-prioritised by this many places, measured against the items that stayed in both snapshots. */
export const MOVE_THRESHOLD = 3;

export function buildModel(src) {
  const snaps = src.snaps, N = snaps.length, items = new Map();
  const cls = st => { if (!src.hasState) return 'backlog'; const n = norm(st); if (!n || src.backlog.has(n)) return 'backlog'; return REMOVED_ST.has(n) ? 'removed' : 'started'; };
  const rnum = v => parseFloat(String(v).replace(/,/g, ''));
  const lists = [];
  snaps.forEach((s, k) => {
    const seen = new Set(), bl = [];
    for (const r of s.rows) {
      if (seen.has(r.id)) continue; seen.add(r.id);
      let it = items.get(r.id);
      if (!it) { it = { id: r.id, title: r.title, type: r.type, rank: new Int32Array(N), cls: new Array(N), st: new Array(N), exits: [], first: -1 }; items.set(r.id, it); }
      it.st[k] = norm(r.state);
      if (r.title) it.title = r.title; if (r.type) it.type = r.type;
      const c = cls(r.state); it.cls[k] = c; if (c === 'backlog') bl.push({ it, r });
    }
    if (src.hasRank) bl.sort((a, b) => {
      const x = a.r.rank, y = b.r.rank;
      if (!x && !y) return a.r.ord - b.r.ord; if (!x) return 1; if (!y) return -1;
      if (src.rankNumeric) { const d = rnum(x) - rnum(y); return d || a.r.ord - b.r.ord; }
      return x < y ? -1 : x > y ? 1 : a.r.ord - b.r.ord;
    });
    else bl.sort((a, b) => a.r.ord - b.r.ord);
    bl.forEach((o, i) => { o.it.rank[k] = i + 1; if (o.it.first < 0) o.it.first = k; });
    lists.push(bl.map(o => o.it));
  });
  const all = [...items.values()];
  const steps = [{ moves: new Map(), arrivals: lists[0], departures: [], straight: [] }];
  for (let k = 1; k < N; k++) {
    const prev = lists[k - 1], cur = lists[k], pS = new Set(prev), cS = new Set(cur);
    const cp = prev.filter(x => cS.has(x)), cc = cur.filter(x => pS.has(x)), ip = new Map(cp.map((x, i) => [x, i])), moves = new Map();
    cc.forEach((x, i) => moves.set(x, ip.get(x) - i));
    const arrivals = cur.filter(x => !pS.has(x));
    const departures = prev.filter(x => !cS.has(x)).map(x => {
      let type = 'left';
      for (let j = k; j < N; j++) { const c = x.cls[j]; if (c === undefined) continue; if (c !== 'backlog') type = c; break; }
      const d = { it: x, type, from: x.rank[k - 1], k }; x.exits.push(d); return d;
    });
    steps.push({ moves, arrivals, departures, straight: [] });
  }
  // items that went straight into work without ever sitting in the backlog
  for (const it of all) { if (it.first >= 0) continue; const fk = it.cls.findIndex(c => c !== undefined); if (fk > 0 && it.cls[fk] === 'started') { steps[fk].straight.push(it); it.straight = fk; } }
  const sizes = lists.map(l => l.length), maxSize = Math.max(...sizes);
  const dates = snaps.map(s => s.date);
  const weeks = Math.max((dates[N - 1] - dates[0]) / 864e5 / 7, (N - 1) / 52);
  // section flows
  const S = SECTIONS.length, tot = [...Array(S)].map(() => ({ news: 0, below: 0, above: 0, started: 0, up: 0, down: 0, gone: 0, avg: 0 }));
  const mv = [...Array(S)].map(() => new Array(S).fill(0)), weekly = [...Array(S)].map(() => ({ i: new Array(N).fill(0), o: new Array(N).fill(0) }));
  lists.forEach(l => l.forEach((x, i) => tot[secOf(i + 1)].avg += 1 / N));
  for (let k = 1; k < N; k++) {
    const st = steps[k];
    for (const x of lists[k]) {
      const a = x.rank[k - 1], b = x.rank[k];
      if (!a) { const sb = secOf(b); tot[sb].news++; weekly[sb].i[k]++; continue; }
      const sa = secOf(a), sb = secOf(b);
      if (sa !== sb) { mv[sa][sb]++; weekly[sa].o[k]++; weekly[sb].i[k]++; if (sb < sa) { tot[sa].up++; tot[sb].below++; } else { tot[sa].down++; tot[sb].above++; } }
    }
    for (const d of st.departures) { const s = secOf(d.from); tot[s][d.type === 'started' ? 'started' : 'gone']++; weekly[s].o[k]++; }
  }
  // movement kind per item per step
  const T = MOVE_THRESHOLD;
  const kindAt = (it, k) => { if (k < 1) return 'steady'; if (!it.rank[k - 1]) return 'new'; const d = steps[k].moves.get(it) || 0; return d >= T ? 'up' : d <= -T ? 'down' : 'steady'; };
  // patterns
  const pat = { climbed: [], sank: [], stuck: [], jumped: [], express: [] };
  for (const it of all) {
    const ap = []; for (let k = 0; k < N; k++) if (it.rank[k]) ap.push({ k, p: it.rank[k] / sizes[k], r: it.rank[k] });
    for (const d of it.exits) if (d.type === 'started' && d.from > 10) pat.jumped.push({ it, v: d.from, txt: '#' + d.from });
    if (it.straight) pat.express.push({ it, v: 0, txt: 'direct' });
    else if (it.first > 0) for (const d of it.exits) if (d.type === 'started' && d.k - it.first <= 1) { pat.express.push({ it, v: 1, txt: '#' + d.from }); break; }
    if (ap.length < 2) continue;
    const f = ap[0], l = ap[ap.length - 1];
    if (f.p - l.p >= .35) pat.climbed.push({ it, v: f.p - l.p, txt: '#' + f.r + '→#' + l.r });
    if (l.p - f.p >= .3) pat.sank.push({ it, v: l.p - f.p, txt: '#' + f.r + '→#' + l.r });
    if (it.rank[N - 1] && ap.length >= Math.max(4, .6 * N) && ap.every(a => a.p >= .6)) pat.stuck.push({ it, v: ap.length, txt: ap.length + ' snaps' });
  }
  for (const k in pat) pat[k].sort((a, b) => b.v - a.v);
  const startedFrom = all.flatMap(it => it.exits.filter(d => d.type === 'started').map(d => d.from));
  return { N, items: all, lists, steps, sizes, maxSize, dates, weeks, tot, mv, weekly, kindAt, pat, startedFrom, src };
}
