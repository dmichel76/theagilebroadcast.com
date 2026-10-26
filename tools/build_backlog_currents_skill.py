#!/usr/bin/env python3
"""Build the downloadable Backlog Currents skill: assets/downloads/backlog-currents.zip

The skill's page (template.html) is generated from the live page and its modules, so the two never drift apart:
- backlog-currents.html, minus the site header, footer, analytics and the skill download row,
- every module in assets/js/backlog-currents/, bundled into one inline script (no imports),
- an empty <script type="text/csv" id="bc-data"> block that the skill fills with the user's data.
It then zips skills/backlog-currents/ (SKILL.md, scripts/) plus template.html as backlog-currents/.

Run from the repo root after changing the page, a module, SKILL.md or the scripts:
    python3 tools/build_backlog_currents_skill.py
The zip is reproducible (fixed dates), so rebuilding without changes leaves it identical.
`--template <path>` only writes the generated page there (used by the tests).
"""
import io, posixpath, re, sys, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MOD_DIR = ROOT / "assets/js/backlog-currents"
SKILL_DIR = ROOT / "skills/backlog-currents"
OUT_ZIP = ROOT / "assets/downloads/backlog-currents.zip"
ENTRY = "app.js"

IMPORT_RE = re.compile(r"^import\s*\{([^}]*)\}\s*from\s*'([^']+)';\s*$", re.M)
EXPORT_RE = re.compile(r"^export\s+(function|const|let)\s+([A-Za-z_$][\w$]*)", re.M)


def key_of(base, spec):
    return posixpath.normpath(posixpath.join(posixpath.dirname(base), spec.split("?")[0]))


def bundle():
    """Wrap each module in a function scope; imports become reads from the bundle's module table."""
    order, seen = [], set()

    def visit(name):
        if name in seen:
            return
        seen.add(name)
        src = (MOD_DIR / name).read_text(encoding="utf-8")
        for _, spec in IMPORT_RE.findall(src):
            visit(key_of(name, spec))
        order.append(name)

    visit(ENTRY)
    parts = []
    for name in order:
        src = (MOD_DIR / name).read_text(encoding="utf-8")
        src = IMPORT_RE.sub(lambda m: f"const {{{m.group(1).strip()}}} = M[{key_of(name, m.group(2))!r}];", src)
        names = [n for _, n in EXPORT_RE.findall(src)]
        src = EXPORT_RE.sub(lambda m: f"{m.group(1)} {m.group(2)}", src)
        if "export " in re.sub(r"//.*|/\*[\s\S]*?\*/", "", src):
            sys.exit(f"{name}: unsupported export form; use 'export function' or 'export const'.")
        parts.append(f"/* ---- {name} ---- */\nM[{name!r}] = (() => {{\n{src}\nreturn {{ {', '.join(names)} }};\n}})();")
    return "(function () {\n'use strict';\nconst M = {};\n" + "\n".join(parts) + "\n})();"


def cut(html, start, end):
    """Remove the first block from `start` to `end` (inclusive)."""
    a = html.index(start)
    b = html.index(end, a) + len(end)
    return html[:a] + html[b:]


def template():
    html = (ROOT / "backlog-currents.html").read_text(encoding="utf-8")
    html = re.sub(r"<title>.*?</title>", "<title>Backlog Currents</title>", html, count=1)
    html = re.sub(r'<link rel="canonical"[^>]*>\n', "", html)
    html = re.sub(r'<script defer src="assets/js/(track|menu)\.js[^"]*"></script>\n', "", html)
    html = re.sub(r'<script type="module" src="assets/js/backlog-currents/app\.js[^"]*"></script>\n', "", html)
    html = cut(html, '<header class="site">', "</header>\n")
    html = cut(html, '<footer class="site">', "</footer>\n")
    html = re.sub(r"<script>document\.getElementById\('year'\).*?</script>\n", "", html)
    html = cut(html, '      <section class="skill" id="skill"', "      </section>\n")
    credit = ('      <p class="note">Made by Dr David Michel, The Agile Broadcast. '
              '<a class="lnk" href="https://theagilebroadcast.com/backlog-currents.html" target="_blank" rel="noopener">Try it online</a>.</p>\n')
    html = html.replace("    </div>\n  </header>", credit + "    </div>\n  </header>", 1)
    # no site header in an artifact: the sticky banner sits at the top of the window
    html = html.replace("</style>", ".bc{min-height:100vh}\n.bc .sample-banner{top:10px}\n</style>", 1)
    data = ('<script type="text/csv" id="bc-data" data-name="" data-label="" data-example="0">\n</script>\n')
    js = bundle()
    if "</script" in js:
        sys.exit("The bundled code contains '</script'; it can't be inlined.")
    html = html.replace("</body>", data + "<script>\n" + js + "\n</script>\n</body>", 1)
    for gone in ('class="site"', "track.js", "menu.js", 'type="module"'):
        if gone in html:
            sys.exit(f"template.html still contains {gone!r}; the page structure changed, update this script.")
    return html


def entry(name, data):
    """A zip entry with a fixed date, so the zip is byte-identical when nothing changed."""
    info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o644 << 16
    return info, data


def main():
    html = template()
    if len(sys.argv) > 2 and sys.argv[1] == "--template":
        # test mode: write only the page, leave the zip and backlog-currents.html alone
        Path(sys.argv[2]).write_text(html, encoding="utf-8")
        return
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for p in sorted(SKILL_DIR.rglob("*")):
            if p.is_file() and p.name != "template.html" and "__pycache__" not in p.parts:
                z.writestr(*entry("backlog-currents/" + p.relative_to(SKILL_DIR).as_posix(), p.read_bytes()))
        z.writestr(*entry("backlog-currents/template.html", html.encode("utf-8")))
    OUT_ZIP.write_bytes(buf.getvalue())
    # keep the size shown in the page's (i) popup current
    kb = max(1, round(len(buf.getvalue()) / 1024))
    page = ROOT / "backlog-currents.html"
    old = page.read_text(encoding="utf-8")
    new = re.sub(r'(<p class="pop-file" id="skillFile">)backlog-currents\.zip[^<]*(</p>)', rf"\g<1>backlog-currents.zip · {kb} KB\g<2>", old)
    if new != old:
        page.write_text(new, encoding="utf-8")
    print(f"{OUT_ZIP.relative_to(ROOT)}: {kb} KB (template.html {round(len(html) / 1024)} KB)")


if __name__ == "__main__":
    main()
