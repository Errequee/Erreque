# Open Press — free DTF tools

Sixteen tools for DTF printing, screen printing and cut vinyl. The whole thing runs in
the browser: no account, no subscription, no watermarks and no files sent to any server.
There is no backend because none is needed — every image operation happens on your own
machine with Canvas and JavaScript.

## The tools

**Cutout cleanup**

| Tool | What it does |
|---|---|
| Workshop guide | The order to work in, what each tool fixes, and the mistakes that cost film. |
| DTF file check | Six checks on a file before it costs you film — semi-transparency, background, DPI, colour, hairlines and coverage — each with a one-click fix and a saveable report. |
| Remove background | Colour wand (tolerance and connected-area) plus erase and restore brushes. |
| Reduce edges | Shrinks or grows the contour with sub-pixel precision, kills the halo a cutout leaves, and clears specks and holes. |
| Remove semi-transparency | Turns partial alpha — which the printer cannot reproduce — into solid or clear. Includes a magenta inspector. |

**Artwork prep**

| Tool | What it does |
|---|---|
| Enhance and upscale | Progressive resampling up to 4×, unsharp mask, median for JPG noise, and colour adjustment. |
| Vectorize and split colours | k-means quantization, traces the real contour of each ink, exports SVG, PNG and a ZIP with the ink separation. |
| Resize | Size in cm or inches with the DPI written into the PNG (`pHYs` chunk), and fit / fill / stretch framing. |
| Format converter | PNG, JPG and WEBP with quality, size cap and background flattening. |

**Print effects**

| Tool | What it does |
|---|---|
| Halftones and fades | Dot screens with angle, shape and weight; gradients that dissolve into solid dots; CMYK separation at the classic angles. |
| Rhinestone patterns | Places stones on a real lattice at their real size and gives you the count, the colour split and an SVG template to cut. |
| Frames and grunge | Distress from fractal noise (whole artwork or contour only), dirty texture and frames. |

**Production**

| Tool | What it does |
|---|---|
| Print sheets | Gangs several designs onto the roll with shelf packing, measures the run and exports the PNG at real DPI. |
| Mockups | A tee and a tote drawn in code, or your own photo, with shading and fabric texture clipped to the garment, and a readout of the real print size in centimetres. |
| Pricing calculator | Real cost per piece (film, ink, powder, labour, waste) and selling price. Remembers your numbers. |
| Standard sizes | Print sizes by garment size, placements, a pressing reference and a centimetres-to-pixels converter. |

## How to use it

Open `index.html`. That's it — it works straight off the disk (`file://`) and offline.

To publish it, push the repository to any static host (GitHub Pages, Netlify, Cloudflare
Pages) or serve it locally:

```sh
npm run serve      # http://localhost:8080
```

There are also single-file builds and a deploy bundle:

```sh
npm run build                  # dist/open-press.html — complete HTML, for a USB stick or a chat
npm run package                # dist/open-press-site.zip — drag onto Cloudflare Pages or Netlify
python3 build.py --artifact    # dist/artifact.html — no <html>/<head>/<body>, for embedding
```

The zip holds one folder: `index.html` (the whole app), `404.html`, `_headers`
with the Content-Type and cache rules a static host needs, and a deploy README.

Embedded viewers block download links, so `NV.download` asks the host to save the file
(`claude.use('downloads')`) and falls back to a plain anchor when that isn't available. In
that view the ink-separation ZIP isn't an allowed format: the tool says so and points you
at the full site.

## How it's built

No dependencies, no build step, no frameworks. Classic JavaScript with one global
namespace, which is why it behaves the same served over HTTP or opened from disk.

```
index.html               shell: fonts, styles and load order
assets/css/app.css       visual system and the three theme states (light, dark, system)
assets/js/imglib.js      image processing: exact euclidean distance transform, box blur,
                         k-means, contour tracing, fractal noise
assets/js/core.js        tool registry, hash routing, viewer with zoom and compare,
                         controls, exporting, ZIP and PNG DPI
assets/js/tools/*.js     one tool per file
build.py                 bundles everything into a single HTML file
package.py               wraps that build into the deployable zip
test/smoke.js            Chromium smoke test
```

A few decisions worth knowing about:

- **Shrinking the contour uses a signed distance field**, not neighbour erosion. It comes
  from the exact Felzenszwalb–Huttenlocher algorithm, so fractional radii and soft edges
  work without stair-stepping.
- **The dot fade** computes the radius as `0.708 × cell × √coverage`. At full coverage the
  circles tile the cell exactly, so solid areas stay genuinely solid and the transition
  never leaves partial alpha behind.
- **The preview works at 1500 px maximum** and scales any parameter expressed in pixels.
  The download always recomputes at full resolution.
- **The vectorizer traces the real pixel edges** and chains closed loops, using the
  `evenodd` rule so holes come out right with no separate logic.

### Adding a tool

Create `assets/js/tools/my-tool.js`, register it, and add the `<script>` tag in
`index.html`. For a tool that transforms an image, declaring the controls and a `process`
function is enough:

```js
NV.register({
  slug: 'my-tool',
  name: 'My tool',
  group: 'Print effects',
  tagline: 'What it does, in one line.',
  icon: NV.svg('<circle cx="12" cy="12" r="8"/>'),
  controls: [
    { k: 'range', id: 'strength', label: 'Strength', min: 0, max: 100, step: 1, def: 50, unit: ' %' }
  ],
  process: function (c) {
    return IM.adjust(c.src, { contrast: c.p.strength });
  }
});
```

The core supplies the rest — drop zone, viewer, compare, download. For anything that
doesn't fit "an image goes in, an image comes out", use `kind: 'custom'` and `render(host)`.

## Tests

```sh
npm install
npm test
```

Opens all 16 tools in Chromium, loads test images generated on the fly, moves every
slider, toggles the segments and checkboxes, and fails on any console error.

## Privacy

There is no server, no analytics, and no network requests apart from Google Fonts (which
falls back to system faces offline). The files you open never leave your browser.

## Independence

Our own project, with no affiliation to or relationship with any store or commercial
suite. The tools were written from scratch.
