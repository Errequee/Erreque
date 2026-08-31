/* Redimensionar: tamaño físico real, con DPI grabado en el PNG. */
(function () {
  'use strict';
  var CM = 2.54;

  function targetPx(p, src) {
    var d = Math.max(10, p.dpi || 300);
    if (p.unidad === 'px') return { w: Math.round(p.ancho), h: Math.round(p.alto) };
    if (p.unidad === 'cm') return { w: Math.round(p.ancho / CM * d), h: Math.round(p.alto / CM * d) };
    return { w: Math.round(p.ancho * d), h: Math.round(p.alto * d) };
  }

  NV.register({
    slug: 'redimensionar',
    name: 'Redimensionar',
    group: 'Preparación del arte',
    tagline: 'Ajusta a centímetros reales, fija los DPI y encuadra sin deformar.',
    icon: NV.svg('<path d="M3 3h11v11H3z"/><path d="M10 10h11v11H10z"/>'),
    intro: 'Escribe el tamaño en centímetros y los DPI: el PNG sale con la resolución física grabada, así el RIP lo coloca al tamaño correcto.',
    debounce: 200,
    controls: [
      { k: 'seg', id: 'unidad', label: 'Unidad', def: 'cm', opts: [['cm', 'Centímetros'], ['in', 'Pulgadas'], ['px', 'Píxeles']] },
      { k: 'num', id: 'ancho', label: 'Ancho', def: 20, min: 0.1, step: 0.1 },
      { k: 'num', id: 'alto', label: 'Alto', def: 20, min: 0.1, step: 0.1 },
      { k: 'check', id: 'proporcion', label: 'Mantener proporción', def: true },
      { k: 'num', id: 'dpi', label: 'Resolución', unit: 'DPI', def: 300, min: 30, max: 1200, step: 10 },
      { k: 'note', text: 'Para DTF y serigrafía, 300 DPI al tamaño final es el estándar. Por debajo de 150 se nota el pixelado.' },
      { k: 'group', label: 'Encuadre' },
      { k: 'seg', id: 'modo', label: 'Cómo encajar', def: 'ajustar', opts: [['ajustar', 'Ajustar'], ['rellenar', 'Rellenar'], ['estirar', 'Estirar']] },
      { k: 'check', id: 'fondo', label: 'Fondo de color en vez de transparente', def: false },
      { k: 'color', id: 'color', label: 'Color de fondo', def: '#ffffff', show: function (p) { return p.fondo; } }
    ],
    onControl: function (c, p, state) {
      if (!state.full) return;
      var ar = state.full.width / state.full.height;
      if (c.id === 'unidad') {
        var d = p.dpi;
        var wpx = state.full.width, hpx = state.full.height;
        if (p.unidad === 'px') { p.ancho = wpx; p.alto = hpx; }
        else if (p.unidad === 'cm') { p.ancho = +(wpx / d * CM).toFixed(1); p.alto = +(hpx / d * CM).toFixed(1); }
        else { p.ancho = +(wpx / d).toFixed(2); p.alto = +(hpx / d).toFixed(2); }
        return;
      }
      if (!p.proporcion) return;
      if (c.id === 'ancho') p.alto = +(p.ancho / ar).toFixed(p.unidad === 'px' ? 0 : 2);
      else if (c.id === 'alto') p.ancho = +(p.alto * ar).toFixed(p.unidad === 'px' ? 0 : 2);
      else if (c.id === 'proporcion') p.alto = +(p.ancho / ar).toFixed(p.unidad === 'px' ? 0 : 2);
    },
    process: function (c) {
      var t = targetPx(c.p, c.src);
      var W = IM.clamp(t.w, 1, 20000), H = IM.clamp(t.h, 1, 20000);
      if (c.preview) {
        var lim = 1500, m = Math.max(W, H);
        if (m > lim) { W = Math.max(1, Math.round(W * lim / m)); H = Math.max(1, Math.round(H * lim / m)); }
      }
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d');
      if (c.p.fondo) { ctx.fillStyle = c.p.color; ctx.fillRect(0, 0, W, H); }
      var sw = c.src.width, sh = c.src.height, dw = W, dh = H, dx = 0, dy = 0;
      if (c.p.modo !== 'estirar') {
        var k = c.p.modo === 'rellenar' ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh);
        dw = sw * k; dh = sh * k; dx = (W - dw) / 2; dy = (H - dh) / 2;
      }
      var pre = IM.resize(c.src, Math.max(1, Math.round(dw)), Math.max(1, Math.round(dh)));
      ctx.drawImage(pre, dx, dy);
      return ctx.getImageData(0, 0, W, H);
    }
  });
})();
