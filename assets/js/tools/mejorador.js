/* Mejorador: amplía y devuelve nitidez con filtros locales. */
(function () {
  'use strict';
  NV.register({
    slug: 'mejorador',
    name: 'Mejorar y ampliar',
    group: 'Preparación del arte',
    tagline: 'Amplía hasta 4×, recupera filo y baja el ruido de las imágenes chicas.',
    icon: NV.svg('<path d="M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5"/><circle cx="12" cy="12" r="2.5"/>'),
    intro: 'Trabaja con filtros locales (remuestreo progresivo, máscara de enfoque y mediana). No inventa detalle que no exista, pero salva una imagen pixelada para imprimir.',
    debounce: 220,
    controls: [
      { k: 'seg', id: 'escala', label: 'Ampliar', def: 2, opts: [[1, '1×'], [2, '2×'], [3, '3×'], [4, '4×']] },
      { k: 'range', id: 'nitidez', label: 'Nitidez', min: 0, max: 200, step: 5, def: 70, unit: ' %' },
      { k: 'range', id: 'radio', label: 'Radio de nitidez', min: 0.4, max: 4, step: 0.1, def: 1.1, unit: ' px', dec: 1 },
      { k: 'range', id: 'umbral', label: 'Proteger zonas planas', min: 0, max: 30, step: 1, def: 4, unit: '' },
      { k: 'group', label: 'Limpieza' },
      { k: 'check', id: 'ruido', label: 'Reducir ruido y artefactos de JPG', def: false },
      { k: 'group', label: 'Color' },
      { k: 'range', id: 'contraste', label: 'Contraste', min: -50, max: 80, step: 1, def: 8, unit: '' },
      { k: 'range', id: 'saturacion', label: 'Saturación', min: -100, max: 100, step: 1, def: 10, unit: '' },
      { k: 'range', id: 'brillo', label: 'Brillo', min: -40, max: 40, step: 1, def: 0, unit: '' },
      { k: 'note', text: 'Consejo: para DTF conviene ampliar primero y afinar la nitidez al final, con el radio bajo. La vista previa es rápida; la descarga a resolución completa puede tardar unos segundos en imágenes grandes.' }
    ],
    process: function (c) {
      var s = +c.p.escala, src = c.src;
      if (!c.preview && src.width * s * src.height * s > 80e6) {
        throw new Error('la salida sería de ' + Math.round(src.width * s * src.height * s / 1e6) +
          ' MP y no cabe en memoria. Baja la ampliación o recorta la imagen primero.');
      }
      var out = s > 1
        ? IM.dataOf(IM.resize(src, src.width * s, src.height * s), Math.round(src.width * s), Math.round(src.height * s))
        : IM.copy(src);
      if (c.p.ruido) out = IM.median3(out);
      if (c.p.nitidez > 0) out = IM.unsharp(out, c.p.nitidez / 100, c.p.radio * (s > 1 ? s * 0.6 : 1), c.p.umbral);
      if (c.p.contraste || c.p.saturacion || c.p.brillo) {
        out = IM.adjust(out, { contrast: c.p.contraste, saturation: c.p.saturacion, brightness: c.p.brillo });
      }
      return out;
    }
  });
})();
