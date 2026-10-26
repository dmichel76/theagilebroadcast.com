/* Backlog Currents: CSV import.
   Pure functions, no DOM. Turns one or more CSV exports (Azure DevOps, Jira or a single history file)
   into dated backlog snapshots. Logic ported unchanged from the prototype (backlog-currents.html, 26 Oct 2026). */

export const norm = s => String(s || '').trim().toLowerCase();

// States that count as "waiting in the backlog", "removed" and "started". Anything unknown counts as backlog.
export const BACKLOG_ST = new Set(['new','approved','proposed','to do','todo','open','backlog','ready','refined','groomed','selected for development','ready for development','ready for dev']);
export const REMOVED_ST = new Set(['removed',"won't do",'wont do',"won't fix",'wontfix','rejected','cancelled','canceled','obsolete','duplicate','declined','abandoned']);
export const STARTED_ST = new Set(['active','committed','in progress','doing','in review','resolved','done','closed','completed','in development','in dev','testing','in test','code review','qa']);

/* Parses CSV text. Detects the delimiter (comma, semicolon or tab) from the header line,
   handles quoted fields with doubled quotes and newlines, drops blank rows and a leading BOM. */
export function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const first = text.split(/\r?\n/, 1)[0];
  const delim = [',', ';', '\t'].map(d => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === delim) { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}

const hn = h => h.toLowerCase().replace(/[^a-z0-9]/g, '');
export function findCol(heads, prefs, test) {
  const n = heads.map(hn);
  for (const p of prefs) { const i = n.indexOf(p); if (i >= 0) return i; }
  if (test) { const i = n.findIndex(test); if (i >= 0) return i; }
  return -1;
}

const MON = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
/* Reads ISO (2026-10-19), 19-Oct-2026, dd/mm/yyyy (or mm/dd when the day is over 12) and anything Date.parse knows.
   Returns a UTC midnight Date, or null. */
export function parseDate(s) {
  s = String(s || '').trim(); if (!s) return null; let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(Date.UTC(+m[1], m[2] - 1, +m[3]));
  if ((m = s.match(/^(\d{1,2})[\/.\-]([A-Za-z]{3})[A-Za-z]*[\/.\-](\d{2,4})/))) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return new Date(Date.UTC(y, MON[m[2].toLowerCase()] ?? 0, +m[1])); }
  if ((m = s.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{2,4})/))) { let a = +m[1], b = +m[2], y = +m[3]; if (y < 100) y += 2000; let d = a, mo = b; if (a <= 12 && b > 12) { mo = a; d = b; } return new Date(Date.UTC(y, mo - 1, d)); }
  const t = Date.parse(s); if (!isNaN(t)) { const d = new Date(t); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); }
  return null;
}
export const dateFromName = n => { const m = n.match(/(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})/); return m ? new Date(Date.UTC(+m[1], m[2] - 1, +m[3])) : null; };
export const iso = d => d.toISOString().slice(0, 10);

const NUMERIC = /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;

/* files: [{name, text, lastModified}]. Throws an Error with a specific, visitor-facing message when it can't read them. */
export function buildSource(files) {
  const byDate = new Map(); let hasState = false, hasRank = false, ord = 0; const stateCount = new Map(); const rankVals = [];
  const used = { id: new Set(), title: new Set(), state: new Set(), rank: new Set(), date: new Set() };
  for (const f of files) {
    const rows = parseCSV(f.text); if (rows.length < 2) throw new Error(`${f.name} has no data rows.`);
    const H = rows[0];
    const c = {
      id: findCol(H, ['issuekey','key','id','workitemid','issueid']),
      title: findCol(H, ['title','summary','name']),
      state: findCol(H, ['state','status']),
      type: findCol(H, ['workitemtype','issuetype','type']),
      rank: findCol(H, ['backlogpriority','stackrank','rank','customfieldrank','backlogorder','order','position'], h => h.includes('rank')),
      date: findCol(H, ['snapshotdate','date','datevalue','asof','asofdate','snapshot','week'])
    };
    if (c.id < 0) throw new Error(`${f.name}: no ID column found. Columns: ${H.slice(0, 10).join(', ')}${H.length > 10 ? '…' : ''}`);
    for (const k in used) if (c[k] >= 0) used[k].add(H[c[k]]);
    if (c.state >= 0) hasState = true; if (c.rank >= 0) hasRank = true;
    let fileDate = null;
    if (c.date < 0) { fileDate = dateFromName(f.name) || new Date(f.lastModified || Date.now()); fileDate = new Date(Date.UTC(fileDate.getUTCFullYear(), fileDate.getUTCMonth(), fileDate.getUTCDate())); }
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; const id = (r[c.id] || '').trim(); if (!id) continue;
      let d = fileDate;
      if (c.date >= 0) { d = parseDate(r[c.date]); if (!d) throw new Error(`${f.name}: couldn't read the date “${r[c.date]}” on row ${i + 1}.`); }
      const key = iso(d); if (!byDate.has(key)) byDate.set(key, { date: d, rows: [] });
      const st = c.state >= 0 ? (r[c.state] || '').trim() : ''; if (st) stateCount.set(st, (stateCount.get(st) || 0) + 1);
      const rk = c.rank >= 0 ? (r[c.rank] || '').trim() : ''; if (rk) rankVals.push(rk);
      byDate.get(key).rows.push({ id, title: c.title >= 0 ? (r[c.title] || '').trim() : '', type: c.type >= 0 ? (r[c.type] || '').trim() : '', state: st, rank: rk, ord: ord++ });
    }
  }
  const snaps = [...byDate.values()].sort((a, b) => a.date - b.date);
  if (snaps.length < 2) throw new Error(`Found only one snapshot (${snaps[0] ? iso(snaps[0].date) : 'none'}). Add exports from at least two dates, or one file with a date column.`);
  // Numeric only if the whole value is a number. (The prototype used parseFloat, which reads a Jira lexorank
  // like "0|i0004b:" as 0, so every rank tied and order fell back to row order.)
  const rankNumeric = rankVals.length > 0 && rankVals.every(v => NUMERIC.test(v.replace(/,/g, '')));
  const states = [...stateCount.entries()].sort((a, b) => b[1] - a[1]).map(([s, n]) => ({ s, n, key: norm(s) }));
  const backlog = new Set(states.filter(x => BACKLOG_ST.has(x.key) || (!STARTED_ST.has(x.key) && !REMOVED_ST.has(x.key))).map(x => x.key));
  return { snaps, hasState, hasRank, rankNumeric, states, backlog, used, files: files.map(f => f.name) };
}
