/* Backlog Currents: the "So what?" calculations.
   Pure functions, no DOM. computeLearn(M) returns the nine cards as data: verdict, headline (HTML with <em>),
   evidence, So what / Try / Ask the team, the items a "Show me" button highlights, and the numbers each card's
   drawing needs (card.d). The drawings themselves live in views/learn.js.
   Thresholds and copy are the prototype's, unchanged. */
import { fmtD } from './format.js?v=2026-10-26';

const DAY7 = 864e5 * 7;
export const median = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
export const percentile = (a, p) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); return b[Math.min(b.length - 1, Math.ceil(p * b.length) - 1)]; };
const P = x => Math.round(x);
const f1 = x => x.toFixed(1);

export const HIGHLIGHT_LABELS = {
  order: 'items started from below rank 10',
  bottom: 'items waiting 12+ weeks',
  unplanned: 'fast-track items',
  recency: 'young picks',
  waste: 'refined-then-dropped items',
  topsrc: 'fast-lane items'
};
export const START_BUCKETS = [[1, 1, '#1'], [2, 2, '#2'], [3, 3, '#3'], [4, 5, '4–5'], [6, 10, '6–10'], [11, 25, '11–25'], [26, 50, '26–50'], [51, 1e9, '51+']];

/* Share of the backlog that moved 3+ places, for each week (index 0 = the week to snapshot 1). */
export function churnSeries(M) {
  const ser = [];
  for (let k = 1; k < M.N; k++) { let c = 0; M.steps[k].moves.forEach(d => { if (Math.abs(d) >= 3) c++; }); ser.push(M.sizes[k] ? c / M.sizes[k] : 0); }
  return ser;
}

export function computeLearn(M) {
  const N = M.N, wk = M.weeks, D = M.dates;
  const sd = M.items.flatMap(it => it.exits.filter(d => d.type === 'started').map(d => ({ ...d, it })));
  const straight = M.items.filter(it => it.straight);
  const gone = M.items.reduce((a, it) => a + it.exits.filter(d => d.type !== 'started').length, 0);
  const starts = sd.length + straight.length;
  const avgSize = M.sizes.reduce((a, b) => a + b, 0) / N, last = M.sizes[N - 1];
  const cards = [];
  const show = {};

  // 1. Order
  {
    const off = sd.filter(d => d.from > 10), t3 = sd.filter(d => d.from <= 3).length, po = sd.length ? 100 * off.length / sd.length : 0, warn = po >= 20;
    show.order = new Set(off.map(d => d.it));
    cards.push({ k: 'order', tag: 'Order', warn,
      hl: warn ? `<em>${P(po)}%</em> of started work came from below rank 10` : `<em>${P(sd.length ? 100 * t3 / sd.length : 0)}%</em> of started work came from the top 3`,
      ev: `${sd.length} items left the backlog into work; the median was at rank ${median(sd.map(d => d.from)) ?? '–'} when picked.`,
      so: warn ? 'The ranking isn’t how work gets chosen. Time spent ordering the backlog buys little, because the real prioritisation happens somewhere else: a meeting, a chat thread or someone’s head.' : 'The order on the backlog is the order work happens. The ranking is doing its job.',
      tr: warn ? 'Look at the items that skipped the queue. If they were dependencies or quick wins, rank them where they belong. If they were escalations, make that route visible and count it.' : 'Keep the top 10 to 15 precisely ordered and stop fussing about exact order below that.',
      ask: 'Who decided to start the items that skipped the queue, and where was that decision made?',
      show: off.length ? 'Show the queue-jumpers' : null,
      d: { counts: START_BUCKETS.map(b => sd.filter(d => d.from >= b[0] && d.from <= b[1]).length) } });
  }
  // 2. Waiting time
  {
    const dep = (sd.length + gone) / wk, little = dep ? avgSize / dep : null;
    const ages = sd.filter(d => d.it.first > 0).map(d => (D[d.k] - D[d.it.first]) / DAY7);
    const p50 = median(ages), p85 = percentile(ages, .85), warn = little != null && little > 8;
    cards.push({ k: 'wait', tag: 'Waiting time', warn,
      hl: little == null ? 'Not enough departures to estimate the wait' : `A new request waits about <em>${f1(little)} weeks</em> on average`,
      ev: `Little’s law: ${P(avgSize)} items in the backlog ÷ ${f1(dep)} leaving per week.${p50 != null ? ` Items added during the period and then started took a median ${f1(p50)} weeks, 85% within ${f1(p85)} weeks.` : ''}`,
      so: warn ? 'Anyone adding a request today should expect a wait of months unless it jumps the queue. By the time it’s picked up the need may have changed, so the work gets re-refined or quietly dropped.' : 'The backlog turns over quickly, so requests don’t go stale while they wait.',
      tr: warn ? 'Give the 85th percentile as the honest answer to “when will we get it?”. To cut the wait, shorten the queue; working faster won’t clear a queue that keeps refilling.' : 'Share the 85th percentile with stakeholders as a service level and keep an eye on it.',
      ask: 'Would the people asking still want these items if they knew the real wait?',
      d: { avgSize, little } });
  }
  // 3. Bottom of the backlog
  {
    const ever = M.items.filter(it => { for (let k = 0; k < N; k++) if (it.rank[k] && it.rank[k] / M.sizes[k] >= .5) return true; return false; });
    const evS = ever.filter(it => it.exits.some(d => d.type === 'started')).length, pb = ever.length ? 100 * evS / ever.length : 0;
    const zomb = M.items.filter(it => it.rank[N - 1] && (D[N - 1] - D[it.first]) / DAY7 >= 12), pz = last ? 100 * zomb.length / last : 0;
    const cap = Math.max(10, Math.round(12 * sd.length / wk)), warn = pb < 25 || pz > 20;
    show.bottom = new Set(zomb);
    cards.push({ k: 'bottom', tag: 'Bottom of the backlog', warn,
      hl: `Only <em>${P(pb)}%</em> of items that dropped into the bottom half were ever started`,
      ev: `${zomb.length} items (${P(pz)}% of today’s backlog) have been waiting 12 weeks or more.`,
      so: warn ? 'The lower half works as storage, not as a plan. Every stored item still costs attention in refinement, implies a promise to whoever asked, and makes the real options harder to see.' : 'Items in the lower half do get picked up, so the whole backlog is a working list.',
      tr: warn ? `Cap the backlog at about three months of work (roughly ${cap} items at your pace) and archive the rest. Anything that matters will come back.` : 'Keep it that way with a regular sweep of anything older than a quarter.',
      ask: 'If we deleted everything below rank 30 tomorrow, what would we actually miss?',
      show: zomb.length ? 'Show the 12-week waiters' : null,
      d: { pb } });
  }
  // 4. Unplanned work
  {
    const fast = sd.filter(d => d.it.first > 0 && d.k - d.it.first <= 1).map(d => d.it), exp = [...straight, ...fast], pu = starts ? 100 * exp.length / starts : 0, warn = pu > 25;
    show.unplanned = new Set(exp);
    cards.push({ k: 'unplanned', tag: 'Unplanned work', warn,
      hl: `<em>${P(pu)}%</em> of started work arrived less than a week before it started`,
      ev: `${straight.length} went straight into work without sitting in the backlog; ${fast.length} more were started within a week of arriving.`,
      so: warn ? 'A real slice of capacity goes to work that never waits in the backlog: bugs, escalations, urgent asks. Planning as if the whole sprint is for backlog items sets the team up to miss.' : 'Most work queues in the backlog before it starts, so plans built from the backlog should hold.',
      tr: warn ? `Reserve about ${P(pu)}% of capacity for unplanned work, and track where it comes from: the last release, one stakeholder, one system?` : 'Keep tracking it. A rising share is an early sign of quality or stakeholder problems.',
      ask: 'Which of these urgent items could we have seen coming?',
      show: exp.length ? 'Show the fast-track items' : null,
      d: { pu } });
  }
  // 5. Re-prioritisation
  {
    const ser = churnSeries(M); let sum = 0, peak = 1, pv = 0;
    ser.forEach((v, i) => { sum += v; if (v > pv) { pv = v; peak = i + 1; } });
    const avg = 100 * sum / (N - 1), warn = avg > 12; show.churnWeek = peak;
    cards.push({ k: 'churn', tag: 'Re-prioritisation', warn,
      hl: `<em>${P(avg)}%</em> of the backlog moves 3+ places in a typical week`,
      ev: `The biggest reshuffle was the week to ${fmtD(D[peak], true)}, when ${P(100 * pv)}% of items moved.`,
      so: warn ? 'Frequent re-ranking costs time and tells the team priorities aren’t stable. It might be healthy responsiveness, or noise from whoever spoke last.' : 'Priorities are mostly stable week to week, with re-ranking happening in deliberate bursts.',
      tr: 'Check whether the big reshuffles line up with planning or strategy changes. If they don’t, agree when re-prioritisation happens and what is allowed to trigger it.',
      ask: `What changed in the week to ${fmtD(D[peak])}?`,
      show: 'Jump to that week',
      d: { ser, peak, pv, from: fmtD(D[1]), to: fmtD(D[N - 1]) } });
  }
  // 6. Balance
  {
    const arr = M.tot.reduce((a, o) => a + o.news, 0) / wk, st = sd.length / wk, rm = gone / wk, net = (last - M.sizes[0]) / wk, runway = st ? last / st : null, warn = net > 0.2 || (runway != null && runway > 16);
    cards.push({ k: 'balance', tag: 'Balance', warn,
      hl: net > 0.2 ? `The backlog grows by <em>${f1(net)} items</em> a week` : net < -0.2 ? `The backlog shrinks by <em>${f1(-net)} items</em> a week` : `Arrivals and departures are <em>in balance</em>`,
      ev: `${f1(arr)} arrive per week; ${f1(st)} are started and ${f1(rm)} removed. At the current pace the backlog holds ${runway == null ? '–' : P(runway)} weeks of work.`,
      so: net > 0.2 ? 'When more comes in than goes out, the queue and the wait grow without limit. No improvement in team speed catches up with that.' : runway != null && runway > 16 ? 'Inflow is under control, but the backlog already holds more work than the team will reach for months, so most of it is speculative.' : 'Inflow matches what the team can take on, so the wait stays predictable.',
      tr: net > 0.2 || runway > 16 ? 'Make “no” and “not now” normal outcomes of intake, and remove items as readily as you add them.' : 'Keep an explicit intake policy so the balance survives a busy quarter.',
      ask: 'What has to be true before an item is allowed onto the backlog, and who decides?',
      d: { arr, st, rm, runway } });
  }
  // 7. Recency bias
  {
    const age = (it, k) => (D[k] - D[Math.max(0, it.first)]) / DAY7;
    const ev = [];
    for (const d of sd) {
      if (d.it.first < 0) continue; const k = d.k - 1, lim = Math.max(10, d.from), me = age(d.it, k);
      const peers = M.lists[k].slice(0, lim).filter(x => x !== d.it); if (peers.length < 3) continue;
      const older = peers.reduce((a, x) => { const g = age(x, k); return a + (g > me ? 1 : g === me ? .5 : 0); }, 0) / peers.length;
      ev.push({ it: d.it, older });
    }
    const avg = ev.length ? 100 * ev.reduce((a, e) => a + e.older, 0) / ev.length : 50, young = ev.filter(e => e.older >= .75), warn = avg > 62;
    show.recency = new Set(young.map(e => e.it));
    cards.push({ k: 'recency', tag: 'Recency bias', warn,
      hl: `Started items were younger than <em>${P(avg)}%</em> of the items ranked around them`,
      ev: `Compared with the other items in the top 10 (or as deep as the pick) at the moment each was started. ${young.length} of ${ev.length} starts were younger than three-quarters of their neighbours. 50% would mean age plays no part.`,
      so: warn ? 'Newer items are winning over older ones of similar priority. That is last in, first out wearing the clothes of prioritisation: whatever was asked for most recently feels most important, and older requests quietly lose.' : 'Age doesn’t decide what gets picked; similar-priority items get started regardless of when they arrived.',
      tr: warn ? 'When two items are close in value, prefer the older one, or score cost of delay explicitly so “recent” and “urgent” stop being confused.' : 'Keep it that way. Scoring cost of delay helps if this starts to drift.',
      ask: 'Is the newest request really the most valuable, or just the freshest in our minds?',
      show: young.length ? 'Show the young picks' : null,
      d: { avg } });
  }
  // 8. Refinement waste
  {
    const RX = /approved|refined|ready|groomed|selected|estimated|committed to/;
    const hasRef = M.items.some(it => it.st.some((x, k) => x && it.rank[k] && RX.test(x)));
    const reached = M.items.filter(it => { for (let k = 0; k < N; k++) { if (!it.rank[k]) continue; if (hasRef ? RX.test(it.st[k] || '') : it.rank[k] <= 10) return true; } return false; });
    const started = reached.filter(it => it.exits.some(d => d.type === 'started') || it.straight);
    const dropped = reached.filter(it => !started.includes(it) && it.exits.some(d => d.type !== 'started') && !it.rank[N - 1]);
    const sank = reached.filter(it => !started.includes(it) && it.rank[N - 1] && it.rank[N - 1] / last >= .5);
    const waste = [...dropped, ...sank], pw = reached.length ? 100 * waste.length / reached.length : 0, warn = pw > 15;
    const lab = hasRef ? 'refined' : 'top-10';
    show.waste = new Set(waste);
    cards.push({ k: 'waste', tag: 'Refinement waste', warn,
      hl: `<em>${P(pw)}%</em> of ${lab} items were dropped or left to sink`,
      ev: `Of ${reached.length} items that ${hasRef ? 'reached a refined state (e.g. Approved)' : 'made the top 10'}, ${started.length} were started, ${dropped.length} were removed or left, and ${sank.length} have sunk into the bottom half.${hasRef ? '' : ' No refined state was found, so reaching the top 10 is used instead.'}`,
      so: warn ? 'Refinement is expensive: conversations, estimates, acceptance criteria. Every refined item that never ships is effort spent on work that doesn’t happen, and a sign the team refines too far ahead of what it can take on.' : 'Refined items mostly turn into delivered work, so refinement effort is well spent.',
      tr: warn ? `Refine just in time: keep only about two sprints of refined work ready (roughly ${Math.max(4, Math.round(2 * sd.length / wk * 2))} items) and refine the rest when it gets close.` : 'Keep the refined buffer small so this stays true as priorities shift.',
      ask: 'How far ahead do we refine, and what did we learn from the items we refined and never built?',
      show: waste.length ? 'Show the wasted refinement' : null,
      d: { reached: reached.length, started: started.length, dropped: dropped.length, sank: sank.length, lab } });
  }
  // 9. How work reaches the top
  {
    const t = M.tot[0], into = t.news + t.below, pn = into ? 100 * t.news / into : 0, warn = pn > 40;
    const direct = M.items.filter(it => it.first > 0 && it.rank[it.first] <= 10);
    show.topsrc = new Set([...direct, ...straight]);
    cards.push({ k: 'topsrc', tag: 'How work reaches the top', warn,
      hl: warn ? `<em>${P(pn)}%</em> of items entering the top 10 were brand new` : `<em>${P(100 - pn)}%</em> of items reach the top 10 by climbing`,
      ev: `${f1(t.below / wk)} promoted into the top 10 per week vs ${f1(t.news / wk)} landing there on arrival, plus ${straight.length} that skipped the backlog entirely.`,
      so: warn ? 'The backlog is a parking lot with a fast lane. Work that matters arrives late and goes straight to the front, while the rest of the list waits to be overtaken.' : 'The backlog works as a pipeline: items enter lower down and get promoted as they become the right thing to do next.',
      tr: warn ? 'Separate the fast lane explicitly (an expedite class of service with a limit) and stop ranking the rest of the list as if it competes with it.' : 'Watch the fast lane. If new arrivals start landing on top more often, ask why the pipeline isn’t anticipating them.',
      ask: 'Why do so many items go straight to the top: poor anticipation, or a list that mostly never matters?',
      show: show.topsrc.size ? 'Show the fast-lane items' : null,
      d: { news: t.news / wk, below: t.below / wk, rawNews: t.news, rawBelow: t.below } });
  }
  // "Worth a conversation" first, "Looks healthy" after (stable within each group)
  cards.sort((a, b) => (b.warn ? 1 : 0) - (a.warn ? 1 : 0));
  return { cards, show };
}

/* Headline numbers for the Arrivals and departures section. */
export function flowStats(M) {
  const wk = M.weeks, T = M.tot, sum = k => T.reduce((a, o) => a + o[k], 0);
  const straight = M.steps.reduce((a, s) => a + s.straight.length, 0);
  return {
    straight,
    newTotal: sum('news'), goneTotal: sum('gone'),
    arriving: sum('news') / wk,
    started: (sum('started') + straight) / wk,
    gone: sum('gone') / wk,
    net: (M.sizes[M.N - 1] - M.sizes[0]) / wk
  };
}
