/* Backlog Currents: page wiring. Import (drop zone, file picker, state chips), playback, highlights and rendering.
   Files are read with File.text() in this browser; nothing is uploaded, sent or stored. */
import { buildSource, REMOVED_ST } from './csv.js?v=2026-10-26b';
import { buildModel } from './model.js?v=2026-10-26b';
import { exampleCSV, EXAMPLE_FILE_NAME, SAMPLE_HISTORY_CSV } from './example.js?v=2026-10-26b';
import { computeLearn, HIGHLIGHT_LABELS } from './insights.js?v=2026-10-26b';
import { esc, fmtD } from './format.js?v=2026-10-26b';
import { createPlayer } from './views/player.js?v=2026-10-26b';
import { renderFlow, renderFlowStats } from './views/flow.js?v=2026-10-26b';
import { renderLearnCards } from './views/learn.js?v=2026-10-26b';
import { renderHist, renderAbout } from './views/extras.js?v=2026-10-26b';

const $ = s => document.querySelector(s);
const root = $('#bc');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(hover: none)').matches;
const track = (name, data) => { try { window.umami && window.umami.track(name, data); } catch (_) {} };

// shared state, read by the views
const S = { M: null, SRC: null, t: 0, playing: false, speed: 1, lastTs: 0, dirty: true, hover: null, selected: null, patSet: null, learnKey: null, isExample: true, learn: null };

const player = createPlayer(S, {
  root, canvas: $('#col'), board: $('#board'), tip: $('#tip'), detail: $('#detail'),
  side: { lab: $('#nowlab'), date: $('#nowdate'), notable: $('#notable'),
    n: { new: $('#c-new'), started: $('#c-started'), up: $('#c-up'), down: $('#c-down'), gone: $('#c-gone'), size: $('#c-size') } }
});

/* ---------- rendering ---------- */
function renderAnalysis() {
  renderFlowStats($('#fstats'), S.M);
  renderFlow($('#flow'), S.M);
  S.learn = computeLearn(S.M);
  renderLearnCards($('#learn'), S.learn.cards, S.learnKey);
  renderHist($('#hist'), S.M);
  renderAbout($('#about'), S.M, S.isExample);
}
new ResizeObserver(() => { if (S.M) renderFlow($('#flow'), S.M); }).observe($('#flow'));

function renderStates() {
  const el = $('#states'), SRC = S.SRC;
  if (!SRC.hasState || !SRC.states.length) { el.hidden = true; return; }
  el.hidden = false;
  el.innerHTML = `<span>Counted as backlog:</span>` + SRC.states.map(x => `<button class="chip" type="button" data-k="${esc(x.key)}" aria-pressed="${SRC.backlog.has(x.key)}">${esc(x.s)}</button>`).join('')
    + `<span>Other states count as started${SRC.states.some(x => REMOVED_ST.has(x.key)) ? ' or removed' : ''}.</span>`;
}
$('#states').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return; const k = b.dataset.k, B = S.SRC.backlog;
  if (B.has(k)) B.delete(k); else B.add(k);
  if (!B.size) { B.add(k); return; } // at least one state must count as backlog
  load(S.SRC, false);
});

function load(src, resetT) {
  S.SRC = src; S.M = buildModel(src); S.selected = null; S.hover = null; S.patSet = null; S.learnKey = null; player.reset();
  $('#hlbar').hidden = true;
  if (resetT) S.t = 0; S.t = Math.min(S.t, S.M.N - 1);
  const sc = $('#scrub'); sc.max = S.M.N - 1; sc.value = S.t;
  $('#d0').textContent = fmtD(S.M.dates[0], true); $('#d1').textContent = fmtD(S.M.dates[S.M.N - 1], true);
  $('#exampleBanner').hidden = !S.isExample;
  $('#eyebrow').textContent = S.isExample ? EYEBROW.example : EYEBROW.yours;
  $('#dash').hidden = false; $('#empty').hidden = true;
  player.fit(); renderStates(); renderAnalysis(); player.renderDetail(); player.updateSide(true); S.dirty = true;
}

const EYEBROW = { empty: 'Backlog analysis · no data loaded yet', example: 'Backlog analysis · example data', yours: 'Backlog analysis · your data' };

/* ---------- drop zone: same behaviour as the carry-over map ---------- */
const drop = $('#drop'), status = $('#dropStatus');
// three looks: ready (example or nothing showing), loaded (their files), error
function dropState(kind, html) {
  drop.classList.toggle('loaded', kind === 'loaded');
  drop.classList.toggle('err', kind === 'err');
  $('#dropMain').innerHTML = kind === 'loaded' ? '<strong>Your data is showing</strong>' : kind === 'err' ? '<strong>That didn’t work</strong>' : touch ? '<strong>Load your CSVs</strong>' : '<strong>Drop your CSVs here</strong>';
  $('#dropOr').innerHTML = touch ? (kind === 'ready' ? '<u>Choose files</u>' : '<u>Choose other files</u>') : (kind === 'ready' ? 'or <u>choose files</u>' : 'Drop other files, or <u>choose them</u>');
  $('#dropSmall').hidden = kind !== 'ready';
  status.hidden = kind === 'ready'; status.innerHTML = html || '';
  $('#toExample').hidden = S.isExample && !!S.M;
  drop.classList.remove('pop'); void drop.offsetWidth; if (kind !== 'ready') drop.classList.add('pop');
}
async function handleFiles(list) {
  const files = [...list].filter(f => /\.(csv|txt|tsv)$/i.test(f.name) || f.type.includes('csv'));
  if (!files.length) { dropState('err', 'Those weren’t CSV files. Export your query or filter to CSV and drop that.'); return; }
  try {
    const data = await Promise.all(files.map(f => f.text().then(text => ({ name: f.name, text, lastModified: f.lastModified }))));
    const src = buildSource(data); S.isExample = false; load(src, true);
    const M = S.M;
    dropState('loaded', `<b>${files.length === 1 ? esc(files[0].name) : files.length + ' files'}</b><br>${M.N} snapshots, ${M.items.length} items, ${fmtD(M.dates[0], true)} to ${fmtD(M.dates[M.N - 1], true)}.<br>Read in this browser only; nothing was uploaded.`);
    track('Backlog currents: CSV loaded', { files: files.length, snapshots: M.N });
    setPlaying(!reduce);
  } catch (err) {
    dropState('err', esc(err.message) + ' Open “What files do I need?” to see the expected columns.');
  }
}
$('#csvFile').addEventListener('change', e => { handleFiles(e.target.files); e.target.value = ''; });
// drag and drop: the zone itself, plus anywhere on the page so a stray drop never opens the file in the browser
const hasFiles = e => e.dataTransfer && [...e.dataTransfer.types].includes('Files');
let depth = 0;
addEventListener('dragenter', e => { if (!hasFiles(e)) return; e.preventDefault(); depth++; root.classList.add('dragging'); });
addEventListener('dragleave', e => { if (!hasFiles(e)) return; if (--depth <= 0) { depth = 0; root.classList.remove('dragging'); drop.classList.remove('over'); } });
addEventListener('dragover', e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; drop.classList.toggle('over', drop.contains(e.target)); });
addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; root.classList.remove('dragging'); drop.classList.remove('over'); handleFiles(e.dataTransfer.files); });

// the example, as carry-over's sample: shown on request (or with ?sample), playing unless the visitor prefers reduced motion
function showExample() {
  S.isExample = true;
  load(buildSource([{ name: EXAMPLE_FILE_NAME, text: exampleCSV() }]), true);
  dropState('ready');
  track('Backlog currents: example shown');
  setPlaying(!reduce);
}
function clear() {
  setPlaying(false); S.M = null; S.isExample = false; $('#tip').hidden = true;
  $('#dash').hidden = true; $('#empty').hidden = false; $('#states').hidden = true;
  $('#eyebrow').textContent = EYEBROW.empty;
}
$('#toExample').addEventListener('click', showExample);
$('#showExample').addEventListener('click', showExample);
$('#hideExample').addEventListener('click', () => { clear(); dropState('ready'); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
$('#loadOwn').addEventListener('click', () => { scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); $('#csvFile').click(); });

$('#copySample').addEventListener('click', e => {
  const b = e.currentTarget, label = 'Copy a sample CSV';
  (navigator.clipboard ? navigator.clipboard.writeText(SAMPLE_HISTORY_CSV) : Promise.reject())
    .then(() => { b.textContent = 'Copied'; setTimeout(() => b.textContent = label, 1500); })
    .catch(() => { b.textContent = 'Copy blocked here'; setTimeout(() => b.textContent = label, 2000); });
});

/* ---------- highlights from the "So what?" cards ---------- */
function setHighlight(set, label, key) {
  S.patSet = set; S.learnKey = key; S.selected = null; player.renderDetail();
  $('#hlbar').hidden = !set; $('#hltxt').textContent = set ? `Highlighting ${set.size} ${label}` : '';
  document.querySelectorAll('#learn .show').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === key));
  S.dirty = true;
}
$('#hlclear').addEventListener('click', () => setHighlight(null, '', null));
$('#learn').addEventListener('click', e => {
  const b = e.target.closest('.show'); if (!b) return; const k = b.dataset.k, show = S.learn.show;
  if (k === 'churn') { setHighlight(null, '', null); S.t = show.churnWeek; scrub.value = S.t; setPlaying(false); player.reset(); S.dirty = true; }
  else if (S.learnKey === k) { setHighlight(null, '', null); return; }
  else setHighlight(show[k], HIGHLIGHT_LABELS[k], k);
  $('#player-panel').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
});

/* ---------- playback ---------- */
const playBtn = $('#play'), scrub = $('#scrub');
function setPlaying(v) {
  if (!S.M) { S.playing = false; return; }
  S.playing = v; if (v && S.t >= S.M.N - 1) S.t = 0;
  playBtn.textContent = v ? 'Pause' : (S.t >= S.M.N - 1 ? 'Replay' : 'Play');
  playBtn.setAttribute('aria-pressed', v);
  S.lastTs = 0;
}
playBtn.addEventListener('click', () => setPlaying(!S.playing));
scrub.addEventListener('input', () => { S.t = +scrub.value; setPlaying(false); S.dirty = true; });
scrub.addEventListener('change', () => { S.t = Math.round(+scrub.value); scrub.value = S.t; S.dirty = true; });
document.querySelectorAll('#speed button').forEach(b => b.addEventListener('click', () => {
  S.speed = +b.dataset.speed; document.querySelectorAll('#speed button').forEach(x => x.setAttribute('aria-pressed', x === b));
}));
function frame(ts) {
  if (S.M) {
    if (S.playing) { if (S.lastTs) { S.t += (ts - S.lastTs) / 1000 * S.speed / 1.5; if (S.t >= S.M.N - 1) { S.t = S.M.N - 1; setPlaying(false); } } S.lastTs = ts; scrub.value = S.t; S.dirty = true; }
    if (S.dirty) { player.draw(); player.updateSide(); S.dirty = false; }
  }
  requestAnimationFrame(frame);
}

/* ---------- (i) popup on the skill download (as on carry-over) ---------- */
const infoBtn = $('#skillInfoBtn'), info = $('#skillInfo');
if (infoBtn && info) {
  const setInfo = open => { info.hidden = !open; infoBtn.setAttribute('aria-expanded', open); if (open) $('#skillInfoClose').focus(); };
  infoBtn.addEventListener('click', () => setInfo(info.hidden));
  $('#skillInfoClose').addEventListener('click', () => { setInfo(false); infoBtn.focus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !info.hidden) { setInfo(false); infoBtn.focus(); } });
  document.addEventListener('click', e => { if (!info.hidden && !info.contains(e.target) && e.target !== infoBtn) setInfo(false); });
}

/* ---------- start ----------
   1. Data embedded by the Claude skill (<script type="text/csv" id="bc-data">): show it as the visitor's data.
   2. ?sample, or the skill's data-example="1": open straight onto the example (for links in posts and slides).
   3. Otherwise start empty, like carry-over. */
const embedded = document.getElementById('bc-data');
const embeddedText = embedded ? embedded.textContent.trim() : '';
if (embeddedText) {
  try {
    S.isExample = false;
    load(buildSource([{ name: embedded.dataset.name || 'backlog.csv', text: embeddedText }]), true);
    if (embedded.dataset.label) $('#eyebrow').textContent = embedded.dataset.label;
    dropState('loaded', `<b>${esc(embedded.dataset.name || 'Your backlog')}</b><br>${S.M.N} snapshots, ${S.M.items.length} items, ${fmtD(S.M.dates[0], true)} to ${fmtD(S.M.dates[S.M.N - 1], true)}.`);
    setPlaying(!reduce);
  } catch (err) { clear(); dropState('err', esc(err.message)); }
} else if (/[?&]sample\b/.test(location.search) || (embedded && embedded.dataset.example === '1')) showExample(); else { clear(); dropState('ready'); }
requestAnimationFrame(frame);
