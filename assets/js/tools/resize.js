/* Resize: real physical size, with the DPI written into the PNG. */
(function () {
  'use strict';
  var CM = 2.54;

  function targetPx(p) {
    var d = Math.max(10, p.dpi || 300);
    if (p.unit === 'px') return { w: Math.round(p.width), h: Math.round(p.height) };
    if (p.unit === 'cm') return { w: Math.round(p.width / CM * d), h: Math.round(p.height / CM * d) };
    return { w: Math.round(p.width * d), h: Math.round(p.height * d) };
  }

  NV.register({
    slug: 'resize',
    name: 'Resize',
    group: 'Artwork prep',
    tagline: 'Set the real size in centimetres or inches, fix the DPI and frame it without distortion.',
    icon: NV.svg('<path d="M3 3h11v11H3z"/><path d="M10 10h11v11H10z"/>'),
    intro: 'Type the size in centimetres or inches and the DPI: the PNG comes out with the physical resolution written in, so the RIP places it at the right size.',
    debounce: 200,
    controls: [
      { k: 'seg', id: 'unit', label: 'Unit', def: 'cm', opts: [['cm', 'Centimetres'], ['in', 'Inches'], ['px', 'Pixels']] },
      { k: 'num', id: 'width', label: 'Width', def: 20, min: 0.1, step: 0.1 },
      { k: 'num', id: 'height', label: 'Height', def: 20, min: 0.1, step: 0.1 },
      { k: 'check', id: 'lock', label: 'Keep proportions', def: true },
      { k: 'num', id: 'dpi', label: 'Resolution', unit: 'DPI', def: 300, min: 30, max: 1200, step: 10 },
      { k: 'note', text: 'For DTF and screen printing, 300 DPI at final size is the standard. Below 150 the pixels start to show.' },
      { k: 'group', label: 'Framing' },
      { k: 'seg', id: 'fit', label: 'How to fit', def: 'contain', opts: [['contain', 'Fit'], ['cover', 'Fill'], ['stretch', 'Stretch']] },
      { k: 'check', id: 'flatten', label: 'Solid background instead of transparent', def: false },
      { k: 'color', id: 'color', label: 'Background colour', def: '#ffffff', show: function (p) { return p.flatten; } }
    ],
    onControl: function (c, p, state) {
      if (!state.full) return;
      var ar = state.full.width / state.full.height;
      if (c.id === 'unit') {
        var d = p.dpi, wpx = state.full.width, hpx = state.full.height;
        if (p.unit === 'px') { p.width = wpx; p.height = hpx; }
        else if (p.unit === 'cm') { p.width = +(wpx / d * CM).toFixed(1); p.height = +(hpx / d * CM).toFixed(1); }
        else { p.width = +(wpx / d).toFixed(2); p.height = +(hpx / d).toFixed(2); }
        return;
      }
      if (!p.lock) return;
      if (c.id === 'width') p.height = +(p.width / ar).toFixed(p.unit === 'px' ? 0 : 2);
      else if (c.id === 'height') p.width = +(p.height * ar).toFixed(p.unit === 'px' ? 0 : 2);
      else if (c.id === 'lock') p.height = +(p.width / ar).toFixed(p.unit === 'px' ? 0 : 2);
    },
    process: function (c) {
      var t = targetPx(c.p);
      var W = IM.clamp(t.w, 1, 20000), H = IM.clamp(t.h, 1, 20000);
      if (c.preview) {
        var lim = 1500, m = Math.max(W, H);
        if (m > lim) { W = Math.max(1, Math.round(W * lim / m)); H = Math.max(1, Math.round(H * lim / m)); }
      }
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      if (c.p.flatten) { ctx.fillStyle = c.p.color; ctx.fillRect(0, 0, W, H); }
      var sw = c.src.width, sh = c.src.height, dw = W, dh = H, dx = 0, dy = 0;
      if (c.p.fit !== 'stretch') {
        var k = c.p.fit === 'cover' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
        dw = sw * k; dh = sh * k; dx = (W - dw) / 2; dy = (H - dh) / 2;
      }
      var pre = IM.resize(c.src, Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
      ctx.drawImage(pre, dx, dy);
      return ctx.getImageData(0, 0, W, H);
    }
  });
})();
