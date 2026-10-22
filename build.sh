#!/usr/bin/env bash
# ─── build.sh ────────────────────────────────────────────────────────────────
# Concatenates all JS modules and inlines them into index.html to produce a
# single-file distributable at dist/atlas-infinite-visualizer.html
# Usage:  ./build.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

DIST_DIR="dist"
OUT="$DIST_DIR/atlas-infinite-visualizer.html"

JS_FILES=(
  js/state.js
  js/i18n.js
  js/utils.js
  js/cap.js
  js/tab-arch.js
  js/tab-ha.js
  js/tab-vs.js
  js/tab-hs.js
  js/tab-bk.js
  js/tab-lim.js
  js/main.js
)

mkdir -p "$DIST_DIR"

python3 - "$OUT" "${JS_FILES[@]}" <<'PYEOF'
import sys, re

out_path, js_files = sys.argv[1], sys.argv[2:]

with open("index.html", encoding="utf-8") as fh:
    html = fh.read()

js = "<script>\n" + "".join(
    f"// ═══ {f} ═══\n" + open(f, encoding="utf-8").read() + "\n\n" for f in js_files
) + "</script>"

# Strip the  <script src="js/..."></script>  tags of the dev version
html = re.sub(r'\n?[ \t]*<script src="js/[^"]*"></script>', '', html)
# Inline local images (the official logo) as data URIs so the file stays self-contained
import base64
def _inline(m):
    data = open(m.group(1), 'rb').read()
    return 'src="data:image/svg+xml;base64,' + base64.b64encode(data).decode() + '"'
html = re.sub(r'src="(assets/[^"]+\.svg)"', _inline, html)
# Inject the inlined block just before </body>
html = html.replace("</body>", js + "\n</body>", 1)

with open(out_path, "w", encoding="utf-8") as fh:
    fh.write(html)

print(f"✓  Built {out_path}  ({len(html):,} bytes)")
PYEOF
