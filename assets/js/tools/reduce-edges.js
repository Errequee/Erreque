/* Reduce edges: contracts the contour and removes the halo left by a cutout. */
(function () {
  'use strict';

  /* Connected-component labelling over a binary mask. */
  function components(mask, w, h) {
    var lab = new Int32Array(w * h).fill(-1), sizes = [], stack = [], i, n = w * h;
    for (i = 0; i < n; i++) {
      if (!mask[i] || lab[i] >= 0) continue;
      var id = sizes.length, count = 0;
      stack.push(i); lab[i] = id;
      while (stack.length) {
        var c = stack.pop(); count++;
        var x = c % w, y = (c / w) | 0;
        if (x > 0 && mask[c - 1] && lab[c - 1] < 0) { lab[c - 1] = id; stack.push(c - 1); }
        if (x < w - 1 && mask[c + 1] && lab[c + 1] < 0) { lab[c + 1] = id; stack.push(c + 1); }
        if (y > 0 && mask[c - w] && lab[c - w] < 0) { lab[c - w] = id; stack.push(c - w); }
        if (y < h - 1 && mask[c + w] && lab[c + w] < 0) { lab[c + w] = id; stack.push(c + w); }
      }
      sizes.push(count);
    }
    return { lab: lab, sizes: sizes };
  }

  function clean(id, specks, holes, thr) {
    var w = id.width, h = id.height, n = w * h, p = id.data, i;
    var out = IM.copy(id), q = out.data;
    if (specks > 0) {
      var solid = new Uint8Array(n);
      for (i = 0; i < n; i++) solid[i] = p[i * 4 + 3] >= thr ? 1 : 0;
      var cs = components(solid, w, h);
      for (i = 0; i < n; i++) if (cs.lab[i] >= 0 && cs.sizes[cs.lab[i]] < specks) q[i * 4 + 3] = 0;
    }
    if (holes > 0) {
      var empty = new Uint8Array(n);
      for (i = 0; i < n; i++) empty[i] = q[i * 4 + 3] < thr ? 1 : 0;
      var ch = components(empty, w, h);
      var edge = {};
      for (i = 0; i < w; i++) { if (ch.lab[i] >= 0) edge[ch.lab[i]] = 1; if (ch.lab[(h - 1) * w + i] >= 0) edge[ch.lab[(h - 1) * w + i]] = 1; }
      for (i = 0; i < h; i++) { if (ch.lab[i * w] >= 0) edge[ch.lab[i * w]] = 1; if (ch.lab[i * w + w - 1] >= 0) edge[ch.lab[i * w + w - 1]] = 1; }
      var bled = IM.bleed(out, thr).data;
      for (i = 0; i < n; i++) {
        var L = ch.lab[i];
        if (L >= 0 && !edge[L] && ch.sizes[L] < holes) {
          q[i * 4] = bled[i * 4]; q[i * 4 + 1] = bled[i * 4 + 1]; q[i * 4 + 2] = bled[i * 4 + 2];
          q[i * 4 + 3] = 255;
        }
      }
    }
    return out;
  }

  NV.register({
    slug: 'reduce-edges',
    name: 'Reduce edges',
    group: 'Cutout cleanup',
    tagline: 'Shrink the contour, kill the halo and clear the specks a cutout leaves behind.',
    icon: NV.svg('<path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><path d="M8 8h8v8H8z"/><path d="m9.5 12 2 2 3.5-4"/>'),
    intro: 'A cutout leaves a rim of pixels from the old background. Shrink by 1 or 2 pixels and apply defringe: the halo goes without eating into the artwork.',
    controls: [
      { k: 'range', id: 'radius', label: 'Shrink contour', min: -6, max: 6, step: 0.25, def: 1, unit: ' px', dec: 2, scale: true },
      { k: 'note', text: 'Negative values grow the artwork instead of trimming it.' },
      { k: 'range', id: 'feather', label: 'Edge softness', min: 0, max: 4, step: 0.1, def: 1, unit: ' px', dec: 1, scale: true },
      { k: 'range', id: 'defringe', label: 'Defringe (removes halo)', min: 0, max: 100, step: 1, def: 70, unit: ' %' },
      { k: 'group', label: 'Cleanup' },
      { k: 'range', id: 'specks', label: 'Erase specks smaller than', min: 0, max: 400, step: 5, def: 0, unit: ' px²', scale: 2 },
      { k: 'range', id: 'holes', label: 'Fill holes smaller than', min: 0, max: 400, step: 5, def: 0, unit: ' px²', scale: 2 },
      { k: 'group', label: 'Fine tuning' },
      { k: 'range', id: 'threshold', label: 'Edge threshold', min: 8, max: 240, step: 2, def: 128, unit: '' },
      { k: 'note', text: 'Raise the threshold if the contour carries a lot of partial transparency.' }
    ],
    process: function (c) {
      var out = c.src;
      if (c.p.specks > 0 || c.p.holes > 0) out = clean(out, c.p.specks, c.p.holes, c.p.threshold);
      if (c.p.defringe > 0) out = IM.defringe(out, c.p.defringe / 100, 250);
      if (c.p.radius < 0) out = IM.bleed(out, c.p.threshold);
      if (Math.abs(c.p.radius) > 0.001 || c.p.feather > 0.05) out = IM.reshapeAlpha(out, c.p.radius, c.p.feather, c.p.threshold);
      return out === c.src ? IM.copy(c.src) : out;
    }
  });
})();
