// Unit tests for Backlog Currents' pure functions. Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCSV, parseDate, buildSource, iso } from '../assets/js/backlog-currents/csv.js';
import { buildModel, secOf } from '../assets/js/backlog-currents/model.js';
import { exampleCSV } from '../assets/js/backlog-currents/example.js';
import { computeLearn, flowStats, median, percentile } from '../assets/js/backlog-currents/insights.js';

const file = (name, text, lastModified) => ({ name, text, lastModified });
const ids = list => list.map(it => it.id);

/* ---------- parseCSV ---------- */
test('parseCSV handles quotes, doubled quotes, newlines in fields, CRLF and a BOM', () => {
  const rows = parseCSV('\uFEFFID,Title\r\n1,"Hello, world"\r\n2,"Say ""hi""\nthere"\r\n\r\n');
  assert.deepEqual(rows, [['ID', 'Title'], ['1', 'Hello, world'], ['2', 'Say "hi"\nthere']]);
});

test('parseCSV detects semicolon and tab delimiters', () => {
  assert.deepEqual(parseCSV('ID;Title;Rank\n1;A, still A;2'), [['ID', 'Title', 'Rank'], ['1', 'A, still A', '2']]);
  assert.deepEqual(parseCSV('ID\tTitle\n7\tB'), [['ID', 'Title'], ['7', 'B']]);
});

/* ---------- parseDate ---------- */
test('parseDate reads the supported formats as UTC midnight', () => {
  assert.equal(iso(parseDate('2026-10-19')), '2026-10-19');
  assert.equal(iso(parseDate('2026-10-19T14:30:00Z')), '2026-10-19');
  assert.equal(iso(parseDate('19-Oct-2026')), '2026-10-19');
  assert.equal(iso(parseDate('19/Oct/26')), '2026-10-19');
  assert.equal(iso(parseDate('19/10/2026')), '2026-10-19'); // day first
  assert.equal(iso(parseDate('10/19/2026')), '2026-10-19'); // month first when the second part is over 12
  assert.equal(parseDate(''), null);
  assert.equal(parseDate('not a date'), null);
});

/* ---------- buildSource ---------- */
test('ADO multi-file import: snapshots dated from the file names, ranked by Backlog Priority', () => {
  const head = 'ID,Work Item Type,Title,State,Backlog Priority\n';
  const src = buildSource([
    file('backlog-2026-10-19.csv', head + '2,User Story,Two,Approved,2000\n1,Bug,One,New,1000\n'),
    file('backlog-2026-10-12.csv', head + '1,Bug,One,New,1000\n2,User Story,Two,New,3000\n3,User Story,Three,New,2000\n')
  ]);
  assert.equal(src.snaps.length, 2);
  assert.deepEqual(src.snaps.map(s => iso(s.date)), ['2026-10-12', '2026-10-19']); // sorted, whatever the file order
  assert.ok(src.hasRank && src.rankNumeric && src.hasState);
  assert.deepEqual([...src.used.rank], ['Backlog Priority']);
  const M = buildModel(src);
  assert.deepEqual(ids(M.lists[0]), ['1', '3', '2']);
  assert.deepEqual(ids(M.lists[1]), ['1', '2']);
  assert.equal(M.items.find(i => i.id === '2').type, 'User Story');
});

test('falls back to the file modified date when there is no date column or dated name', () => {
  const src = buildSource([
    file('a.csv', 'ID,Title\n1,A\n', Date.UTC(2026, 9, 5, 15)),
    file('b.csv', 'ID,Title\n1,A\n', Date.UTC(2026, 9, 12, 9))
  ]);
  assert.deepEqual(src.snaps.map(s => iso(s.date)), ['2026-10-05', '2026-10-12']);
  assert.equal(src.hasRank, false);
});

test('a single history file with a Date column gives one snapshot per date', () => {
  const src = buildSource([file('history.csv',
    'Date,ID,Title,State,Rank\n2026-10-12,1041,Size filter,Approved,1\n2026-10-12,1052,Search synonyms,New,2\n' +
    '2026-10-19,1052,Search synonyms,Approved,1\n2026-10-19,1041,Size filter,Active,\n2026-10-19,1060,Duplicate products,New,2\n')]);
  assert.equal(src.snaps.length, 2);
  assert.deepEqual(src.snaps.map(s => s.rows.length), [2, 3]);
  const M = buildModel(src);
  assert.deepEqual(ids(M.lists[1]), ['1052', '1060']); // 1041 is Active, so no longer in the backlog
  assert.equal(M.steps[1].departures[0].type, 'started');
});

test('Jira lexorank values sort as strings, not as numbers', () => {
  const head = 'Issue key,Summary,Status,Rank\n';
  const src = buildSource([
    file('jira-2026-10-12.csv', head + 'ABC-1,One,To Do,0|i0004b:\nABC-2,Two,To Do,0|i0001z:\nABC-3,Three,To Do,0|hzzzzz:\n'),
    file('jira-2026-10-19.csv', head + 'ABC-1,One,To Do,0|i0000a:\nABC-2,Two,To Do,0|i0001z:\nABC-3,Three,To Do,0|hzzzzz:\n')
  ]);
  assert.equal(src.rankNumeric, false);
  const M = buildModel(src);
  assert.deepEqual(ids(M.lists[0]), ['ABC-3', 'ABC-2', 'ABC-1']);
  assert.deepEqual(ids(M.lists[1]), ['ABC-3', 'ABC-1', 'ABC-2']);
});

test('Jira export without a rank column uses row order', () => {
  const head = 'Issue key,Summary,Status\n';
  const M = buildModel(buildSource([
    file('2026-10-12.csv', head + 'X-9,A,To Do\nX-1,B,To Do\n'),
    file('2026-10-19.csv', head + 'X-1,B,To Do\nX-9,A,To Do\n')
  ]));
  assert.deepEqual(ids(M.lists[0]), ['X-9', 'X-1']);
  assert.deepEqual(ids(M.lists[1]), ['X-1', 'X-9']);
});

test('a semicolon-delimited file imports like a comma one', () => {
  const src = buildSource([file('export.csv',
    'Date;ID;Title;State;Backlog Priority\n2026-10-12;1;One, really;New;10\n2026-10-12;2;Two;New;20\n2026-10-19;2;Two;New;5\n2026-10-19;1;One, really;New;10\n')]);
  const M = buildModel(src);
  assert.equal(M.N, 2);
  assert.equal(M.items.find(i => i.id === '1').title, 'One, really');
  assert.deepEqual(ids(M.lists[1]), ['2', '1']);
});

test('missing ID column: the error names the file and lists the columns found', () => {
  assert.throws(() => buildSource([file('bad.csv', 'Name,Status,Rank\nA,New,1\n')]),
    { message: 'bad.csv: no ID column found. Columns: Name, Status, Rank' });
});

test('unreadable date: the error quotes the value and row', () => {
  assert.throws(() => buildSource([file('h.csv', 'Date,ID\n2026-10-12,1\nsoon,2\n')]),
    { message: 'h.csv: couldn\'t read the date “soon” on row 3.' });
});

test('only one snapshot is an error that explains what to add', () => {
  assert.throws(() => buildSource([file('backlog-2026-10-19.csv', 'ID,Title\n1,A\n2,B\n')]),
    { message: 'Found only one snapshot (2026-10-19). Add exports from at least two dates, or one file with a date column.' });
});

test('state chips: unknown states count as backlog; started and removed states do not', () => {
  const src = buildSource([file('h.csv', 'Date,ID,State\n2026-10-12,1,New\n2026-10-12,2,Parked\n2026-10-19,1,Active\n2026-10-19,2,Removed\n')]);
  assert.deepEqual([...src.backlog].sort(), ['new', 'parked']);
  assert.deepEqual(src.states.map(s => s.key).sort(), ['active', 'new', 'parked', 'removed']);
});

/* ---------- buildModel ---------- */
test('departures are typed as started, removed or left', () => {
  const M = buildModel(buildSource([file('h.csv',
    'Date,ID,Title,State,Rank\n' +
    '2026-10-05,A,a,New,1\n2026-10-05,B,b,New,2\n2026-10-05,C,c,New,3\n2026-10-05,D,d,New,4\n' +
    '2026-10-12,A,a,Committed,\n2026-10-12,B,b,Removed,\n2026-10-12,D,d,New,1\n' + // C simply vanishes
    '2026-10-19,D,d,New,1\n2026-10-19,E,e,In Progress,\n')])); // E never sat in the backlog
  const types = Object.fromEntries(M.steps[1].departures.map(d => [d.it.id, d.type]));
  assert.deepEqual(types, { A: 'started', B: 'removed', C: 'left' });
  assert.equal(M.steps[1].departures.find(d => d.it.id === 'C').from, 3);
  assert.deepEqual(ids(M.steps[2].straight), ['E']);
  assert.deepEqual(M.startedFrom, [1]);
  // section flows: two exits from Top as gone, one started
  assert.equal(M.tot[0].started, 1);
  assert.equal(M.tot[0].gone, 2);
});

test('a departure is typed by the next state seen, even if it reappears later', () => {
  const M = buildModel(buildSource([file('h.csv',
    'Date,ID,State,Rank\n2026-10-05,A,New,1\n2026-10-05,Z,New,2\n2026-10-12,Z,New,1\n2026-10-19,A,Removed,\n2026-10-19,Z,New,1\n')]));
  assert.equal(M.steps[1].departures[0].type, 'removed'); // A missing on 12 Oct, Removed on 19 Oct
});

test('"moved" is measured against continuing items only, with a threshold of 3', () => {
  // Top items 1-3 leave; everyone else shifts up 3 places but has not been re-prioritised.
  const prev = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
  const cur = ['d', 'e', 'f', 'j', 'g', 'h', 'i']; // j jumps 3 places among the continuing items
  const rows = ['Date,ID,State,Rank'];
  prev.forEach((id, i) => rows.push(`2026-10-05,${id},New,${i + 1}`));
  cur.forEach((id, i) => rows.push(`2026-10-12,${id},New,${i + 1}`));
  ['a', 'b', 'c'].forEach(id => rows.push(`2026-10-12,${id},Active,`));
  const M = buildModel(buildSource([file('h.csv', rows.join('\n'))]));
  const item = id => M.items.find(i => i.id === id);
  assert.equal(M.steps[1].moves.get(item('d')), 0);
  assert.equal(M.steps[1].moves.get(item('j')), 3);
  assert.equal(M.steps[1].moves.get(item('g')), -1);
  assert.equal(M.kindAt(item('j'), 1), 'up');
  assert.equal(M.kindAt(item('d'), 1), 'steady');
  assert.equal(M.kindAt(item('g'), 1), 'steady');
});

test('rates are per week using the real dates', () => {
  const M = buildModel(buildSource([file('h.csv', 'Date,ID,State,Rank\n2026-10-05,A,New,1\n2026-10-19,A,New,1\n2026-10-19,B,New,2\n')]));
  assert.equal(M.weeks, 2);
  assert.equal(flowStats(M).arriving, 0.5);
});

test('sections: Top 1–10, Next up 11–25, Middle 26–50, Deep 51+', () => {
  assert.deepEqual([1, 10, 11, 25, 26, 50, 51, 400].map(secOf), [0, 0, 1, 1, 2, 2, 3, 3]);
});

/* ---------- example data ---------- */
test('the example produces 20 weekly snapshots, the same every time', () => {
  const csv = exampleCSV();
  assert.equal(csv, exampleCSV());
  const src = buildSource([file('example-ado-backlog.csv', csv)]);
  assert.equal(src.snaps.length, 20);
  assert.equal(iso(src.snaps[0].date), '2026-06-08');
  assert.equal(iso(src.snaps[19].date), '2026-10-19');
  const M = buildModel(src);
  assert.equal(M.weeks, 19);
  assert.ok(M.items.length > 100);
  assert.ok(M.steps.some(s => s.straight.length > 0), 'P1 bugs go straight into work');
  assert.ok(M.steps[14].departures.filter(d => d.type === 'removed').length >= 8, 'the grooming session in week 14');
});

/* ---------- "So what?" calculations ---------- */
test('median and percentile helpers', () => {
  assert.equal(median([]), null);
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], .85), 9);
});

test('computeLearn returns the nine cards, "worth a conversation" first', () => {
  const M = buildModel(buildSource([file('e.csv', exampleCSV())]));
  const { cards, show } = computeLearn(M);
  assert.deepEqual(cards.map(c => c.tag).sort(), ['Balance', 'Bottom of the backlog', 'How work reaches the top', 'Order', 'Re-prioritisation', 'Recency bias', 'Refinement waste', 'Unplanned work', 'Waiting time'].sort());
  const firstHealthy = cards.findIndex(c => !c.warn);
  if (firstHealthy >= 0) assert.ok(cards.slice(firstHealthy).every(c => !c.warn));
  for (const c of cards) for (const k of ['hl', 'ev', 'so', 'tr', 'ask']) assert.ok(c[k] && typeof c[k] === 'string', `${c.k}.${k}`);
  assert.ok(show.churnWeek >= 1 && show.churnWeek < M.N);
  assert.ok(show.order instanceof Set && show.order.size > 0, 'the example has queue-jumpers');
});

test('Order card: thresholds and highlighted items', () => {
  // 1 of 2 starts from below rank 10 = 50% → warn
  const rows = ['Date,ID,State,Rank'];
  for (let i = 1; i <= 12; i++) rows.push(`2026-10-05,I${i},New,${i}`);
  for (let i = 2; i <= 11; i++) rows.push(`2026-10-12,I${i},New,${i - 1}`);
  rows.push('2026-10-12,I1,Active,', '2026-10-12,I12,Active,');
  const M = buildModel(buildSource([file('h.csv', rows.join('\n'))]));
  const { cards, show } = computeLearn(M);
  const order = cards.find(c => c.k === 'order');
  assert.equal(order.warn, true);
  assert.match(order.hl, /<em>50%<\/em> of started work came from below rank 10/);
  assert.deepEqual([...show.order].map(i => i.id), ['I12']);
  const wait = cards.find(c => c.k === 'wait');
  assert.match(wait.ev, /Little’s law: 11 items in the backlog ÷ 2\.0 leaving per week\./);
});

test('numeric ranks with thousands separators and decimals sort as numbers', () => {
  const src = buildSource([file('h.csv', 'Date,ID,Stack Rank\n2026-10-05,A,"1,500.5"\n2026-10-05,B,999\n2026-10-05,C,1e3\n2026-10-12,A,1\n2026-10-12,B,2\n')]);
  assert.equal(src.rankNumeric, true);
  assert.deepEqual(ids(buildModel(src).lists[0]), ['B', 'C', 'A']);
});

/* ---------- the downloadable skill ---------- */
test('the skill build bundles the modules into one page that runs', async () => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const out = join(mkdtempSync(join(tmpdir(), 'bc-')), 'template.html');
  try { execFileSync('python3', ['tools/build_backlog_currents_skill.py', '--template', out], { stdio: 'pipe' }); }
  catch (e) { if (e.code === 'ENOENT') return; throw e; } // no Python here: skip
  const html = readFileSync(out, 'utf8');
  assert.ok(html.includes('<script type="text/csv" id="bc-data" data-name="" data-label="" data-example="0">'));
  for (const gone of ['class="site"', 'track.js', 'menu.js', 'type="module"', 'id="skill"']) assert.ok(!html.includes(gone), gone);
  const js = html.split('<script>\n').pop().split('\n</script>')[0];
  assert.doesNotThrow(() => new Function(js), 'bundle parses');
  assert.match(js, /M\['csv\.js'\] = \(\(\) => \{/);
});
