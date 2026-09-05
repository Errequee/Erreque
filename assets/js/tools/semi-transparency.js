/* Semi-transparency: turns partial alpha into fully solid or fully clear. */
(function () {
  'use strict';

  function heat(id, lo, hi) {
    var out = IM.copy(id), q = out.data, p = id.data, n = id.width * id.height, i, a;
    for (i = 0; i < n; i++) {
      a = p[i * 4 + 3];
      if (a > lo && a < hi) { q[i * 4] = 255; q[i * 4 + 1] = 45; q[i * 4 + 2] = 126; q[i * 4 + 3] = 255; }
      else if (a >= hi) { q[i * 4] = q[i * 4 + 1] = q[i * 4 + 2] = 40; q[i * 4 + 3] = 60; }
    }
    return out;
  }

  NV.register({
    slug: 'semi-transparency',
    name: 'Remove semi-transparency',
    group: 'Cutout cleanup',
    tagline: 'Find the partial alpha your printer cannot reproduce and make it solid.',
    icon: NV.svg('<path d="M3 3h8v8H3z"/><path d="M13 13h8v8h-8z"/><path d="M13 3h8v8h-8z" stroke-dasharray="2 2"/><path d="M3 13h8v8H3z" stroke-dasharray="2 2"/>'),
    intro: 'White ink cannot print half-tones of alpha: they come out dirty or with grey edges. Here you decide what stays solid and what disappears.',
    controls: [
      { k: 'seg', id: 'mode', label: 'Mode', def: 'range', opts: [['range', 'By range'], ['hard', 'Hard cut'], ['solid', 'All solid']] },
      { k: 'range', id: 'lo', label: 'Erase below', min: 0, max: 254, step: 1, def: 40, unit: ' alpha', show: function (p) { return p.mode !== 'solid'; } },
      { k: 'range', id: 'hi', label: 'Solidify above', min: 1, max: 255, step: 1, def: 200, unit: ' alpha', show: function (p) { return p.mode === 'range'; } },
      { k: 'note', text: 'In hard cut everything in between snaps to solid or clear, with no gradient.', show: function (p) { return p.mode === 'hard'; } },
      { k: 'note', text: 'In all solid any pixel with some alpha goes to 100 %. Handy for silhouettes and white underbases.', show: function (p) { return p.mode === 'solid'; } },
      { k: 'group', label: 'Finish' },
      { k: 'range', id: 'defringe', label: 'Contour defringe', min: 0, max: 100, step: 1, def: 60, unit: ' %' },
      { k: 'range', id: 'radius', label: 'Shrink contour', min: -3, max: 3, step: 0.25, def: 0, unit: ' px', dec: 2, scale: true },
      { k: 'check', id: 'inspect', label: 'Show semi-transparent areas in magenta', def: false },
      { k: 'note', text: 'The inspector paints every pixel with partial alpha in magenta. Turn it off to see the real result.' }
    ],
    process: function (c) {
      var p = c.p, lo = p.lo, hi = p.hi;
      if (p.mode === 'solid') { lo = 0; hi = 1; }
      else if (p.mode === 'hard') { hi = Math.max(lo + 1, lo + 2); }
      if (p.inspect) return heat(c.src, 8, 248);
      var out = IM.alphaLevels(c.src, lo, hi, p.mode === 'hard');
      if (p.defringe > 0) out = IM.defringe(out, p.defringe / 100, 250);
      if (Math.abs(p.radius) > 0.001) out = IM.reshapeAlpha(out, p.radius, 0.8, 128);
      return out;
    }
  });
})();
