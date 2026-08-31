/* Reducir bordes: contrae el contorno y elimina el halo del recorte. */
(function () {
  'use strict';

  /* Etiquetado de componentes sobre una máscara binaria. */
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

  function clean(id, motas, huecos, thr) {
    var w = id.width, h = id.height, n = w * h, p = id.data, i;
    var out = IM.copy(id), q = out.data;
    if (motas > 0) {
      var solid = new Uint8Array(n);
      for (i = 0; i < n; i++) solid[i] = p[i * 4 + 3] >= thr ? 1 : 0;
      var cs = components(solid, w, h);
      for (i = 0; i < n; i++) if (cs.lab[i] >= 0 && cs.sizes[cs.lab[i]] < motas) q[i * 4 + 3] = 0;
    }
    if (huecos > 0) {
      var empty = new Uint8Array(n);
      for (i = 0; i < n; i++) empty[i] = q[i * 4 + 3] < thr ? 1 : 0;
      var ch = components(empty, w, h);
      var borde = {};
      for (i = 0; i < w; i++) { if (ch.lab[i] >= 0) borde[ch.lab[i]] = 1; if (ch.lab[(h - 1) * w + i] >= 0) borde[ch.lab[(h - 1) * w + i]] = 1; }
      for (i = 0; i < h; i++) { if (ch.lab[i * w] >= 0) borde[ch.lab[i * w]] = 1; if (ch.lab[i * w + w - 1] >= 0) borde[ch.lab[i * w + w - 1]] = 1; }
      var bled = IM.bleed(out, thr).data;
      for (i = 0; i < n; i++) {
        var L = ch.lab[i];
        if (L >= 0 && !borde[L] && ch.sizes[L] < huecos) {
          q[i * 4] = bled[i * 4]; q[i * 4 + 1] = bled[i * 4 + 1]; q[i * 4 + 2] = bled[i * 4 + 2];
          q[i * 4 + 3] = 255;
        }
      }
    }
    return out;
  }

  NV.register({
    slug: 'reducir-bordes',
    name: 'Reducir bordes',
    group: 'Limpieza de recortes',
    tagline: 'Contrae el contorno, borra el halo y limpia las motas del recorte.',
    icon: NV.svg('<path d="M4 4h16v16H4z" stroke-dasharray="3 3"/><path d="M8 8h8v8H8z"/><path d="m9.5 12 2 2 3.5-4"/>'),
    intro: 'Un recorte deja un filo de píxeles del fondo viejo. Contrae 1 o 2 píxeles y aplica desfleque: el halo desaparece sin comerse el diseño.',
    controls: [
      { k: 'range', id: 'radio', label: 'Contraer contorno', min: -6, max: 6, step: 0.25, def: 1, unit: ' px', dec: 2, scale: true },
      { k: 'note', text: 'Valores negativos expanden el diseño en lugar de recortarlo.' },
      { k: 'range', id: 'suave', label: 'Suavizado del filo', min: 0, max: 4, step: 0.1, def: 1, unit: ' px', dec: 1, scale: true },
      { k: 'range', id: 'desfleque', label: 'Desfleque (quita halo)', min: 0, max: 100, step: 1, def: 70, unit: ' %' },
      { k: 'group', label: 'Limpieza' },
      { k: 'range', id: 'motas', label: 'Borrar motas menores a', min: 0, max: 400, step: 5, def: 0, unit: ' px²', scale: 2 },
      { k: 'range', id: 'huecos', label: 'Rellenar huecos menores a', min: 0, max: 400, step: 5, def: 0, unit: ' px²', scale: 2 },
      { k: 'group', label: 'Ajuste fino' },
      { k: 'range', id: 'umbral', label: 'Umbral de borde', min: 8, max: 240, step: 2, def: 128, unit: '' },
      { k: 'note', text: 'Sube el umbral si el contorno trae mucha transparencia parcial.' }
    ],
    process: function (c) {
      var out = c.src;
      if (c.p.motas > 0 || c.p.huecos > 0) out = clean(out, c.p.motas, c.p.huecos, c.p.umbral);
      if (c.p.desfleque > 0) out = IM.defringe(out, c.p.desfleque / 100, 250);
      if (c.p.radio < 0) out = IM.bleed(out, c.p.umbral);
      if (Math.abs(c.p.radio) > 0.001 || c.p.suave > 0.05) out = IM.reshapeAlpha(out, c.p.radio, c.p.suave, c.p.umbral);
      return out === c.src ? IM.copy(c.src) : out;
    }
  });
})();
