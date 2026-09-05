/* Format converter with control over quality and file size. */
(function () {
  'use strict';
  var TYPES = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

  function build(src, p, preview) {
    var w = src.width, h = src.height;
    var lim = p.capSize ? p.maxSide : 0;
    if (preview) lim = lim ? Math.min(lim, 1500) : Math.min(Math.max(w, h), 1500);
    if (lim && Math.max(w, h) > lim) {
      var k = lim / Math.max(w, h);
      w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    }
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    if (p.format === 'jpeg' || p.flatten) { ctx.fillStyle = p.color; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(IM.resize(src, w, h), 0, 0);
    return cv;
  }

  NV.register({
    slug: 'convert',
    name: 'Format converter',
    group: 'Artwork prep',
    tagline: 'PNG, JPG and WEBP with control over quality, weight and background.',
    icon: NV.svg('<path d="M4 7h11l-3-3M20 17H9l3 3"/><path d="M4 7v3M20 17v-3"/>'),
    intro: 'PNG keeps transparency; JPG weighs less but flattens the background; WEBP gives the best weight for catalogues and social media.',
    debounce: 150,
    controls: [
      { k: 'seg', id: 'format', label: 'Output format', def: 'png', opts: [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WEBP']] },
      { k: 'note', text: 'JPG has no transparency: the background is flattened with the colour you choose.', show: function (p) { return p.format === 'jpeg'; } },
      { k: 'range', id: 'quality', label: 'Quality', min: 30, max: 100, step: 1, def: 92, unit: ' %', show: function (p) { return p.format !== 'png'; } },
      { k: 'check', id: 'flatten', label: 'Flatten the background even when the format supports alpha', def: false, show: function (p) { return p.format !== 'jpeg'; } },
      { k: 'color', id: 'color', label: 'Background colour', def: '#ffffff', show: function (p) { return p.format === 'jpeg' || p.flatten; } },
      { k: 'group', label: 'Size' },
      { k: 'check', id: 'capSize', label: 'Cap the longest side', def: false },
      { k: 'num', id: 'maxSide', label: 'Maximum side', unit: 'px', def: 2000, min: 64, max: 12000, step: 50, show: function (p) { return p.capSize; } },
      { k: 'num', id: 'dpi', label: 'DPI to write into the PNG', unit: 'DPI', def: 300, min: 30, max: 1200, step: 10, show: function (p) { return p.format === 'png'; } }
    ],
    process: function (c) {
      var cv = build(c.src, c.p, c.preview);
      return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    },
    exports: [{
      label: 'Download file',
      make: function (api, done) {
        var p = api.params, cv = build(api.src, p, false);
        NV.blobOf(cv, TYPES[p.format], p.quality / 100).then(function (b) {
          return p.format === 'png' ? NV.pngWithDpi(b, p.dpi) : b;
        }).then(function (b) {
          NV.toast('Final weight: ' + (b.size / 1024 > 1024 ? (b.size / 1048576).toFixed(2) + ' MB' : Math.round(b.size / 1024) + ' KB'), 'ok');
          NV.download(b, api.name + '.' + (p.format === 'jpeg' ? 'jpg' : p.format));
          done();
        });
      }
    }]
  });
})();
