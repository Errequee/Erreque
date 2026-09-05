/* Frames and grunge: distress, dirty texture and workshop-style borders. */
(function () {
  'use strict';

  function distress(id, p) {
    var w = id.width, h = id.height, n = w * h, i;
    var out = IM.copy(id), q = out.data;
    var nz = IM.noise(w, h, Math.max(2, p.grain), 4, p.seed | 0);
    var edge = p.edgeOnly ? IM.alphaSDF(id, 128) : null;
    var thr = 1 - p.amount / 100;
    for (i = 0; i < n; i++) {
      var cut = IM.clamp((nz[i] - thr) / 0.12 + 0.5, 0, 1);
      if (edge) {
        var near = IM.clamp(1 - (edge[i] - 1) / Math.max(1, p.edgeWidth), 0, 1);
        cut = 1 - (1 - cut) * near;
      }
      q[i * 4 + 3] = q[i * 4 + 3] * cut;
    }
    return out;
  }

  function texture(id, p) {
    var w = id.width, h = id.height, n = w * h, i, k;
    var out = IM.copy(id), q = out.data;
    var nz = IM.noise(w, h, Math.max(2, p.grain), 5, (p.seed | 0) + 7);
    var amt = p.amount / 100;
    for (i = 0; i < n; i++) {
      var m = 1 - (1 - nz[i]) * amt;
      for (k = 0; k < 3; k++) q[i * 4 + k] = IM.clamp(q[i * 4 + k] * m, 0, 255);
    }
    return out;
  }

  function frame(id, p) {
    var w = id.width, h = id.height;
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    ctx.putImageData(id, 0, 0);
    var m = Math.min(w, h) * p.margin / 100;
    var g = Math.max(1, Math.min(w, h) * p.weight / 100);
    ctx.strokeStyle = p.color; ctx.lineWidth = g;
    ctx.beginPath();
    if (p.frame === 'circle') {
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - m - g / 2, 0, 6.2832);
    } else if (p.frame === 'rounded' || p.frame === 'stamp') {
      var r = Math.min(w, h) * 0.06;
      var x = m + g / 2, y = m + g / 2, ww = w - 2 * x, hh = h - 2 * y;
      if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, r);
      else ctx.rect(x, y, ww, hh);
    } else {
      ctx.rect(m + g / 2, m + g / 2, w - 2 * m - g, h - 2 * m - g);
    }
    ctx.stroke();
    if (p.frame === 'stamp') {
      var m2 = m + g * 2.2;
      ctx.lineWidth = Math.max(1, g * 0.4);
      ctx.beginPath();
      ctx.rect(m2, m2, w - 2 * m2, h - 2 * m2);
      ctx.stroke();
    }
    return ctx.getImageData(0, 0, w, h);
  }

  NV.register({
    slug: 'frames-grunge',
    name: 'Frames and grunge',
    group: 'Print effects',
    tagline: 'Distress the artwork, add dirty texture and frame it with workshop character.',
    icon: NV.svg('<path d="M3 3h18v18H3z"/><path d="M7 8.5c1.5.6 2.5-.6 4 0s2.5 1 4 .3M7 13c2 .8 3-.7 4.5 0s2.6.9 4.5 0M8 17c1.5.5 2.4-.5 4 0"/>'),
    intro: 'Distress breaks up the alpha with fractal noise, the way a worn plate does. Texture dirties the colour without touching the cutout.',
    debounce: 220,
    controls: [
      { k: 'seg', id: 'effect', label: 'Effect', def: 'distress', opts: [['distress', 'Distress'], ['texture', 'Texture'], ['none', 'Frame only']] },
      { k: 'range', id: 'amount', label: 'Amount', min: 0, max: 95, step: 1, def: 40, unit: ' %', show: function (p) { return p.effect !== 'none'; } },
      { k: 'range', id: 'grain', label: 'Grain', min: 2, max: 120, step: 1, def: 18, unit: ' px', scale: true, show: function (p) { return p.effect !== 'none'; } },
      { k: 'range', id: 'seed', label: 'Variant', min: 1, max: 60, step: 1, def: 7, unit: '', show: function (p) { return p.effect !== 'none'; } },
      { k: 'check', id: 'edgeOnly', label: 'Distress the contour only', def: false, show: function (p) { return p.effect === 'distress'; } },
      { k: 'range', id: 'edgeWidth', label: 'Distress width', min: 2, max: 80, step: 1, def: 16, unit: ' px', scale: true, show: function (p) { return p.effect === 'distress' && p.edgeOnly; } },
      { k: 'group', label: 'Frame' },
      { k: 'select', id: 'frame', label: 'Type', def: 'none', opts: [['none', 'No frame'], ['square', 'Square'], ['rounded', 'Rounded'], ['circle', 'Circle'], ['stamp', 'Double line (stamp)']] },
      { k: 'range', id: 'weight', label: 'Weight', min: 0.2, max: 8, step: 0.1, def: 1.5, unit: ' %', dec: 1, show: function (p) { return p.frame !== 'none'; } },
      { k: 'range', id: 'margin', label: 'Margin', min: 0, max: 25, step: 0.5, def: 4, unit: ' %', dec: 1, show: function (p) { return p.frame !== 'none'; } },
      { k: 'color', id: 'color', label: 'Frame colour', def: '#111111', show: function (p) { return p.frame !== 'none'; } },
      { k: 'check', id: 'distressFrame', label: 'Distress the frame too', def: true, show: function (p) { return p.frame !== 'none' && p.effect === 'distress'; } }
    ],
    process: function (c) {
      var p = c.p, out = IM.copy(c.src);
      var framed = p.frame !== 'none';
      if (framed && p.distressFrame && p.effect === 'distress') out = frame(out, p);
      if (p.effect === 'distress') out = distress(out, p);
      else if (p.effect === 'texture') out = texture(out, p);
      if (framed && !(p.distressFrame && p.effect === 'distress')) out = frame(out, p);
      return out;
    }
  });
})();
