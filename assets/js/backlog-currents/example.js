/* Backlog Currents: the built-in example.
   A seeded generator: 20 weekly Azure DevOps snapshots of a made-up browse team's backlog (8 Jun to 19 Oct 2026).
   Same seed and logic as the prototype, so the same example every time. Things it contains on purpose:
   a stakeholder escalation that jumps the queue (week 6), a mid-quarter re-plan (week 10), a grooming session (week 14),
   P1 bugs going straight into work, and sprint planning every other week. */
import { iso } from './csv.js?v=2026-10-26';

export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const THEMES = {
  Search: ['Search: handle plurals in query matching','Search: synonyms for footwear terms','Zero-results page: suggest related categories','Autocomplete: show recent searches','Search: boost in-stock items','Search: typo tolerance for brand names','Visual search spike','Search: track query reformulations','Search results: sticky filter bar','Autocomplete: category suggestions','Search: understand colour words','Search relevance A/B test harness'],
  Filters: ['Size filter: remember my size','Filters: product counts per facet','Price slider on mobile web','Multi-select colour filter','Filters: clear-all button on iOS','Filter by delivery speed','Filters: collapse long facet lists','Filter chips above results','Fit filter (petite, tall, plus)','Filters: sustainable materials facet','Fix facet order inconsistency','Filter state in shareable URL'],
  Listing: ['PLP: infinite scroll vs pagination test','Sort by newest on sale pages','PLP: low-in-stock badge','Lazy-load images below the fold','PLP: 3-up grid option on mobile','Back-to-top button on long lists','PLP: promo tile slot','Recently viewed rail on PLP','PLP: video on hover','PLP: product count in header','Sale price formatting by locale','PLP skeleton loading state'],
  Navigation: ['Mega menu: Brands column','Breadcrumbs on category pages','Mobile nav: recent categories','Brand A–Z page','Category landing page template','Nav: seasonal campaign entry','Deep links from app nav','Nav analytics events','Simplify footer links','Nav: personalised category order'],
  Performance: ['Cut PLP JS bundle by 20%','Image CDN: serve AVIF','Cache facet counts','Preload first row of images','Reduce layout shift on product tiles','Page-weight budget alerts in CI','Server-side render filters','Speed up search API p95','Remove unused tracking scripts','Edge caching for category pages'],
  Accessibility: ['Keyboard navigation for filters','Screen-reader labels on product tiles','Colour contrast on sale badges','Focus order in mega menu','Reduced-motion support for carousels','Accessible price slider','Announce result count changes','Alt text for campaign banners'],
  Tiles: ['Tile: colour swatches','Tile: save-for-later animation','Tile: second image on hover','Tile: more-colours indicator','Tile: rating stars','Tile: delivery estimate','Tile: sponsored label','Tile: price-drop badge']
};
const BUGS = ['Sort resets after back navigation','Size filter shows sold-out sizes','Duplicate products on page 2','Price shows £0.00 for some variants','Search errors on emoji input','iOS filter sheet won’t close','Wrong currency on FR site','Images stretched on Android tablets','Facet counts off by one','Autocomplete lags on slow 3G','Breadcrumbs missing on brand pages','Infinite scroll loads same page twice','Sale badge on full-price items','Wishlist heart state not synced','Category page 500 on empty filter','hreflang tags missing','Back-to-top overlaps chat button','Colour filter ignores multi','PLP blank in Safari 17','Filter clicks double-counted in analytics','Search results ignore locale','Tile image flickers on hover','Mega menu stuck open on touch','Price slider max wrong in sale'];

export const EXAMPLE_FILE_NAME = 'example-ado-backlog.csv';

export function exampleCSV() {
  const rng = mulberry32(20261026);
  const nrm = () => { let u = 0; while (!u) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); };
  const pois = l => { const L = Math.exp(-l); let k = 0, q = 1; do { k++; q *= rng(); } while (q > L); return k - 1; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pools = {}; for (const t in THEMES) pools[t] = shuffle(THEMES[t]); const bugPool = shuffle(BUGS);
  const tnames = Object.keys(THEMES);
  const title = (th) => { if (pools[th].length) return pools[th].pop(); const b = THEMES[th][Math.floor(rng() * THEMES[th].length)]; return b + ' (' + ['iOS','Android','web'][Math.floor(rng() * 3)] + ')'; };
  let id = 178040; const live = []; const W = 19;
  const mk = (born, bug, score, step) => {
    id += step; const th = tnames[Math.floor(rng() * tnames.length)];
    const r = rng(); const drift = r < .12 ? .05 + rng() * .06 : r < .24 ? -(.04 + rng() * .06) : 0;
    return { id, born, bug, theme: bug ? 'Bug' : th, title: bug ? (bugPool.pop() || 'Fix regression on listing page') : title(th), score, drift };
  };
  for (let i = 0; i < 54; i++) { const it = mk(-Math.floor((54 - i) / 2.5), rng() < .1, nrm(), 5 + Math.floor(rng() * 50)); live.push(it); }
  shuffle(live.map((x, i) => i)).slice(0, 7).forEach(i => { live[i].score = -2.3 - rng() * .6; live[i].drift = 0; live[i].theme = live[i].bug ? 'Bug' : live[i].theme; });
  const rows = [];
  const dstr = k => iso(new Date(Date.UTC(2026, 5, 8 + 7 * k)));
  const prio = s => Math.round(1e9 - s * 1e8);
  const write = (k, extra) => {
    live.sort((a, b) => b.score - a.score);
    live.forEach((it, i) => rows.push([dstr(k), it.id, it.bug ? 'Bug' : 'User Story', it.title, i < 18 ? 'Approved' : 'New', prio(it.score), it.theme]));
    for (const [it, st] of extra) rows.push([dstr(k), it.id, it.bug ? 'Bug' : 'User Story', it.title, st, prio(it.score), it.theme]);
  };
  write(0, []);
  for (let k = 1; k <= W; k++) {
    for (const it of live) it.score += it.drift + nrm() * .07;
    if (k === 10) for (const it of live) { const b = { Search: 1.3, Performance: 1.0, Accessibility: -1.1, Navigation: -.6 }[it.theme] || 0; it.score += b * (.7 + rng() * .6); }
    live.sort((a, b) => b.score - a.score);
    const top = live[0].score;
    if (k === 6 && live.length > 40) { const e = live[38]; e.score = top + .9; e.drift = 0; }
    for (let j = pois(3.7); j > 0; j--) { const it = mk(k, false, -.7 + nrm() * .85, 8 + Math.floor(rng() * 30)); live.push(it); }
    for (let j = pois(1.1); j > 0; j--) { const p1 = rng() < .3; const it = mk(k, true, p1 ? top + 1 + rng() : .5 + nrm() * .6, 8 + Math.floor(rng() * 30)); it.p1 = p1; live.push(it); }
    live.sort((a, b) => b.score - a.score);
    const extra = [];
    const take = idx => { const it = live.splice(idx, 1)[0]; extra.push([it, 'Committed']); };
    for (let i = live.length - 1; i >= 0; i--) if (live[i].p1 && live[i].born === k) take(i);
    if (k % 2 === 1) { let n = 6 + Math.floor(rng() * 3); while (n-- > 0 && live.length) { take(rng() < .15 ? Math.min(live.length - 1, 10 + Math.floor(rng() * 18)) : 0); } }
    else { let n = pois(.7); while (n-- > 0 && live.length) take(0); }
    const n = live.length; let rm = [];
    if (k === 14) rm = live.slice(Math.floor(n * .65)).sort((a, b) => a.born - b.born).slice(0, 8);
    else live.forEach((it, i) => { if (k - it.born > 10 && i > n * .66 && rng() < .025) rm.push(it); });
    for (const it of rm) { live.splice(live.indexOf(it), 1); extra.push([it, 'Removed']); }
    write(k, extra);
  }
  const q = v => /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
  return ['Snapshot Date,ID,Work Item Type,Title,State,Backlog Priority,Tags', ...rows.map(r => r.map(q).join(','))].join('\n');
}

/* The small CSV behind "Copy a sample CSV": the single-history-file format. */
export const SAMPLE_HISTORY_CSV = 'Date,ID,Title,State,Rank\n2026-10-12,1041,Size filter: remember my size,Approved,1\n2026-10-12,1052,Search: synonyms for footwear terms,New,2\n2026-10-19,1052,Search: synonyms for footwear terms,Approved,1\n2026-10-19,1041,Size filter: remember my size,Active,\n2026-10-19,1060,Bug: duplicate products on page 2,New,2\n';
