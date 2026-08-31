/* Marcos y grunge: desgaste, textura y encuadres de estilo taller. */
(function () {
  'use strict';

  function distress(id, p) {
    var w = id.width, h = id.height, n = w * h, i;
    var out = IM.copy(id), q = out.data;
    var nz = IM.noise(w, h, Math.max(2, p.escala), 4, p.semilla | 0);
    var edge = null;
    if (p.soloBordes) {
      var sdf = IM.alphaSDF(id, 128);
      edge = sdf;
    }
    var thr = 1 - p.intensidad / 100;
    for (i = 0; i < n; i++) {
      var v = nz[i];
      var cut = IM.clamp((v - thr) / 0.12 + 0.5, 0, 1);
      if (edge) {
        var d = edge[i];
        var near = IM.clamp(1 - (d - 1) / Math.max(1, p.anchoBorde), 0, 1);
        cut = 1 - (1 - cut) * near;
      }
      q[i * 4 + 3] = q[i * 4 + 3] * cut;
    }
    return out;
  }

  function texture(id, p) {
    var w = id.width, h = id.height, n = w * h, i, k;
    var out = IM.copy(id), q = out.data;
    var nz = IM.noise(w, h, Math.max(2, p.escala), 5, (p.semilla | 0) + 7);
    var amt = p.intensidad / 100;
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
    var m = Math.min(w, h) * p.margen / 100;
    var g = Math.max(1, Math.min(w, h) * p.grosor / 100);
    ctx.strokeStyle = p.color; ctx.lineWidth = g;
    ctx.beginPath();
    if (p.marco === 'circulo') {
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2 - m - g / 2, 0, 6.2832);
    } else if (p.marco === 'redondo' || p.marco === 'sello') {
      var r = Math.min(w, h) * 0.06;
      var x = m + g / 2, y = m + g / 2, ww = w - 2 * x, hh = h - 2 * y;
      if (ctx.roundRect) ctx.roundRect(x, y, ww, hh, r);
      else ctx.rect(x, y, ww, hh);
    } else {
      ctx.rect(m + g / 2, m + g / 2, w - 2 * m - g, h - 2 * m - g);
    }
    ctx.stroke();
    if (p.marco === 'sello') {
      var m2 = m + g * 2.2;
      ctx.lineWidth = Math.max(1, g * 0.4);
      ctx.beginPath();
      ctx.rect(m2, m2, w - 2 * m2, h - 2 * m2);
      ctx.stroke();
    }
    return ctx.getImageData(0, 0, w, h);
  }

  NV.register({
    slug: 'marcos-grunge',
    name: 'Marcos y grunge',
    group: 'Efectos de impresión',
    tagline: 'Desgasta el diseño, añade textura sucia y enmarca con estilo de taller.',
    icon: NV.svg('<path d="M3 3h18v18H3z"/><path d="M7 8.5c1.5.6 2.5-.6 4 0s2.5 1 4 .3M7 13c2 .8 3-.7 4.5 0s2.6.9 4.5 0M8 17c1.5.5 2.4-.5 4 0"/>'),
    intro: 'El desgaste rompe el alfa con ruido fractal, igual que una plancha vieja. La textura ensucia el color sin tocar el recorte.',
    debounce: 220,
    controls: [
      { k: 'seg', id: 'efecto', label: 'Efecto', def: 'desgaste', opts: [['desgaste', 'Desgaste'], ['textura', 'Textura'], ['ninguno', 'Solo marco']] },
      { k: 'range', id: 'intensidad', label: 'Intensidad', min: 0, max: 95, step: 1, def: 40, unit: ' %', show: function (p) { return p.efecto !== 'ninguno'; } },
      { k: 'range', id: 'escala', label: 'Grano', min: 2, max: 120, step: 1, def: 18, unit: ' px', scale: true, show: function (p) { return p.efecto !== 'ninguno'; } },
      { k: 'range', id: 'semilla', label: 'Variante', min: 1, max: 60, step: 1, def: 7, unit: '', show: function (p) { return p.efecto !== 'ninguno'; } },
      { k: 'check', id: 'soloBordes', label: 'Desgastar solo el contorno', def: false, show: function (p) { return p.efecto === 'desgaste'; } },
      { k: 'range', id: 'anchoBorde', label: 'Ancho del desgaste', min: 2, max: 80, step: 1, def: 16, unit: ' px', scale: true, show: function (p) { return p.efecto === 'desgaste' && p.soloBordes; } },
      { k: 'group', label: 'Marco' },
      { k: 'select', id: 'marco', label: 'Tipo', def: 'ninguno', opts: [['ninguno', 'Sin marco'], ['recto', 'Recto'], ['redondo', 'Redondeado'], ['circulo', 'Círculo'], ['sello', 'Doble línea (sello)']] },
      { k: 'range', id: 'grosor', label: 'Grosor', min: 0.2, max: 8, step: 0.1, def: 1.5, unit: ' %', dec: 1, show: function (p) { return p.marco !== 'ninguno'; } },
      { k: 'range', id: 'margen', label: 'Margen', min: 0, max: 25, step: 0.5, def: 4, unit: ' %', dec: 1, show: function (p) { return p.marco !== 'ninguno'; } },
      { k: 'color', id: 'color', label: 'Color del marco', def: '#111111', show: function (p) { return p.marco !== 'ninguno'; } },
      { k: 'check', id: 'marcoSucio', label: 'Aplicar el desgaste también al marco', def: true, show: function (p) { return p.marco !== 'ninguno' && p.efecto === 'desgaste'; } }
    ],
    process: function (c) {
      var p = c.p, out = IM.copy(c.src);
      var conMarco = p.marco !== 'ninguno';
      if (conMarco && p.marcoSucio && p.efecto === 'desgaste') out = frame(out, p);
      if (p.efecto === 'desgaste') out = distress(out, p);
      else if (p.efecto === 'textura') out = texture(out, p);
      if (conMarco && !(p.marcoSucio && p.efecto === 'desgaste')) out = frame(out, p);
      return out;
    }
  });
})();
