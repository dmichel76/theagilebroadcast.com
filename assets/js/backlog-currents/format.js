/* Backlog Currents: small shared helpers (no DOM). */
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const fmtD = (d, y) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: y ? 'numeric' : undefined, timeZone: 'UTC' });
