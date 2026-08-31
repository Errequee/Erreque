/* Semitransparencias: convierte el alfa parcial en opaco o transparente. */
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
    slug: 'semitransparencias',
    name: 'Quitar semitransparencias',
    group: 'Limpieza de recortes',
    tagline: 'Detecta el alfa parcial que la impresora no puede imprimir y lo vuelve sólido.',
    icon: NV.svg('<path d="M3 3h8v8H3z"/><path d="M13 13h8v8h-8z"/><path d="M13 3h8v8h-8z" stroke-dasharray="2 2"/><path d="M3 13h8v8H3z" stroke-dasharray="2 2"/>'),
    intro: 'La tinta blanca no imprime medios tonos de alfa: se ve sucia o con bordes grises. Aquí decides qué se queda sólido y qué desaparece.',
    controls: [
      { k: 'seg', id: 'modo', label: 'Modo', def: 'rango', opts: [['rango', 'Por rango'], ['duro', 'Corte duro'], ['solido', 'Todo sólido']] },
      { k: 'range', id: 'lo', label: 'Borrar por debajo de', min: 0, max: 254, step: 1, def: 40, unit: ' alfa', show: function (p) { return p.modo !== 'solido'; } },
      { k: 'range', id: 'hi', label: 'Solidificar por encima de', min: 1, max: 255, step: 1, def: 200, unit: ' alfa', show: function (p) { return p.modo === 'rango'; } },
      { k: 'note', text: 'En “corte duro” todo lo intermedio salta a sólido o a transparente, sin degradados.', show: function (p) { return p.modo === 'duro'; } },
      { k: 'note', text: 'En “todo sólido” cualquier píxel con algo de alfa queda al 100 %. Útil para siluetas y bases de blanco.', show: function (p) { return p.modo === 'solido'; } },
      { k: 'group', label: 'Acabado' },
      { k: 'range', id: 'desfleque', label: 'Desfleque del contorno', min: 0, max: 100, step: 1, def: 60, unit: ' %' },
      { k: 'range', id: 'radio', label: 'Contraer contorno', min: -3, max: 3, step: 0.25, def: 0, unit: ' px', dec: 2, scale: true },
      { k: 'check', id: 'ver', label: 'Ver zonas semitransparentes en magenta', def: false },
      { k: 'note', text: 'El diagnóstico marca en magenta todo píxel con alfa parcial. Desactívalo para ver el resultado real.' }
    ],
    process: function (c) {
      var p = c.p, lo = p.lo, hi = p.hi;
      if (p.modo === 'solido') { lo = 0; hi = 1; }
      else if (p.modo === 'duro') { hi = Math.max(lo + 1, lo + 2); }
      if (p.ver) return heat(c.src, 8, 248);
      var out = IM.alphaLevels(c.src, lo, hi, p.modo === 'duro');
      if (p.desfleque > 0) out = IM.defringe(out, p.desfleque / 100, 250);
      if (Math.abs(p.radio) > 0.001) out = IM.reshapeAlpha(out, p.radio, 0.8, 128);
      return out;
    }
  });
})();
