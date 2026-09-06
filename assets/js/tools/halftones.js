/* Halftones: dot screens and fades for DTF and screen printing. */
(function () {
  'use strict';

  var ANG = { c: 15, m: 75, y: 0, k: 45 };

  function shapePath(ctx, x, y, r, shape) {
    if (shape === 'circle') { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, 6.2832); return; }
    if (shape === 'square') { ctx.rect(x - r * 0.886, y - r * 0.886, r * 1.772, r * 1.772); return; }
    if (shape === 'diamond') {
      var d = r * 1.25;
      ctx.moveTo(x, y - d); ctx.lineTo(x + d, y); ctx.lineTo(x, y + d); ctx.lineTo(x - d, y); ctx.closePath();
      return;
    }
    if (shape === 'cross') {
      var a = r * 1.3, b = r * 0.42;
      ctx.rect(x - a, y - b, a * 2, b * 2); ctx.rect(x - b, y - a, b * 2, a * 2);
      return;
    }
    ctx.rect(x - r * 1.6, y - r * 0.9, r * 3.2, r * 1.8);   // line
  }

  /* Average coverage of one cell: luminance and alpha from the source. */
  function sampler(id) {
    var w = id.width, h = id.height, p = id.data;
    return function (cx, cy, half) {
      var x0 = Math.max(0, Math.floor(cx - half)), x1 = Math.min(w - 1, Math.ceil(cx + half));
      var y0 = Math.max(0, Math.floor(cy - half)), y1 = Math.min(h - 1, Math.ceil(cy + half));
      if (x1 < x0 || y1 < y0) return null;
      var lum = 0, al = 0, r = 0, g = 0, b = 0, n = 0, x, y, i;
      var step = Math.max(1, Math.floor((x1 - x0) / 6));
      for (y = y0; y <= y1; y += step) for (x = x0; x <= x1; x += step) {
        i = (y * w + x) * 4;
        var a = p[i + 3] / 255;
        lum += (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255 * a;
        r += p[i] * a; g += p[i + 1] * a; b += p[i + 2] * a;
        al += a; n++;
      }
      if (!n) return null;
      return { lum: lum / n, a: al / n, r: al ? r / al : 0, g: al ? g / al : 0, b: al ? b / al : 0 };
    };
  }

  function ramp(p, x, y, w, h) {
    var t;
    if (p.dir === 'down') t = y / h;
    else if (p.dir === 'up') t = 1 - y / h;
    else if (p.dir === 'right') t = x / w;
    else if (p.dir === 'left') t = 1 - x / w;
    else {
      var dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      t = Math.min(1, Math.sqrt(dx * dx + dy * dy));
    }
    var start = p.start / 100, end = p.end / 100;
    if (end <= start) end = start + 0.001;
    return IM.clamp((t - start) / (end - start), 0, 1);
  }

  function pass(ctx, src, p, cellPx, angleDeg, color, chan) {
    var w = src.width, h = src.height;
    var smp = sampler(src);
    var a = angleDeg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    var diag = Math.ceil(Math.sqrt(w * w + h * h) / cellPx) + 2;
    ctx.fillStyle = color || '#000';
    ctx.beginPath();
    for (var i = -diag; i <= diag; i++) for (var j = -diag; j <= diag; j++) {
      var x = (i * cs - j * sn) * cellPx + w / 2;
      var y = (i * sn + j * cs) * cellPx + h / 2;
      if (x < -cellPx || y < -cellPx || x > w + cellPx || y > h + cellPx) continue;
      var s = smp(x, y, cellPx / 2);
      if (!s || s.a < 0.02) continue;
      var cover = 1;
      if (p.mode === 'tone' || p.mode === 'both') {
        cover = chan ? chan(s) : (1 - s.lum / Math.max(0.001, s.a));
        cover = IM.clamp(cover, 0, 1) * s.a;
      } else cover = s.a;
      if (p.mode === 'fade' || p.mode === 'both') cover *= (1 - ramp(p, x, y, w, h));
      if (cover <= 0.004) continue;
      var r = 0.708 * cellPx * Math.sqrt(cover) * (p.weight / 100);
      if (p.ink === 'original') {
        ctx.fill(); ctx.beginPath();
        ctx.fillStyle = 'rgb(' + (s.r | 0) + ',' + (s.g | 0) + ',' + (s.b | 0) + ')';
        shapePath(ctx, x, y, r, p.shape);
        ctx.fill(); ctx.beginPath();
        continue;
      }
      shapePath(ctx, x, y, r, p.shape);
    }
    ctx.fill();
  }

  NV.register({
    slug: 'halftones',
    name: 'Halftones and fades',
    group: 'Print effects',
    tagline: 'Dot screens with angle and shape, and gradients that dissolve into dots.',
    icon: NV.svg('<circle cx="6" cy="6" r="3"/><circle cx="17" cy="6" r="2.2"/><circle cx="6" cy="17" r="2.2"/><circle cx="17" cy="17" r="1.2"/>'),
    intro: 'A dot fade is the right way to make a gradient in DTF: the printer cannot print partial alpha, but it can print solid dots that get smaller.',
    debounce: 160,
    controls: [
      { k: 'seg', id: 'mode', label: 'What to do', def: 'fade', opts: [['fade', 'Fade out'], ['tone', 'Screen tones'], ['both', 'Both']] },
      { k: 'range', id: 'cell', label: 'Dot size', min: 2, max: 40, step: 0.5, def: 8, unit: ' px', dec: 1, scale: true },
      { k: 'range', id: 'weight', label: 'Dot weight', min: 40, max: 160, step: 1, def: 100, unit: ' %' },
      { k: 'select', id: 'shape', label: 'Shape', def: 'circle', opts: [['circle', 'Circle'], ['square', 'Square'], ['diamond', 'Diamond'], ['cross', 'Cross'], ['line', 'Line']] },
      { k: 'range', id: 'angle', label: 'Screen angle', min: 0, max: 90, step: 1, def: 45, unit: '°' },
      { k: 'group', label: 'Fade', show: function (p) { return p.mode !== 'tone'; } },
      { k: 'select', id: 'dir', label: 'Direction', def: 'down', show: function (p) { return p.mode !== 'tone'; }, opts: [['down', 'Downward'], ['up', 'Upward'], ['right', 'To the right'], ['left', 'To the left'], ['center', 'Out from the centre']] },
      { k: 'range', id: 'start', label: 'Fade starts at', min: 0, max: 100, step: 1, def: 35, unit: ' %', show: function (p) { return p.mode !== 'tone'; } },
      { k: 'range', id: 'end', label: 'Fully gone at', min: 0, max: 100, step: 1, def: 95, unit: ' %', show: function (p) { return p.mode !== 'tone'; } },
      { k: 'group', label: 'Colour' },
      { k: 'seg', id: 'ink', label: 'Dot ink', def: 'original', opts: [['original', 'Original'], ['solid', 'One colour'], ['cmyk', 'CMYK']] },
      { k: 'color', id: 'tint', label: 'Ink colour', def: '#111111', show: function (p) { return p.ink === 'solid'; } },
      { k: 'note', text: 'CMYK splits into four screens at the classic angles (C 15°, M 75°, Y 0°, K 45°) to avoid moiré.', show: function (p) { return p.ink === 'cmyk'; } }
    ],
    process: function (c) {
      var src = c.src, w = src.width, h = src.height, p = c.p;
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      var ctx = cv.getContext('2d');
      var cell = Math.max(1.2, p.cell);
      if (p.ink === 'cmyk') {
        ctx.globalCompositeOperation = 'source-over';
        var chans = [
          ['c', '#00AEEF', function (s) { return IM.clamp(1 - s.r / 255, 0, 1); }],
          ['m', '#EC008C', function (s) { return IM.clamp(1 - s.g / 255, 0, 1); }],
          ['y', '#FFF200', function (s) { return IM.clamp(1 - s.b / 255, 0, 1); }],
          ['k', '#231F20', function (s) { return IM.clamp(1 - Math.max(s.r, s.g, s.b) / 255, 0, 1); }]
        ];
        ctx.globalAlpha = 0.9;
        chans.forEach(function (ch) {
          var pp = Object.assign({}, p, { mode: p.mode === 'fade' ? 'both' : p.mode });
          pass(ctx, src, pp, cell, ANG[ch[0]], ch[1], ch[2]);
        });
        ctx.globalAlpha = 1;
      } else {
        pass(ctx, src, p, cell, p.angle, p.ink === 'solid' ? p.tint : '#000');
      }
      return ctx.getImageData(0, 0, w, h);
    }
  });
})();
