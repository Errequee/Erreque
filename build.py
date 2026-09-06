#!/usr/bin/env python3
"""Bundle the site into single self-contained files.

    python3 build.py                      -> dist/open-press.html   responsive, one file
    python3 build.py --variant computer   -> dist/computer.html     desktop layout
    python3 build.py --variant mobile     -> dist/mobile.html       phone layout
    python3 build.py --artifact           -> dist/artifact.html     no document wrapper

Every build carries the same core and the same sixteen tools. --variant pins the
layout at build time - one stylesheet, NV_VARIANT set, no guessing. Without it
the file carries both stylesheets behind a media query and decides at load.
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

variant = None
if "--variant" in sys.argv:
    variant = sys.argv[sys.argv.index("--variant") + 1]
    if variant not in ("mobile", "computer"):
        raise SystemExit("--variant must be mobile or computer")

out = re.sub(r'<link rel="stylesheet" href="(assets/[^"]+)">', inline_css, src)
out = re.sub(r'<script src="(assets/[^"]+)"></script>', inline_js, out)

def variant_css(name):
    return (ROOT / "assets" / "css" / f"{name}.css").read_text(encoding="utf-8")

if variant:
    extra = variant_css(variant)
else:
    # The responsive builds carry both sheets behind the same 900 px breakpoint
    # the layout already uses, so one file suits either device.
    extra = ("@media (max-width:900px){\n" + variant_css("mobile") + "\n}\n"
             "@media (min-width:901px){\n" + variant_css("computer") + "\n}\n")

out = out.replace("</style>", "</style>\n<style>\n" + extra + "\n</style>", 1)

if variant:
    out = out.replace("<script>\n/* Image-processing primitives",
                      "<script>window.NV_VARIANT=%r;</script>\n<script>\n/* Image-processing primitives" % variant, 1)
    if "NV_VARIANT" not in out:
        raise SystemExit("variant flag was not injected - the inline script marker moved")

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
elif variant:
    target = dist / (variant + ".html")
else:
    target = dist / "open-press.html"

target.write_text(out, encoding="utf-8")
print(f"{target} — {len(out)/1024:.0f} KB")
