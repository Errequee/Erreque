/* Conversor de formatos con control de calidad y peso. */
(function () {
  'use strict';
  var TYPES = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };

  function build(src, p, preview) {
    var w = src.width, h = src.height;
    var lim = p.limite ? p.maxlado : 0;
    if (preview) lim = lim ? Math.min(lim, 1500) : Math.min(Math.max(w, h), 1500);
    if (lim && Math.max(w, h) > lim) {
      var k = lim / Math.max(w, h);
      w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
    }
    var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    if (p.formato === 'jpeg' || p.plano) { ctx.fillStyle = p.color; ctx.fillRect(0, 0, w, h); }
    ctx.drawImage(IM.resize(src, w, h), 0, 0);
    return cv;
  }

  NV.register({
    slug: 'conversor',
    name: 'Conversor de formatos',
    group: 'Preparación del arte',
    tagline: 'PNG, JPG y WEBP con control de calidad, peso y fondo.',
    icon: NV.svg('<path d="M4 7h11l-3-3M20 17H9l3 3"/><path d="M4 7v3M20 17v-3"/>'),
    intro: 'PNG conserva la transparencia; JPG pesa menos pero aplana el fondo; WEBP da el mejor peso para catálogos y redes.',
    debounce: 150,
    controls: [
      { k: 'seg', id: 'formato', label: 'Formato de salida', def: 'png', opts: [['png', 'PNG'], ['jpeg', 'JPG'], ['webp', 'WEBP']] },
      { k: 'note', text: 'JPG no admite transparencia: el fondo se aplana con el color elegido.', show: function (p) { return p.formato === 'jpeg'; } },
      { k: 'range', id: 'calidad', label: 'Calidad', min: 30, max: 100, step: 1, def: 92, unit: ' %', show: function (p) { return p.formato !== 'png'; } },
      { k: 'check', id: 'plano', label: 'Aplanar el fondo aunque el formato admita alfa', def: false, show: function (p) { return p.formato !== 'jpeg'; } },
      { k: 'color', id: 'color', label: 'Color de fondo', def: '#ffffff', show: function (p) { return p.formato === 'jpeg' || p.plano; } },
      { k: 'group', label: 'Tamaño' },
      { k: 'check', id: 'limite', label: 'Limitar el lado más largo', def: false },
      { k: 'num', id: 'maxlado', label: 'Lado máximo', unit: 'px', def: 2000, min: 64, max: 12000, step: 50, show: function (p) { return p.limite; } },
      { k: 'num', id: 'dpi', label: 'DPI a grabar en el PNG', unit: 'DPI', def: 300, min: 30, max: 1200, step: 10, show: function (p) { return p.formato === 'png'; } }
    ],
    process: function (c) {
      var cv = build(c.src, c.p, c.preview);
      return cv.getContext('2d').getImageData(0, 0, cv.width, cv.height);
    },
    exports: [{
      label: 'Descargar archivo',
      make: function (api, done) {
        var p = api.params, cv = build(api.src, p, false);
        NV.blobOf(cv, TYPES[p.formato], p.calidad / 100).then(function (b) {
          return p.formato === 'png' ? NV.pngWithDpi(b, p.dpi) : b;
        }).then(function (b) {
          NV.toast('Peso final: ' + (b.size / 1024 > 1024 ? (b.size / 1048576).toFixed(2) + ' MB' : Math.round(b.size / 1024) + ' KB'), 'ok');
          NV.download(b, api.name + '.' + (p.formato === 'jpeg' ? 'jpg' : p.formato));
          done();
        });
      }
    }]
  });
})();
