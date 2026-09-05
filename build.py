#!/usr/bin/env python3
"""Bundle the site into a single file.

    python3 build.py              -> dist/open-press.html  (complete, self-contained HTML)
    python3 build.py --artifact   -> dist/artifact.html    (no <html>/<head>/<body>, for
                                     embedding in a container that supplies its own)
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
src = (ROOT / "index.html").read_text(encoding="utf-8")

def inline_css(m):
    path = ROOT / m.group(1)
    return "<style>\n" + path.read_text(encoding="utf-8") + "\n</style>"

def inline_js(m):
    path = ROOT / m.group(1)
    return "<script>\n" + path.read_text(encoding="utf-8") + "\n</script>"

out = re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">', inline_css, src)
out = re.sub(r'<script src="(assets/[^"]+)"></script>', inline_js, out)

dist = ROOT / "dist"
dist.mkdir(exist_ok=True)

if "--artifact" in sys.argv:
    head = out[out.index("<title>"):out.index("</head>")]
    head = re.sub(r'<link rel="(icon|preconnect)"[^>]*>\s*', "", head)
    head = re.sub(r"<meta[^>]*>\s*", "", head)
    head = re.sub(r"<title>.*?</title>", "<title>Open Press DTF</title>", head, flags=re.S)
    body = out[out.index("<body>") + len("<body>"):out.index("</body>")]
    out = head.strip() + "\n" + body.strip() + "\n"
    target = dist / "artifact.html"
else:
    target = dist / "open-press.html"

target.write_text(out, encoding="utf-8")
print(f"{target} — {len(out)/1024:.0f} KB")
