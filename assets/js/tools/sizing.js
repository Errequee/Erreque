/* Standard sizes: print sizes, placements and cm-to-pixel equivalents. */
(function () {
  'use strict';
  var el = NV.el;

  var SIZES = [
    ['Kids 2–3', '15 × 18', '4–5', 'Centred, 5 cm below the collar'],
    ['Kids 4–6', '18 × 22', '5–6', 'Centred, 5 cm below the collar'],
    ['Kids 8–10', '20 × 25', '6', 'Centred, 6 cm below the collar'],
    ['Kids 12–14', '22 × 28', '6–7', 'Centred, 6 cm below the collar'],
    ['Adult XS', '24 × 30', '7', 'Centred, 7 cm below the collar'],
    ['Adult S', '26 × 32', '7', 'Centred, 7 cm below the collar'],
    ['Adult M', '28 × 35', '7–8', 'Centred, 7.5 cm below the collar'],
    ['Adult L', '30 × 38', '8', 'Centred, 8 cm below the collar'],
    ['Adult XL', '32 × 40', '8', 'Centred, 8 cm below the collar'],
    ['Adult 2XL', '33 × 42', '8–9', 'Centred, 8.5 cm below the collar'],
    ['Adult 3XL', '35 × 45', '9', 'Centred, 9 cm below the collar']
  ];

  var ZONES = [
    ['Full chest', '28 × 35 cm', 'Centred; top edge 7–8 cm from the collar seam.'],
    ['Left chest (logo)', '8 × 8 to 10 × 10 cm', '18–20 cm from the shoulder and 12–15 cm from the centre of the chest.'],
    ['Full back', '30 × 40 cm', 'Top edge 7–10 cm below the collar seam.'],
    ['Nape', '5 × 5 to 8 × 8 cm', 'Right under the collar seam, 2–3 cm down.'],
    ['Short sleeve', '8 × 8 cm', 'Centred on the sleeve, 4–5 cm from the hem.'],
    ['Long sleeve (lengthwise)', '6 × 30 cm', 'Aligned to the shoulder, clear of the seam.'],
    ['Tote bag', '25 × 25 cm', 'Centred, 8–10 cm from the top edge.'],
    ['Cap front', '11 × 5 cm', 'Centred, 2 cm from the brim. Use a curved platen.'],
    ['Hoodie chest', '30 × 30 cm', 'Raise the artwork 2–3 cm if the garment has a kangaroo pocket.'],
    ['Trousers / shorts', '10 × 10 cm', 'On the thigh or leg, clear of seams and pockets.']
  ];

  var PRESS = [
    ['100 % cotton', '150–160 °C', '12–15 s', 'Medium-high', 'Per the film'],
    ['Polyester', '135–145 °C', '10–12 s', 'Medium', 'Cold peel'],
    ['50/50 blend', '145–155 °C', '12–14 s', 'Medium-high', 'Per the film'],
    ['Dry fit / sportswear', '130–140 °C', '8–10 s', 'Medium', 'Cold peel'],
    ['Nylon / waterproof', '120–130 °C', '8–10 s', 'Low-medium', 'Cold peel'],
    ['Final re-press (with paper)', '150 °C', '5 s', 'Medium', '—']
  ];

  function table(head, rows, numeric) {
    var t = el('table'), th = el('thead'), tr = el('tr');
    head.forEach(function (h, i) { tr.appendChild(el('th', { text: h, class: i && numeric ? 'num' : '' })); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    rows.forEach(function (r) {
      var row = el('tr');
      r.forEach(function (c, i) { row.appendChild(el('td', { text: c, class: i && numeric ? 'num' : '' })); });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    return el('div', { class: 'scroll-x' }, [t]);
  }

  function diagram() {
    var s = '<svg viewBox="0 0 420 470" style="width:100%;max-width:420px;height:auto" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linejoin="round">' +
      '<path d="M150 58 60 100c-6 3-8 10-5 16l26 47c3 6 11 8 16 4l20-15v255c0 6 5 11 11 11h164c6 0 11-5 11-11V152l20 15c5 4 13 2 16-4l26-47c3-6 1-13-5-16l-90-42c-6 22-27 33-60 33s-54-11-60-33z"/>' +
      '<path d="M150 58c6 22 27 34 60 34s54-12 60-34" stroke-opacity=".5"/>' +
      '<g stroke="var(--accent)" stroke-dasharray="6 5">' +
      '<rect x="140" y="128" width="140" height="175" rx="2"/>' +
      '<rect x="252" y="122" width="42" height="42" rx="2"/>' +
      '</g>' +
      '<g stroke="var(--accent)" stroke-width="1.4" stroke-opacity=".85">' +
      '<path d="M210 92v34M204 96l6-6 6 6"/>' +
      '</g>' +
      '<g fill="var(--text)" stroke="none" font-family="var(--f-mono)" font-size="11">' +
      '<text x="150" y="220" font-size="12">Full chest</text>' +
      '<text x="150" y="236" fill="var(--mute)">28 × 35 cm</text>' +
      '<text x="222" y="112" fill="var(--mute)">7–8 cm</text>' +
      '<text x="300" y="150">Logo</text>' +
      '<text x="300" y="164" fill="var(--mute)">8 × 8 cm</text>' +
      '</g></svg>';
    return el('div', { html: s, style: 'display:flex;justify-content:center;padding:10px 0;color:var(--dim)' });
  }

  NV.register({
    slug: 'sizing',
    name: 'Standard sizes',
    group: 'Production',
    tagline: 'Print sizes by garment size, exact placements and centimetres to pixels.',
    icon: NV.svg('<path d="M2 8h20v8H2z"/><path d="M6 8v4M10 8v6M14 8v4M18 8v6"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var wrap = el('div', { class: 'wrap doc' });
      wrap.appendChild(el('div', { class: 'eyebrow', text: 'Production · reference' }));
      wrap.appendChild(el('h1', { style: 'font-size:34px;text-transform:uppercase;margin:8px 0 10px', text: t.name }));
      wrap.appendChild(el('p', { text: 'The measurements that save you a reprint: size by garment size, how far each placement sits from the collar, and how many pixels you need to print at 300 DPI.' }));

      var top = el('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:22px;align-items:start;margin-top:26px' });
      top.appendChild(el('div', { class: 'panelbox' }, [diagram()]));

      /* Centimetres to pixels */
      var box = el('div', { class: 'panelbox', style: 'display:flex;flex-direction:column;gap:14px' });
      box.appendChild(el('div', { class: 'eyebrow', text: 'Centimetres to pixels' }));
      var vals = { width: 28, height: 35, dpi: 300 };
      var out = el('div', { class: 'mono', style: 'font-size:26px;font-family:var(--f-display);font-weight:800' });
      var note = el('p', { class: 'hint' });
      function recalc() {
        var w = Math.round(vals.width / 2.54 * vals.dpi), h = Math.round(vals.height / 2.54 * vals.dpi);
        out.textContent = w + ' × ' + h + ' px';
        note.textContent = 'A file smaller than this will look pixelated in print. That is ' +
          NV.fmt(w * h / 1e6, 1) + ' megapixels and ' + NV.fmt(vals.width * vals.height, 0) + ' cm² of film.';
      }
      NV.controls(box, [
        { k: 'num', id: 'width', label: 'Width', unit: 'cm', def: 28, min: 1, step: 0.5 },
        { k: 'num', id: 'height', label: 'Height', unit: 'cm', def: 35, min: 1, step: 0.5 },
        { k: 'seg', id: 'dpi', label: 'Resolution', def: 300, opts: [[150, '150'], [200, '200'], [300, '300'], [600, '600']] }
      ], vals, recalc).sync();
      box.appendChild(out); box.appendChild(note);
      top.appendChild(box);
      wrap.appendChild(top);

      wrap.appendChild(el('h2', { text: 'Front print size by garment size' }));
      wrap.appendChild(el('p', { text: 'Artwork measurements in centimetres (width × height) for a chest print. These are the most common starting point; adjust if the design is very wide.' }));
      wrap.appendChild(table(['Size', 'Artwork size (cm)', 'Below the collar (cm)', 'Placement'], SIZES, false));

      wrap.appendChild(el('h2', { text: 'Placements' }));
      wrap.appendChild(table(['Zone', 'Typical size', 'How it sits'], ZONES, false));

      wrap.appendChild(el('h2', { text: 'Pressing by fabric' }));
      wrap.appendChild(el('p', { text: 'Starting values for a DTF transfer. Every film comes with its own spec sheet: if your supplier says otherwise, their sheet wins. Always test on the same garment before a production run.' }));
      wrap.appendChild(table(['Fabric', 'Temperature', 'Time', 'Pressure', 'Peel'], PRESS, false));

      wrap.appendChild(el('h2', { text: 'Rolls and yield' }));
      wrap.appendChild(table(
        ['Roll width', 'Area per metre', 'Pieces of 28 × 35 cm per metre'],
        [['30 cm', '0.30 m²', '1'], ['33 cm', '0.33 m²', '1'], ['40 cm', '0.40 m²', '1'],
         ['55 cm', '0.55 m²', '2'], ['58 cm', '0.58 m²', '2'], ['60 cm', '0.60 m²', '2'], ['62 cm', '0.62 m²', '2']],
        true));
      wrap.appendChild(el('p', { class: 'hint', text: 'To squeeze the roll, build the layout with the print sheets tool: it packs by height and tells you the exact run length.' }));
      wrap.appendChild(el('a', { class: 'btn', href: '#/gang-sheets', text: 'Open print sheets', style: 'margin-top:8px;align-self:flex-start' }));

      host.appendChild(wrap);
      host.appendChild(NV.footer());
    }
  });
})();
