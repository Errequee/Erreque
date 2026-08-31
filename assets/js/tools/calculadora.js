/* Calculadora de costos y precio para DTF. */
(function () {
  'use strict';
  var el = NV.el, KEY = 'nv-calc';

  var FIELDS = [
    ['g1', 'Rollo de film'],
    ['rollo', 'Precio del rollo', 1800, 'moneda'],
    ['anchoRollo', 'Ancho del rollo', 58, 'cm'],
    ['largoRollo', 'Largo del rollo', 100, 'm'],
    ['g2', 'Consumibles por metro cuadrado impreso'],
    ['tinta', 'Tinta (CMYK + blanco)', 45, 'moneda'],
    ['polvo', 'Polvo adhesivo', 12, 'moneda'],
    ['otros', 'Otros (energía, mantenimiento)', 8, 'moneda'],
    ['g3', 'Mano de obra'],
    ['hora', 'Costo por hora de trabajo', 90, 'moneda'],
    ['minutos', 'Minutos por pieza', 2.5, 'min'],
    ['merma', 'Merma y reimpresiones', 8, '%'],
    ['g4', 'La pieza que vas a cotizar'],
    ['ancho', 'Ancho del diseño', 28, 'cm'],
    ['alto', 'Alto del diseño', 35, 'cm'],
    ['cantidad', 'Cantidad', 10, 'pzas'],
    ['prenda', 'Costo de la prenda (0 si solo vendes el transfer)', 0, 'moneda'],
    ['empaque', 'Empaque y etiqueta por pieza', 3, 'moneda'],
    ['g5', 'Tu ganancia'],
    ['margen', 'Margen sobre el costo', 120, '%']
  ];

  function calc(v) {
    var areaRollo = (v.anchoRollo / 100) * v.largoRollo;                 // m²
    var costoFilmM2 = areaRollo > 0 ? v.rollo / areaRollo : 0;
    var costoM2 = costoFilmM2 + v.tinta + v.polvo + v.otros;
    var areaPieza = (v.ancho / 100) * (v.alto / 100);                    // m²
    var material = areaPieza * costoM2;
    var mano = (v.minutos / 60) * v.hora;
    var base = material + mano + v.prenda + v.empaque;
    var conMerma = base * (1 + v.merma / 100);
    var precio = conMerma * (1 + v.margen / 100);
    return {
      costoFilmM2: costoFilmM2, costoM2: costoM2, areaPieza: areaPieza,
      material: material, mano: mano, base: base, unitario: conMerma,
      precio: precio, ganancia: precio - conMerma,
      total: precio * v.cantidad, costoTotal: conMerma * v.cantidad,
      gananciaTotal: (precio - conMerma) * v.cantidad,
      precioM2: areaPieza > 0 ? precio / areaPieza : 0,
      metroLineal: costoM2 * (v.anchoRollo / 100)
    };
  }

  NV.register({
    slug: 'calculadora',
    name: 'Calculadora de precios',
    group: 'Producción',
    tagline: 'Costo real por pieza y precio de venta, con film, tinta, mano de obra y merma.',
    icon: NV.svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h6"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var v = {}, saved = {};
      try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { saved = {}; }
      FIELDS.forEach(function (f) {
        if (f[0].charAt(0) === 'g' && f.length === 2) return;
        v[f[0]] = saved[f[0]] != null ? saved[f[0]] : f[2];
      });
      var moneda = saved.moneda || 'MXN';

      var wrap = el('div', { class: 'wrap doc' });
      wrap.appendChild(el('div', { class: 'eyebrow', text: 'Producción · costos' }));
      wrap.appendChild(el('h1', { style: 'font-size:34px;text-transform:uppercase;margin:8px 0 10px', text: t.name }));
      wrap.appendChild(el('p', { text: 'Ajusta los números a tu taller una vez y quedan guardados en este navegador. El precio sale del costo real, no de copiar la lista del vecino.' }));

      var cols = el('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:22px;align-items:start;margin-top:24px' });
      var form = el('div', { class: 'panelbox', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px 18px;align-content:start' });
      var res = el('div', { class: 'panelbox', style: 'position:sticky;top:72px' });

      var mon = el('input', { type: 'text', value: moneda, maxlength: 4, style: 'max-width:90px' });
      mon.addEventListener('input', function () { moneda = mon.value || '$'; save(); update(); });
      form.appendChild(el('div', { class: 'field' }, [
        el('div', { class: 'flabel' }, [el('span', { text: 'Moneda' })]), mon
      ]));

      FIELDS.forEach(function (f) {
        if (f[0].charAt(0) === 'g' && f.length === 2) {
          form.appendChild(el('div', { class: 'group-t', style: 'grid-column:1/-1', text: f[1] }));
          return;
        }
        var inp = el('input', { type: 'number', value: v[f[0]], step: 'any', min: 0 });
        inp.addEventListener('input', function () {
          v[f[0]] = inp.value === '' ? 0 : +inp.value;
          save(); update();
        });
        form.appendChild(el('div', { class: 'field' }, [
          el('div', { class: 'flabel' }, [el('span', { text: f[1] }), el('b', { text: f[3] === 'moneda' ? moneda : f[3] })]),
          inp
        ]));
      });
      form.appendChild(el('button', {
        class: 'btn ghost', style: 'grid-column:1/-1', text: 'Restablecer valores',
        onclick: function () {
          localStorage.removeItem(KEY);
          location.reload();
        }
      }));

      function save() {
        var o = {}; for (var k in v) o[k] = v[k];
        o.moneda = moneda;
        try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* modo privado */ }
      }

      function money(x) { return moneda + ' ' + NV.fmt(x); }

      function update() {
        var r = calc(v);
        res.innerHTML = '';
        res.appendChild(el('div', { class: 'eyebrow', text: 'Resultado por pieza' }));
        res.appendChild(el('div', {
          style: 'font-family:var(--f-display);font-size:38px;font-weight:800;margin:6px 0 2px;color:var(--registro)',
          text: money(r.precio)
        }));
        res.appendChild(el('p', {
          class: 'hint',
          text: 'Costo ' + money(r.unitario) + ' · ganancia ' + money(r.ganancia) +
            ' (' + NV.fmt(r.unitario > 0 ? r.ganancia / r.unitario * 100 : 0, 0) + ' %)'
        }));
        var tbl = el('table', { style: 'margin-top:14px' });
        var rows = [
          ['Film por pieza', money(r.areaPieza * r.costoFilmM2)],
          ['Tinta, polvo y otros', money(r.areaPieza * (v.tinta + v.polvo + v.otros))],
          ['Mano de obra', money(r.mano)],
          ['Prenda y empaque', money(v.prenda + v.empaque)],
          ['Merma ' + NV.fmt(v.merma, 0) + ' %', money(r.unitario - r.base)],
          ['Área de la pieza', NV.fmt(r.areaPieza * 10000, 0) + ' cm²'],
          ['Costo del m² impreso', money(r.costoM2)],
          ['Costo del metro lineal', money(r.metroLineal)],
          ['Precio por m² vendido', money(r.precioM2)]
        ];
        var tb = el('tbody');
        rows.forEach(function (row) {
          tb.appendChild(el('tr', {}, [el('td', { text: row[0] }), el('td', { class: 'num', text: row[1] })]));
        });
        tbl.appendChild(tb);
        res.appendChild(tbl);

        res.appendChild(el('div', { class: 'sep', style: 'margin:16px 0' }));
        res.appendChild(el('div', { class: 'eyebrow', text: 'Pedido de ' + NV.fmt(v.cantidad, 0) + ' piezas' }));
        var t2 = el('table'), tb2 = el('tbody');
        [['Venta total', money(r.total)], ['Costo total', money(r.costoTotal)], ['Ganancia', money(r.gananciaTotal)]]
          .forEach(function (row) {
            tb2.appendChild(el('tr', {}, [el('td', { text: row[0] }), el('td', { class: 'num', text: row[1] })]));
          });
        t2.appendChild(tb2);
        res.appendChild(t2);
        res.appendChild(el('button', {
          class: 'btn wide', style: 'margin-top:14px', text: 'Copiar cotización',
          onclick: function () {
            var txt = 'Cotización\n' + NV.fmt(v.cantidad, 0) + ' piezas de ' + v.ancho + ' × ' + v.alto + ' cm\n' +
              'Precio unitario: ' + money(r.precio) + '\nTotal: ' + money(r.total) + '\n';
            if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { NV.toast('Cotización copiada.', 'ok'); });
          }
        }));
      }

      cols.appendChild(form); cols.appendChild(res);
      wrap.appendChild(cols);
      wrap.appendChild(el('h2', { text: 'Cómo se calcula' }));
      wrap.appendChild(el('p', { text: 'El film se reparte por área: el precio del rollo entre los metros cuadrados que trae. A eso se suman tinta, polvo y energía por metro cuadrado, la mano de obra por minutos de planchado y un porcentaje de merma por las piezas que salen mal. El margen se aplica sobre ese costo ya completo.' }));
      wrap.appendChild(el('p', { class: 'hint', text: 'Si vendes por metro lineal en vez de por pieza, usa el renglón “costo del metro lineal” como piso y aplica tu margen encima.' }));
      host.appendChild(wrap);
      host.appendChild(NV.footer());
      update();
    }
  });
})();
