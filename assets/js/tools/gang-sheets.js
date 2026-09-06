/* Print sheets (gang sheets): lay several designs out on the roll and use the film well. */
(function () {
  'use strict';
  var el = NV.el, CM = 2.54;

  function pack(items, sheetW, gap, margin) {
    var usable = sheetW - margin * 2, units = [], out = [];
    items.forEach(function (it) {
      var wcm = it.cm, hcm = it.cm * it.img.height / it.img.width;
      for (var i = 0; i < it.qty; i++) units.push({ it: it, w: wcm, h: hcm });
    });
    units.sort(function (a, b) { return b.h - a.h; });
    var x = margin, y = margin, shelf = 0;
    units.forEach(function (u) {
      var w = u.w, h = u.h, rot = false;
      if (u.it.rot && w > usable && h <= usable) { var t = w; w = h; h = t; rot = true; }
      if (w > usable) { var k = usable / w; w *= k; h *= k; }
      if (x + w > margin + usable + 1e-6) { y += shelf + gap; x = margin; shelf = 0; }
      out.push({ it: u.it, x: x, y: y, w: w, h: h, rot: rot });
      x += w + gap;
      shelf = Math.max(shelf, h);
    });
    return { places: out, length: out.length ? y + shelf + margin : margin * 2 };
  }

  function draw(cv, st, packed, forExport) {
    var pxcm = forExport ? st.dpi / CM : cv.width / st.width;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = forExport && !st.background ? 'rgba(0,0,0,0)' : (forExport ? st.color : '#ffffff');
    if (forExport && !st.background) ctx.clearRect(0, 0, cv.width, cv.height);
    else ctx.fillRect(0, 0, cv.width, cv.height);
    packed.places.forEach(function (p) {
      ctx.save();
      if (p.rot) {
        ctx.translate(p.x * pxcm + p.w * pxcm, p.y * pxcm);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(p.it.img, 0, 0, p.h * pxcm, p.w * pxcm);
      } else {
        ctx.drawImage(p.it.img, p.x * pxcm, p.y * pxcm, p.w * pxcm, p.h * pxcm);
      }
      ctx.restore();
      if (!forExport) {
        ctx.strokeStyle = 'rgba(255,45,126,.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x * pxcm, p.y * pxcm, p.w * pxcm, p.h * pxcm);
      }
    });
    if (!forExport) {
      ctx.strokeStyle = 'rgba(120,120,120,.5)';
      ctx.setLineDash([6, 5]);
      ctx.strokeRect(st.margin * pxcm, st.margin * pxcm,
        (st.width - st.margin * 2) * pxcm, cv.height - st.margin * 2 * pxcm);
      ctx.setLineDash([]);
    }
  }

  NV.register({
    slug: 'gang-sheets',
    name: 'Print sheets',
    group: 'Production',
    tagline: 'Gang several designs onto the roll, measure the run and export at real DPI.',
    icon: NV.svg('<path d="M3 4h18v16H3z"/><path d="M3 10h9v10M12 4v6h9"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var parts = NV.bench(host, t);
      var st = { width: 58, dpi: 300, gap: 0.5, margin: 0.5, background: false, color: '#ffffff' };
      var items = [], packed = { places: [], length: 1 };

      var wrap = el('div', { style: 'flex:1;overflow:auto;padding:22px;display:flex;justify-content:center;align-items:flex-start' });
      var cv = el('canvas', { style: 'box-shadow:0 0 0 1px var(--line), 0 20px 50px -30px #000;background:#fff;max-width:100%' });
      wrap.appendChild(cv);
      var info = el('div', { class: 'meta' });
      parts.stage.appendChild(wrap); parts.stage.appendChild(info);

      var listBox = el('div', { style: 'display:flex;flex-direction:column;gap:10px' });
      var input = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
      input.addEventListener('change', function () {
        var files = [].slice.call(input.files);
        Promise.all(files.map(function (f) {
          return NV.loadImage(f).then(function (img) {
            return { name: f.name.replace(/\.[^.]+$/, ''), img: img, cm: 20, qty: 1, rot: true };
          });
        })).then(function (added) {
          items = items.concat(added);
          input.value = '';
          renderList(); update();
        });
      });

      function renderList() {
        listBox.innerHTML = '';
        if (!items.length) {
          listBox.appendChild(el('p', { class: 'hint', text: 'No designs yet. Add PNGs with a transparent background and set the width of each one in centimetres.' }));
          return;
        }
        items.forEach(function (it, i) {
          var row = el('div', { style: 'border:1px solid var(--line);border-radius:6px;padding:10px;display:flex;flex-direction:column;gap:8px' });
          var top = el('div', { style: 'display:flex;gap:10px;align-items:center' });
          var th = el('canvas', { width: 40, height: 40, style: 'flex:none;border-radius:4px;background:var(--ground)' });
          var tc = th.getContext('2d');
          var k = Math.min(40 / it.img.width, 40 / it.img.height);
          tc.drawImage(it.img, (40 - it.img.width * k) / 2, (40 - it.img.height * k) / 2, it.img.width * k, it.img.height * k);
          top.appendChild(th);
          top.appendChild(el('div', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px', text: it.name }));
          top.appendChild(el('button', {
            class: 'btn ghost', style: 'padding:4px 9px', text: '✕', title: 'Remove',
            onclick: function () { items.splice(i, 1); renderList(); update(); }
          }));
          row.appendChild(top);

          var g = el('div', { class: 'row' });
          var wIn = el('input', { type: 'number', value: it.cm, min: 1, max: 200, step: 0.5, title: 'Width in cm' });
          var qIn = el('input', { type: 'number', value: it.qty, min: 1, max: 200, step: 1, title: 'Quantity' });
          wIn.addEventListener('input', function () { it.cm = Math.max(0.5, +wIn.value || 1); update(); });
          qIn.addEventListener('input', function () { it.qty = Math.max(1, Math.min(200, +qIn.value || 1)); update(); });
          g.appendChild(el('label', { class: 'field' }, [el('span', { class: 'flabel', html: '<span>Width</span><b>cm</b>' }), wIn]));
          g.appendChild(el('label', { class: 'field' }, [el('span', { class: 'flabel', html: '<span>Quantity</span><b>pcs</b>' }), qIn]));
          row.appendChild(g);

          var rc = el('input', { type: 'checkbox' });
          rc.checked = it.rot;
          rc.addEventListener('change', function () { it.rot = rc.checked; update(); });
          row.appendChild(el('label', { class: 'check' }, [rc, el('span', { text: 'May rotate 90°' })]));
          listBox.appendChild(row);
        });
      }

      function update() {
        packed = pack(items, st.width, st.gap, st.margin);
        var length = Math.max(st.margin * 2 + 1, packed.length);
        var pxcm = 900 / st.width;
        cv.width = Math.round(st.width * pxcm);
        cv.height = Math.max(40, Math.round(length * pxcm));
        cv.style.width = Math.min(900, cv.width) + 'px';
        draw(cv, st, packed, false);
        var used = packed.places.reduce(function (a, p) { return a + p.w * p.h; }, 0);
        var sheet = st.width * length;
        info.textContent = packed.places.length + ' pieces · ' + length.toFixed(1) + ' cm long (' +
          (length / 100).toFixed(2) + ' m) · ' + Math.round(used / sheet * 100) + ' % used';
      }

      NV.controls(parts.body, [
        { k: 'select', id: 'width', label: 'Roll width', def: '58', opts: [['30', '30 cm'], ['33', '33 cm'], ['40', '40 cm'], ['55', '55 cm'], ['58', '58 cm'], ['60', '60 cm'], ['62', '62 cm']] },
        { k: 'num', id: 'dpi', label: 'Output resolution', unit: 'DPI', def: 300, min: 100, max: 720, step: 10 },
        { k: 'range', id: 'gap', label: 'Gap between pieces', min: 0, max: 4, step: 0.1, def: 0.5, unit: ' cm', dec: 1 },
        { k: 'range', id: 'margin', label: 'Roll margin', min: 0, max: 4, step: 0.1, def: 0.5, unit: ' cm', dec: 1 },
        { k: 'check', id: 'background', label: 'Export with a solid background', def: false },
        { k: 'color', id: 'color', label: 'Background colour', def: '#ffffff', show: function (p) { return p.background; } }
      ], st, function () { st.width = +st.width; update(); }).sync();

      parts.body.appendChild(el('div', { class: 'sep' }));
      parts.body.appendChild(el('div', { class: 'group-t', text: 'Designs on the sheet' }));
      parts.body.appendChild(el('button', { class: 'btn wide', text: 'Add designs', onclick: function () { input.click(); } }));
      parts.body.appendChild(input);
      parts.body.appendChild(listBox);
      parts.body.appendChild(el('p', { class: 'hint', text: 'The layout uses shelves by height, the same way a RIP does: sort tallest first and fill each row.' }));

      parts.foot.appendChild(el('button', {
        class: 'btn primary wide', text: 'Download sheet PNG',
        onclick: function () {
          if (!items.length) return NV.toast('Add at least one design.', 'bad');
          var length = packed.length, pxcm = st.dpi / CM;
          var W = Math.round(st.width * pxcm), H = Math.round(length * pxcm);
          if (W * H > 160e6) return NV.toast('That sheet is enormous at ' + st.dpi + ' DPI. Lower the DPI or split the order.', 'bad');
          var out = document.createElement('canvas');
          out.width = W; out.height = H;
          draw(out, st, packed, true);
          NV.blobOf(out).then(function (b) { return NV.pngWithDpi(b, st.dpi); })
            .then(function (b) {
              NV.download(b, 'sheet-' + st.width + 'cm-' + length.toFixed(0) + 'cm.png');
              NV.toast('Sheet of ' + W + ' × ' + H + ' px ready.', 'ok');
            });
        }
      }));
      parts.foot.appendChild(el('button', {
        class: 'btn ghost wide', text: 'Download list (CSV)',
        onclick: function () {
          var rows = [['Design', 'Width cm', 'Height cm', 'Quantity', 'Area cm2']];
          items.forEach(function (it) {
            var h = it.cm * it.img.height / it.img.width;
            rows.push([it.name, it.cm.toFixed(1), h.toFixed(1), it.qty, (it.cm * h * it.qty).toFixed(1)]);
          });
          rows.push([]);
          rows.push(['Total length cm', packed.length.toFixed(1)]);
          rows.push(['Roll width cm', st.width]);
          var csv = rows.map(function (r) { return r.join(','); }).join('\n');
          NV.download(new Blob([csv], { type: 'text/csv' }), 'print-sheet.csv');
        }
      }));

      renderList(); update();
    }
  });
})();
