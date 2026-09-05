# Open Press — deploy bundle

Sixteen DTF tools in one self-contained page. No build step, no server, no
account, no tracking. Every image you open is processed in your own browser and
never uploaded anywhere.

## What is in here

    index.html   the entire application, one file, roughly 200 KB
    404.html     shown for any path that is not the app
    _headers     Content-Type and cache rules for Cloudflare Pages / Netlify
    README.md    this file

`index.html` has no external dependencies except the Google Fonts stylesheet,
and it falls back to system faces when that is unavailable. Open it straight
from disk and it works offline.

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

    /#/guide             where to start
    /#/dtf-check         audit a file before printing
    /#/remove-background /#/reduce-edges     /#/semi-transparency
    /#/enhance           /#/vectorize        /#/resize        /#/convert
    /#/halftones         /#/rhinestones      /#/frames-grunge
    /#/gang-sheets       /#/mockups          /#/pricing       /#/sizing

Because the routes live after the `#`, the server only ever serves one file.
Deep links and refreshes work with no rewrite rules.

## Editing it

This bundle is generated. The source lives in the project repository as
separate CSS and JS files; `python3 package.py` rebuilds this zip from them.
Editing `index.html` here works, but the next build overwrites it.
