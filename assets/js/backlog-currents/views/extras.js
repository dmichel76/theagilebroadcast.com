/* Backlog Currents: "Where started work came from" histogram and the About panel. */
import { esc, fmtD } from '../format.js?v=2026-10-26b';
import { START_BUCKETS } from '../insights.js?v=2026-10-26b';

export function renderHist(el, M) {
  const hc = START_BUCKETS.map(b => M.startedFrom.filter(r => r >= b[0] && r <= b[1]).length), hm = Math.max(1, ...hc);
  el.innerHTML = START_BUCKETS.map((b, i) => `<div class="hrow"><span class="rl">#${b[2].replace('#', '')}</span><span class="hb"><i style="width:${100 * hc[i] / hm}%;background:${b[0] > 10 ? 'var(--down)' : 'var(--accent)'}"></i></span><span class="hc">${hc[i]}</span></div>`).join('');
}

export function renderAbout(el, M, isExample) {
  const total = M.startedFrom.length, deep = M.startedFrom.filter(r => r > 10).length, src = M.src;
  el.innerHTML = `<h2>${isExample ? 'About the example' : 'About this data'}</h2>
    <div class="about-body">
    ${isExample
      ? `<p>A made-up browse team’s Azure DevOps backlog, exported every Monday from ${fmtD(M.dates[0], true)} to ${fmtD(M.dates[M.N - 1], true)}. Things to look for: a stakeholder escalation that jumps the queue (20 Jul), a mid-quarter re-plan that lifts Search and Performance work (17 Aug), a grooming session that clears old items (14 Sep), P1 bugs going straight into work, and sprint planning every other week.</p>`
      : `<p>${src.files.length} file${src.files.length > 1 ? 's' : ''}, ${M.N} snapshots, ${M.items.length} items. Rank from <b>${src.hasRank ? esc([...src.used.rank][0]) : 'row order'}</b>${src.hasState ? `, states from <b>${esc([...src.used.state][0])}</b>` : ', no state column, so every departure counts as removed or left'}.</p>`}
    <p><b>${total ? Math.round(100 * deep / total) : 0}%</b> of started work (${deep} of ${total}) came from below rank 10.</p></div>`;
}
