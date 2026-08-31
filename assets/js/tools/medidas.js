/* Medidas estándar: tamaños, colocaciones y equivalencias cm ↔ px. */
(function () {
  'use strict';
  var el = NV.el;

  var TALLAS = [
    ['Niño 2–3', '15 × 18', '4–5', 'Centrado, 5 cm bajo el cuello'],
    ['Niño 4–6', '18 × 22', '5–6', 'Centrado, 5 cm bajo el cuello'],
    ['Niño 8–10', '20 × 25', '6', 'Centrado, 6 cm bajo el cuello'],
    ['Niño 12–14', '22 × 28', '6–7', 'Centrado, 6 cm bajo el cuello'],
    ['Adulto XS', '24 × 30', '7', 'Centrado, 7 cm bajo el cuello'],
    ['Adulto S', '26 × 32', '7', 'Centrado, 7 cm bajo el cuello'],
    ['Adulto M', '28 × 35', '7–8', 'Centrado, 7,5 cm bajo el cuello'],
    ['Adulto L', '30 × 38', '8', 'Centrado, 8 cm bajo el cuello'],
    ['Adulto XL', '32 × 40', '8', 'Centrado, 8 cm bajo el cuello'],
    ['Adulto 2XL', '33 × 42', '8–9', 'Centrado, 8,5 cm bajo el cuello'],
    ['Adulto 3XL', '35 × 45', '9', 'Centrado, 9 cm bajo el cuello']
  ];

  var ZONAS = [
    ['Pecho completo', '28 × 35 cm', 'Centrado; el borde superior a 7–8 cm de la costura del cuello.'],
    ['Pecho izquierdo (logo)', '8 × 8 a 10 × 10 cm', 'A 18–20 cm del hombro y a 12–15 cm del centro del pecho.'],
    ['Espalda completa', '30 × 40 cm', 'Borde superior a 7–10 cm bajo la costura del cuello.'],
    ['Nuca', '5 × 5 a 8 × 8 cm', 'Justo bajo la costura del cuello, a 2–3 cm.'],
    ['Manga corta', '8 × 8 cm', 'Centrado en la manga, a 4–5 cm de la bastilla.'],
    ['Manga larga (a lo largo)', '6 × 30 cm', 'Alineado al hombro, respetando la costura.'],
    ['Bolsa tote', '25 × 25 cm', 'Centrado, a 8–10 cm del borde superior.'],
    ['Gorra frontal', '11 × 5 cm', 'Centrado, a 2 cm de la visera. Curva la plancha.'],
    ['Sudadera pecho', '30 × 30 cm', 'Sube el arte 2–3 cm si la prenda lleva bolsillo canguro.'],
    ['Pantalón / short', '10 × 10 cm', 'Sobre el muslo o la pierna, evitando costuras y bolsillos.']
  ];

  var PLANCHA = [
    ['Algodón 100 %', '150–160 °C', '12–15 s', 'Media-alta', 'Según film'],
    ['Poliéster', '135–145 °C', '10–12 s', 'Media', 'En frío'],
    ['Mezcla 50/50', '145–155 °C', '12–14 s', 'Media-alta', 'Según film'],
    ['Dry fit / deportiva', '130–140 °C', '8–10 s', 'Media', 'En frío'],
    ['Nylon / impermeable', '120–130 °C', '8–10 s', 'Baja-media', 'En frío'],
    ['Repaso final (con papel)', '150 °C', '5 s', 'Media', '—']
  ];

  function tabla(head, rows, cls) {
    var t = el('table'), th = el('thead'), tr = el('tr');
    head.forEach(function (h, i) { tr.appendChild(el('th', { text: h, class: i && cls ? 'num' : '' })); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      r.forEach(function (c, i) { row.appendChild(el('td', { text: c, class: i && cls ? 'num' : '' })); });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    return el('div', { class: 'scroll-x' }, [t]);
  }

  function diagrama() {
    var s = '<svg viewBox="0 0 420 470" style="width:100%;max-width:420px;height:auto" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M150 58 60 100c-6 3-8 10-5 16l26 47c3 6 11 8 16 4l20-15v255c0 6 5 11 11 11h164c6 0 11-5 11-11V152l20 15c5 4 13 2 16-4l26-47c3-6 1-13-5-16l-90-42c-6 22-27 33-60 33s-54-11-60-33z"/>' +
      '<path d="M150 58c6 22 27 34 60 34s54-12 60-34" stroke-opacity=".5"/>' +
      '<g stroke="var(--registro)" stroke-dasharray="6 5">' +
      '<rect x="140" y="128" width="140" height="175" rx="2"/>' +
      '<rect x="252" y="122" width="42" height="42" rx="2"/>' +
      '</g>' +
      '<g stroke="var(--registro)" stroke-width="1.4" stroke-opacity=".85">' +
      '<path d="M210 92v34M204 96l6-6 6 6"/>' +
      '</g>' +
      '<g fill="var(--text)" stroke="none" font-family="var(--f-mono)" font-size="11">' +
      '<text x="150" y="220" font-size="12">Pecho completo</text>' +
      '<text x="150" y="236" fill="var(--mute)">28 × 35 cm</text>' +
      '<text x="222" y="112" fill="var(--mute)">7–8 cm</text>' +
      '<text x="300" y="150">Logo</text>' +
      '<text x="300" y="164" fill="var(--mute)">8 × 8 cm</text>' +
      '</g></svg>';
    return el('div', { html: s, style: 'display:flex;justify-content:center;padding:10px 0;color:var(--dim)' });
  }

  NV.register({
    slug: 'medidas',
    name: 'Medidas estándar',
    group: 'Producción',
    tagline: 'Tamaños por talla, colocaciones exactas y equivalencias de centímetros a píxeles.',
    icon: NV.svg('<path d="M2 8h20v8H2z"/><path d="M6 8v4M10 8v6M14 8v4M18 8v6"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var wrap = el('div', { class: 'wrap doc' });
      wrap.appendChild(el('div', { class: 'eyebrow', text: 'Producción · referencia' }));
      wrap.appendChild(el('h1', { style: 'font-size:34px;text-transform:uppercase;margin:8px 0 10px', text: t.name }));
      wrap.appendChild(el('p', { text: 'Las medidas que evitan reimprimir: tamaño por talla, a qué distancia del cuello va cada colocación y cuántos píxeles necesitas para imprimir a 300 DPI.' }));

      var top = el('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:22px;align-items:start;margin-top:26px' });
      top.appendChild(el('div', { class: 'panelbox' }, [diagrama()]));

      /* Conversor cm -> px */
      var box = el('div', { class: 'panelbox', style: 'display:flex;flex-direction:column;gap:14px' });
      box.appendChild(el('div', { class: 'eyebrow', text: 'De centímetros a píxeles' }));
      var vals = { ancho: 28, alto: 35, dpi: 300 };
      var salida = el('div', { class: 'mono', style: 'font-size:26px;font-family:var(--f-display);font-weight:800' });
      var nota = el('p', { class: 'hint' });
      function recalc() {
        var w = Math.round(vals.ancho / 2.54 * vals.dpi), h = Math.round(vals.alto / 2.54 * vals.dpi);
        salida.textContent = w + ' × ' + h + ' px';
        nota.textContent = 'Un archivo más chico que esto se verá pixelado al imprimir. Son ' +
          NV.fmt(w * h / 1e6, 1) + ' megapíxeles y ' + NV.fmt(vals.ancho * vals.alto, 0) + ' cm² de film.';
      }
      NV.controls(box, [
        { k: 'num', id: 'ancho', label: 'Ancho', unit: 'cm', def: 28, min: 1, step: 0.5 },
        { k: 'num', id: 'alto', label: 'Alto', unit: 'cm', def: 35, min: 1, step: 0.5 },
        { k: 'seg', id: 'dpi', label: 'Resolución', def: 300, opts: [[150, '150'], [200, '200'], [300, '300'], [600, '600']] }
      ], vals, recalc).sync();
      box.appendChild(salida); box.appendChild(nota);
      top.appendChild(box);
      wrap.appendChild(top);

      wrap.appendChild(el('h2', { text: 'Tamaño frontal por talla' }));
      wrap.appendChild(el('p', { text: 'Medidas de arte en centímetros (ancho × alto) para impresión en el pecho. Son el punto de partida más usado; ajusta si el diseño es muy horizontal.' }));
      wrap.appendChild(tabla(['Talla', 'Tamaño de arte (cm)', 'Bajo el cuello (cm)', 'Colocación'], TALLAS, false));

      wrap.appendChild(el('h2', { text: 'Colocaciones' }));
      wrap.appendChild(tabla(['Zona', 'Tamaño típico', 'Cómo se coloca'], ZONAS, false));

      wrap.appendChild(el('h2', { text: 'Plancha por tipo de tela' }));
      wrap.appendChild(el('p', { text: 'Valores de arranque para transfer DTF. Cada film trae su propia hoja técnica: si el proveedor indica otra cosa, manda su ficha. Haz siempre una prueba en la misma prenda antes de una corrida.' }));
      wrap.appendChild(tabla(['Tela', 'Temperatura', 'Tiempo', 'Presión', 'Despegue'], PLANCHA, false));

      wrap.appendChild(el('h2', { text: 'Rollos y aprovechamiento' }));
      wrap.appendChild(tabla(
        ['Ancho de rollo', 'Área por metro', 'Piezas de 28 × 35 cm por metro'],
        [['30 cm', '0,30 m²', '1'], ['33 cm', '0,33 m²', '1'], ['40 cm', '0,40 m²', '1'],
         ['55 cm', '0,55 m²', '2'], ['58 cm', '0,58 m²', '2'], ['60 cm', '0,60 m²', '2'], ['62 cm', '0,62 m²', '2']],
        true));
      wrap.appendChild(el('p', { class: 'hint', text: 'Para exprimir el rollo, arma la hoja con la herramienta de hojas de impresión: acomoda por altura y te dice el metraje exacto.' }));
      wrap.appendChild(el('a', { class: 'btn', href: '#/plantillas', text: 'Abrir hojas de impresión', style: 'margin-top:8px;align-self:flex-start' }));

      host.appendChild(wrap);
      host.appendChild(NV.footer());
    }
  });
})();
