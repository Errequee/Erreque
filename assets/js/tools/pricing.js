/* Cost and price calculator for DTF. */
(function () {
  'use strict';
  var el = NV.el, KEY = 'nv-pricing';

  var FIELDS = [
    ['g1', 'Film roll'],
    ['roll', 'Price of the roll', 1800, 'money'],
    ['rollWidth', 'Roll width', 58, 'cm'],
    ['rollLength', 'Roll length', 100, 'm'],
    ['g2', 'Consumables per square metre printed'],
    ['ink', 'Ink (CMYK + white)', 45, 'money'],
    ['powder', 'Adhesive powder', 12, 'money'],
    ['other', 'Other (power, maintenance)', 8, 'money'],
    ['g3', 'Labour'],
    ['hourly', 'Cost per working hour', 90, 'money'],
    ['minutes', 'Minutes per piece', 2.5, 'min'],
    ['waste', 'Waste and reprints', 8, '%'],
    ['g4', 'The piece you are quoting'],
    ['width', 'Artwork width', 28, 'cm'],
    ['height', 'Artwork height', 35, 'cm'],
    ['qty', 'Quantity', 10, 'pcs'],
    ['garment', 'Cost of the garment (0 if you only sell the transfer)', 0, 'money'],
    ['packaging', 'Packaging and label per piece', 3, 'money'],
    ['g5', 'Your margin'],
    ['margin', 'Margin on cost', 120, '%']
  ];

  function calc(v) {
    var rollArea = (v.rollWidth / 100) * v.rollLength;                   // m²
    var filmPerM2 = rollArea > 0 ? v.roll / rollArea : 0;
    var costPerM2 = filmPerM2 + v.ink + v.powder + v.other;
    var pieceArea = (v.width / 100) * (v.height / 100);                  // m²
    var material = pieceArea * costPerM2;
    var labour = (v.minutes / 60) * v.hourly;
    var base = material + labour + v.garment + v.packaging;
    var withWaste = base * (1 + v.waste / 100);
    var price = withWaste * (1 + v.margin / 100);
    return {
      filmPerM2: filmPerM2, costPerM2: costPerM2, pieceArea: pieceArea,
      material: material, labour: labour, base: base, unit: withWaste,
      price: price, profit: price - withWaste,
      total: price * v.qty, totalCost: withWaste * v.qty,
      totalProfit: (price - withWaste) * v.qty,
      pricePerM2: pieceArea > 0 ? price / pieceArea : 0,
      linearMetre: costPerM2 * (v.rollWidth / 100)
    };
  }

  NV.register({
    slug: 'pricing',
    name: 'Pricing calculator',
    group: 'Production',
    tagline: 'Real cost per piece and selling price, with film, ink, labour and waste.',
    icon: NV.svg('<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h2M12 10h2M16 10h.01M8 14h2M12 14h2M16 14h.01M8 18h6"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var v = {}, saved = {};
      try { saved = JSON.parse(NV.store.get(KEY) || '{}'); } catch (e) { saved = {}; }
      FIELDS.forEach(function (f) {
        if (f[0].charAt(0) === 'g' && f.length === 2) return;
        v[f[0]] = saved[f[0]] != null ? saved[f[0]] : f[2];
      });
      var currency = saved.currency || 'MXN';

      var wrap = el('div', { class: 'wrap doc' });
      wrap.appendChild(el('div', { class: 'eyebrow', text: 'Production · costs' }));
      wrap.appendChild(el('h1', { style: 'font-size:34px;text-transform:uppercase;margin:8px 0 10px', text: t.name }));
      wrap.appendChild(el('p', { text: 'Set these numbers to match your shop once and they stay saved in this browser. The price comes from your real cost, not from copying the shop down the road.' }));

      var cols = el('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,340px);gap:22px;align-items:start;margin-top:24px' });
      var form = el('div', { class: 'panelbox', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px 18px;align-content:start' });
      var res = el('div', { class: 'panelbox', style: 'position:sticky;top:72px' });

      var cur = el('input', { type: 'text', value: currency, maxlength: 4, style: 'max-width:90px' });
      cur.addEventListener('input', function () { currency = cur.value || '$'; save(); update(); });
      form.appendChild(el('div', { class: 'field' }, [
        el('div', { class: 'flabel' }, [el('span', { text: 'Currency' })]), cur
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
          el('div', { class: 'flabel' }, [el('span', { text: f[1] }), el('b', { text: f[3] === 'money' ? currency : f[3] })]),
          inp
        ]));
      });
      form.appendChild(el('button', {
        class: 'btn ghost', style: 'grid-column:1/-1', text: 'Reset values',
        onclick: function () { NV.store.del(KEY); location.reload(); }
      }));

      function save() {
        var o = {}; for (var k in v) o[k] = v[k];
        o.currency = currency;
        NV.store.set(KEY, JSON.stringify(o));
      }

      function money(x) { return currency + ' ' + NV.fmt(x); }

      function update() {
        var r = calc(v);
        res.innerHTML = '';
        res.appendChild(el('div', { class: 'eyebrow', text: 'Result per piece' }));
        res.appendChild(el('div', {
          style: 'font-family:var(--f-display);font-size:38px;font-weight:800;margin:6px 0 2px;color:var(--accent)',
          text: money(r.price)
        }));
        res.appendChild(el('p', {
          class: 'hint',
          text: 'Cost ' + money(r.unit) + ' · profit ' + money(r.profit) +
            ' (' + NV.fmt(r.unit > 0 ? r.profit / r.unit * 100 : 0, 0) + ' %)'
        }));
        var tbl = el('table', { style: 'margin-top:14px' });
        var rows = [
          ['Film per piece', money(r.pieceArea * r.filmPerM2)],
          ['Ink, powder and other', money(r.pieceArea * (v.ink + v.powder + v.other))],
          ['Labour', money(r.labour)],
          ['Garment and packaging', money(v.garment + v.packaging)],
          ['Waste ' + NV.fmt(v.waste, 0) + ' %', money(r.unit - r.base)],
          ['Area of the piece', NV.fmt(r.pieceArea * 10000, 0) + ' cm²'],
          ['Cost per m² printed', money(r.costPerM2)],
          ['Cost per linear metre', money(r.linearMetre)],
          ['Price per m² sold', money(r.pricePerM2)]
        ];
        var tb = el('tbody');
        rows.forEach(function (row) {
          tb.appendChild(el('tr', {}, [el('td', { text: row[0] }), el('td', { class: 'num', text: row[1] })]));
        });
        tbl.appendChild(tb);
        res.appendChild(tbl);

        res.appendChild(el('div', { class: 'sep', style: 'margin:16px 0' }));
        res.appendChild(el('div', { class: 'eyebrow', text: 'Order of ' + NV.fmt(v.qty, 0) + ' pieces' }));
        var t2 = el('table'), tb2 = el('tbody');
        [['Total sale', money(r.total)], ['Total cost', money(r.totalCost)], ['Profit', money(r.totalProfit)]]
          .forEach(function (row) {
            tb2.appendChild(el('tr', {}, [el('td', { text: row[0] }), el('td', { class: 'num', text: row[1] })]));
          });
        t2.appendChild(tb2);
        res.appendChild(t2);
        res.appendChild(el('button', {
          class: 'btn wide', style: 'margin-top:14px', text: 'Copy the quote',
          onclick: function () {
            var txt = 'Quote\n' + NV.fmt(v.qty, 0) + ' pieces at ' + v.width + ' × ' + v.height + ' cm\n' +
              'Unit price: ' + money(r.price) + '\nTotal: ' + money(r.total) + '\n';
            if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () { NV.toast('Quote copied.', 'ok'); });
          }
        }));
      }

      cols.appendChild(form); cols.appendChild(res);
      wrap.appendChild(cols);
      wrap.appendChild(el('h2', { text: 'How it is worked out' }));
      wrap.appendChild(el('p', { text: 'Film is charged by area: the price of the roll divided by the square metres it holds. On top of that go ink, powder and power per square metre, the labour for the minutes of pressing, and a percentage of waste for the pieces that come out wrong. The margin is applied to that finished cost.' }));
      wrap.appendChild(el('p', { class: 'hint', text: 'If you sell by the linear metre instead of by the piece, use the "cost per linear metre" line as your floor and add your margin on top.' }));
      host.appendChild(wrap);
      host.appendChild(NV.footer());
      update();
    }
  });
})();
