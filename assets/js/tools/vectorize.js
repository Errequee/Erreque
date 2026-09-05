/* Vectorize: quantizes the colour, traces real contours and splits into layers. */
(function () {
  'use strict';
  var WORK = 1400;

  function area(pts) {
    var a = 0, n = pts.length, i;
    for (i = 0; i < n; i++) {
      var j = (i + 1) % n;
      a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1];
    }
    return Math.abs(a) / 2;
  }

  function vectorize(src, p) {
    var work = src;
    if (Math.max(src.width, src.height) > WORK) {
      var k = WORK / Math.max(src.width, src.height);
      work = IM.dataOf(IM.resize(src, src.width * k, src.height * k),
        Math.round(src.width * k), Math.round(src.height * k));
    }
    var w = work.width, h = work.height, n = w * h, i;
    var pal, map;

    if (p.mode === 'silhouette') {
      pal = [IM.rgb(p.ink)];
      map = new Int32Array(n);
      var d = work.data;
      for (i = 0; i < n; i++) {
        var lum = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);
        var on = d[i * 4 + 3] > 128 && (p.invert ? lum > p.threshold : lum < p.threshold);
        map[i] = on ? 0 : -1;
      }
    } else {
      var q = IM.quantize(work, p.colors, 10);
      pal = q.palette; map = q.map;
      if (p.dropWhite) {                                 // a light background is not an ink
        var out = {};
        pal.forEach(function (col, k) {
          if (IM.colorDistance(col[0], col[1], col[2], 255, 255, 255) < 22) out[k] = 1;
        });
        for (i = 0; i < n; i++) if (out[map[i]]) map[i] = -1;
      }
    }

    var layers = [];
    pal.forEach(function (col, idx) {
      var mask = new Uint8Array(n), count = 0;
      for (i = 0; i < n; i++) if (map[i] === idx) { mask[i] = 1; count++; }
      if (!count) return;
      var loops = IM.traceMask(mask, w, h), paths = [];
      loops.forEach(function (loop) {
        var pts = IM.dropCollinear(loop);
        if (area(pts) < p.minArea) return;
        pts = IM.rdp(pts, p.detail);
        if (pts.length < 3) return;
        paths.push(IM.pathData(pts, p.smooth, 2));
      });
      if (paths.length) layers.push({ color: IM.hex(col), d: paths.join(' '), px: count });
    });
    layers.sort(function (a, b) { return b.px - a.px; });
    return { layers: layers, w: w, h: h };
  }

  function raster(v, W, H) {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    ctx.scale(W / v.w, H / v.h);
    v.layers.forEach(function (L) {
      ctx.fillStyle = L.color;
      ctx.fill(new Path2D(L.d), 'evenodd');
    });
    return ctx.getImageData(0, 0, W, H);
  }

  function svgText(v, W, H, layers) {
    var s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + W +
      '" height="' + H + '" viewBox="0 0 ' + v.w + ' ' + v.h + '" shape-rendering="geometricPrecision">\n';
    (layers || v.layers).forEach(function (L, i) {
      s += '  <g id="ink-' + (i + 1) + '" data-color="' + L.color + '">' +
        '<path fill="' + L.color + '" fill-rule="evenodd" d="' + L.d + '"/></g>\n';
    });
    return s + '</svg>\n';
  }

  NV.register({
    slug: 'vectorize',
    name: 'Vectorize and split colours',
    group: 'Artwork prep',
    tagline: 'From pixels to SVG curves, with one layer per ink ready to separate.',
    icon: NV.svg('<path d="M5 19c4-1 5-9 9-11 2-1 4 0 5 2"/><rect x="2" y="17" width="4" height="4"/><rect x="18" y="5" width="4" height="4"/>'),
    intro: 'Traces the exact contour of every colour and hands it back as an editable SVG. The layer split is what you need for screen printing, cut vinyl, or recolouring without losing edge quality.',
    manual: true,
    previewMax: 1400,
    controls: [
      { k: 'seg', id: 'mode', label: 'Mode', def: 'color', heavy: true, opts: [['color', 'By colour'], ['silhouette', 'One-ink silhouette']] },
      { k: 'range', id: 'colors', label: 'Number of inks', min: 2, max: 24, step: 1, def: 8, unit: '', heavy: true, show: function (p) { return p.mode === 'color'; } },
      { k: 'check', id: 'dropWhite', label: 'Discard the white background', def: true, heavy: true, show: function (p) { return p.mode === 'color'; } },
      { k: 'range', id: 'threshold', label: 'Silhouette threshold', min: 10, max: 245, step: 5, def: 128, unit: '', heavy: true, show: function (p) { return p.mode === 'silhouette'; } },
      { k: 'check', id: 'invert', label: 'Invert the silhouette', def: false, heavy: true, show: function (p) { return p.mode === 'silhouette'; } },
      { k: 'color', id: 'ink', label: 'Ink colour', def: '#111111', heavy: true, show: function (p) { return p.mode === 'silhouette'; } },
      { k: 'group', label: 'Tracing' },
      { k: 'range', id: 'detail', label: 'Simplify curves', min: 0, max: 6, step: 0.1, def: 1, unit: ' px', dec: 1, heavy: true },
      { k: 'range', id: 'smooth', label: 'Smoothing', min: 0, max: 1, step: 0.05, def: 0.5, unit: '', dec: 2, heavy: true },
      { k: 'range', id: 'minArea', label: 'Discard blobs smaller than', min: 0, max: 400, step: 5, def: 24, unit: ' px²', heavy: true },
      { k: 'note', text: 'Press Run after moving the controls: tracing is the heavy part.' }
    ],
    process: function (c) {
      var v = vectorize(c.src, c.p);
      c.state.custom.vec = v;
      return raster(v, c.src.width, c.src.height);
    },
    exports: [
      {
        label: 'Download SVG', ext: 'svg',
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var txt = svgText(v, api.src.width, api.src.height);
          NV.download(new Blob([txt], { type: 'image/svg+xml' }), api.name + '-vector.svg');
          done();
        }
      },
      {
        label: 'Download PNG', ext: 'png', secondary: true,
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var id = raster(v, api.src.width, api.src.height);
          NV.blobOf(IM.canvasOf(id)).then(function (b) { NV.download(b, api.name + '-vector.png'); done(); });
        }
      },
      {
        label: 'Ink separation (ZIP)', ext: 'zip', secondary: true,
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var W = api.src.width, H = api.src.height, files = [], jobs = [];
          v.layers.forEach(function (L, i) {
            var name = 'ink-' + ('0' + (i + 1)).slice(-2) + '-' + L.color.replace('#', '');
            files.push({ name: name + '.svg', blob: new Blob([svgText(v, W, H, [L])], { type: 'image/svg+xml' }) });
            var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
            var ctx = cv.getContext('2d');
            ctx.scale(W / v.w, H / v.h);
            ctx.fillStyle = L.color;
            ctx.fill(new Path2D(L.d), 'evenodd');
            jobs.push(NV.blobOf(cv).then(function (b) { files.push({ name: name + '.png', blob: b }); }));
          });
          files.push({ name: 'combined.svg', blob: new Blob([svgText(v, W, H)], { type: 'image/svg+xml' }) });
          Promise.all(jobs).then(function () {
            return NV.zip(files);
          }).then(function (z) {
            NV.download(z, api.name + '-separation.zip');
            NV.toast(v.layers.length + ' inks separated.', 'ok');
            done();
          });
        }
      }
    ]
  });
})();
