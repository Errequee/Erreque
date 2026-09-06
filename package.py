#!/usr/bin/env python3
"""Build the deployable bundle: dist/open-press-site.zip

One folder, ready to drag onto Cloudflare Pages, Netlify, or any static host:

    open-press/
      index.html      device chooser
      computer.html   the whole app, desktop layout, self-contained
      mobile.html     the whole app, phone layout, self-contained
      404.html
      _headers
      README.md
"""
import pathlib, shutil, subprocess, sys, zipfile

ROOT = pathlib.Path(__file__).parent
DIST = ROOT / "dist"
SITE = DIST / "open-press"

for args in ([], ["--variant", "computer"], ["--variant", "mobile"]):
    subprocess.run([sys.executable, str(ROOT / "build.py")] + args, check=True)

if SITE.exists():
    shutil.rmtree(SITE)
SITE.mkdir(parents=True)

shutil.copy(ROOT / "chooser.html", SITE / "index.html")
shutil.copy(DIST / "computer.html", SITE / "computer.html")
shutil.copy(DIST / "mobile.html", SITE / "mobile.html")

(SITE / "404.html").write_text("""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Not here — Open Press</title>
<meta name="color-scheme" content="dark light">
<style>
:root{color-scheme:dark;--bg:#13110f;--fg:#f3eee6;--dim:#a99e8f;--accent:#ff2d7e}
@media (prefers-color-scheme:light){:root{color-scheme:light;--bg:#f4f0e7;--fg:#191512;--dim:#615749;--accent:#d1005f}}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;background:var(--bg);color:var(--fg);
font-family:'Instrument Sans',system-ui,-apple-system,'Segoe UI',sans-serif;text-align:center}
h1{font-size:clamp(30px,7vw,52px);margin:0 0 10px;letter-spacing:-.02em;text-transform:uppercase}
p{color:var(--dim);margin:0 0 24px;max-width:44ch;line-height:1.55}
a{display:inline-block;padding:11px 18px;border-radius:6px;background:var(--accent);color:#fff;
text-decoration:none;font-weight:600}
code{font-family:ui-monospace,monospace;color:var(--accent)}
</style></head><body><main>
<h1>Nothing on this shelf</h1>
<p>That page is not part of Open Press. Every tool lives on the one page, addressed
after the <code>#</code> — so <code>/#/halftones</code>, not <code>/halftones</code>.</p>
<a href="/">Back to the tools</a>
</main></body></html>
""", encoding="utf-8")

(SITE / "_headers").write_text("""# Header rules for Open Press. Cloudflare Pages and Netlify both read this file.
#
# The Content-Type lines are deliberate. A host that serves an .html file as
# anything else makes Safari stop rendering it and offer to DOWNLOAD the page
# instead. Saying the type out loud removes that possibility.
#
# There is intentionally NO "X-Content-Type-Options: nosniff". nosniff forbids
# the browser from correcting a wrong Content-Type, which turns a mis-typed
# response into a forced download with no way to recover.

/*.html
  Content-Type: text/html; charset=utf-8
  Referrer-Policy: strict-origin-when-cross-origin
  Cache-Control: public, max-age=0, must-revalidate

/
  Content-Type: text/html; charset=utf-8
  Cache-Control: public, max-age=0, must-revalidate

# The app is one file with no service worker, so must-revalidate is what keeps
# a redeploy visible immediately instead of serving a stale copy for hours.

# No cross-origin isolation headers here on purpose. Nothing in Open Press uses
# SharedArrayBuffer or worker threads - it is plain Canvas on the main thread -
# and COEP would only risk blocking the Google Fonts stylesheet.

# No X-Frame-Options here on purpose. SAMEORIGIN makes the page render as a
# blank white screen inside any iframe - a preview pane, an embed, a builder's
# live view - with nothing in the page to explain why. A public tool page gains
# nothing from it.

/*
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
""", encoding="utf-8")

(SITE / "README.md").write_text("""# Open Press — deploy bundle

Sixteen DTF tools in one self-contained page. No build step, no server, no
account, no tracking. Every image you open is processed in your own browser and
never uploaded anywhere.

## What is in here

    index.html      device chooser - detects the device and points at one of the two
    computer.html   the entire application, desktop layout, one file
    mobile.html     the entire application, phone layout, one file
    404.html        shown for any path that is not the app
    _headers        Content-Type and cache rules for Cloudflare Pages / Netlify
    README.md       this file

Both builds carry the same sixteen tools and the same engine. They differ in
layout only: the computer build keeps a permanent side rail beside a full-height
canvas, while the phone build pins the preview to the top, folds the controls
into sections you tap open, and sizes every target for a thumb.

Neither build has external dependencies beyond the Google Fonts stylesheet, which
does not block rendering and falls back to system faces when unavailable. Open
either file straight from disk and it works offline.

## Deploy it

**Cloudflare Pages** — Workers & Pages, Create, Pages, "Upload assets", then
drag this whole `open-press` folder in. `_headers` is picked up automatically.

**Netlify** — drag the folder onto the Sites page. Same `_headers` support.

**GitHub Pages** — commit the contents of this folder to the branch you publish
from. `_headers` is ignored there; GitHub already serves `.html` correctly, so
nothing breaks.

**Your own server** — copy the folder into the web root. Serve `.html` as
`text/html; charset=utf-8` and point unknown paths at `404.html`.

## Addresses

Every tool is a hash route on the one page, so there is nothing to configure:

    /computer.html#/guide      or    /mobile.html#/guide
Tool routes, on either build:

    #/guide        #/dtf-check      #/remove-background  #/reduce-edges
    #/semi-transparency             #/enhance            #/vectorize
    #/resize       #/convert        #/halftones          #/rhinestones
    #/frames-grunge                 #/gang-sheets        #/mockups
    #/pricing      #/sizing

Because the routes live after the `#`, the server only ever serves one file.
Deep links and refreshes work with no rewrite rules.

## Editing it

This bundle is generated. The source lives in the project repository as
separate CSS and JS files; `python3 package.py` rebuilds this zip from them.
Editing `index.html` here works, but the next build overwrites it.
""", encoding="utf-8")

out = DIST / "open-press-site.zip"
if out.exists():
    out.unlink()
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for f in sorted(SITE.rglob("*")):
        if f.is_file():
            z.write(f, f.relative_to(DIST))

total = sum(f.stat().st_size for f in SITE.rglob("*") if f.is_file())
print(f"{out}  —  {out.stat().st_size/1024:.0f} KB zipped, {total/1024:.0f} KB unpacked")
for f in sorted(SITE.rglob("*")):
    if f.is_file():
        print(f"  {f.relative_to(DIST)}  ({f.stat().st_size/1024:.1f} KB)")
