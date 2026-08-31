/* Vectorizador: cuantiza el color, traza contornos reales y separa por capas. */
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

    if (p.modo === 'silueta') {
      pal = [IM.rgb(p.tinta)];
      map = new Int32Array(n);
      var d = work.data;
      for (i = 0; i < n; i++) {
        var lum = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]);
        var on = d[i * 4 + 3] > 128 && (p.invertir ? lum > p.umbral : lum < p.umbral);
        map[i] = on ? 0 : -1;
      }
    } else {
      var q = IM.quantize(work, p.colores, 10);
      pal = q.palette; map = q.map;
      if (p.sinFondo) {                                  // el fondo claro no es una tinta
        var fuera = {};
        pal.forEach(function (col, k) {
          if (IM.colorDistance(col[0], col[1], col[2], 255, 255, 255) < 22) fuera[k] = 1;
        });
        for (i = 0; i < n; i++) if (fuera[map[i]]) map[i] = -1;
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
        if (area(pts) < p.minima) return;
        pts = IM.rdp(pts, p.detalle);
        if (pts.length < 3) return;
        paths.push(IM.pathData(pts, p.suavizado, 2));
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
      s += '  <g id="tinta-' + (i + 1) + '" data-color="' + L.color + '">' +
        '<path fill="' + L.color + '" fill-rule="evenodd" d="' + L.d + '"/></g>\n';
    });
    return s + '</svg>\n';
  }

  NV.register({
    slug: 'vectorizador',
    name: 'Vectorizar y separar colores',
    group: 'Preparación del arte',
    tagline: 'De píxeles a curvas SVG, con una capa por tinta lista para separar.',
    icon: NV.svg('<path d="M5 19c4-1 5-9 9-11 2-1 4 0 5 2"/><rect x="2" y="17" width="4" height="4"/><rect x="18" y="5" width="4" height="4"/>'),
    intro: 'Traza el contorno exacto de cada color y lo entrega como SVG editable. La separación por capas te sirve para serigrafía, vinil de corte o para recolorear sin perder filo.',
    manual: true,
    previewMax: 1400,
    controls: [
      { k: 'seg', id: 'modo', label: 'Modo', def: 'color', heavy: true, opts: [['color', 'Por colores'], ['silueta', 'Silueta a una tinta']] },
      { k: 'range', id: 'colores', label: 'Número de tintas', min: 2, max: 24, step: 1, def: 8, unit: '', heavy: true, show: function (p) { return p.modo === 'color'; } },
      { k: 'range', id: 'umbral', label: 'Umbral de la silueta', min: 10, max: 245, step: 5, def: 128, unit: '', heavy: true, show: function (p) { return p.modo === 'silueta'; } },
      { k: 'check', id: 'invertir', label: 'Invertir la silueta', def: false, heavy: true, show: function (p) { return p.modo === 'silueta'; } },
      { k: 'color', id: 'tinta', label: 'Color de la tinta', def: '#111111', heavy: true, show: function (p) { return p.modo === 'silueta'; } },
      { k: 'check', id: 'sinFondo', label: 'Descartar el fondo blanco', def: true, heavy: true, show: function (p) { return p.modo === 'color'; } },
      { k: 'group', label: 'Trazo' },
      { k: 'range', id: 'detalle', label: 'Simplificar curvas', min: 0, max: 6, step: 0.1, def: 1, unit: ' px', dec: 1, heavy: true },
      { k: 'range', id: 'suavizado', label: 'Suavizado', min: 0, max: 1, step: 0.05, def: 0.5, unit: '', dec: 2, heavy: true },
      { k: 'range', id: 'minima', label: 'Descartar manchas menores a', min: 0, max: 400, step: 5, def: 24, unit: ' px²', heavy: true },
      { k: 'note', text: 'Pulsa Procesar después de mover los controles: el trazado es la parte pesada.' }
    ],
    process: function (c) {
      var v = vectorize(c.src, c.p);
      c.state.custom.vec = v;
      return raster(v, c.src.width, c.src.height);
    },
    exports: [
      {
        label: 'Descargar SVG', ext: 'svg',
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var txt = svgText(v, api.src.width, api.src.height);
          NV.download(new Blob([txt], { type: 'image/svg+xml' }), api.name + '-vector.svg');
          done();
        }
      },
      {
        label: 'Descargar PNG', ext: 'png', secondary: true,
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var id = raster(v, api.src.width, api.src.height);
          NV.blobOf(IM.canvasOf(id)).then(function (b) { NV.download(b, api.name + '-vector.png'); done(); });
        }
      },
      {
        label: 'Separación por tintas (ZIP)', ext: 'zip', secondary: true,
        make: function (api, done) {
          var v = api.state.custom.vec || vectorize(api.src, api.params);
          var W = api.src.width, H = api.src.height, files = [], jobs = [];
          v.layers.forEach(function (L, i) {
            var nom = 'tinta-' + ('0' + (i + 1)).slice(-2) + '-' + L.color.replace('#', '');
            files.push({ name: nom + '.svg', blob: new Blob([svgText(v, W, H, [L])], { type: 'image/svg+xml' }) });
            var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
            var ctx = cv.getContext('2d');
            ctx.scale(W / v.w, H / v.h);
            ctx.fillStyle = L.color;
            ctx.fill(new Path2D(L.d), 'evenodd');
            jobs.push(NV.blobOf(cv).then(function (b) { files.push({ name: nom + '.png', blob: b }); }));
          });
          files.push({ name: 'completo.svg', blob: new Blob([svgText(v, W, H)], { type: 'image/svg+xml' }) });
          Promise.all(jobs).then(function () {
            return NV.zip(files);
          }).then(function (z) {
            NV.download(z, api.name + '-separacion.zip');
            NV.toast(v.layers.length + ' tintas separadas.', 'ok');
            done();
          });
        }
      }
    ]
  });
})();
