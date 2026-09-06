# Open Press — deploy bundle

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
