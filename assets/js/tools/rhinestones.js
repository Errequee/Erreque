/* Rhinestones: turns artwork into a stud placement pattern with a real stone count. */
(function () {
  'use strict';
  var el = NV.el;

  /* Standard stone sizes, in millimetres. */
  var SS = { ss6: 2.0, ss8: 2.4, ss10: 2.8, ss12: 3.2, ss16: 3.9, ss20: 4.7, ss30: 6.4 };

  /* Colours that actually exist in a stone catalogue. */
  var STONES = [
    ['Crystal', '#e8ecf2'], ['Crystal AB', '#d6e6f2'], ['Jet', '#17171b'],
    ['Black Diamond', '#6d6f77'], ['Hematite', '#4a4c55'], ['Siam', '#a3162b'],
    ['Light Siam', '#c8324a'], ['Rose', '#e5468b'], ['Fuchsia', '#b8206b'],
    ['Amethyst', '#6a3b8f'], ['Sapphire', '#1b4f9c'], ['Aquamarine', '#7fc4d8'],
    ['Emerald', '#157a4e'], ['Peridot', '#a8c64c'], ['Topaz', '#e2a93b'],
    ['Sun', '#e06a21'], ['Gold Quartz', '#c99a3e'], ['Rose Gold', '#c98a79']
  ].map(function (s) { return { name: s[0], hex: s[1], rgb: IM.rgb(s[1]) }; });

  function nearestStone(r, g, b) {
    var best = STONES[0], bd = 1e9;
    for (var i = 0; i < STONES.length; i++) {
      var d = IM.colorDistance(r, g, b, STONES[i].rgb[0], STONES[i].rgb[1], STONES[i].rgb[2]);
      if (d < bd) { bd = d; best = STONES[i]; }
    }
    return best;
  }

  /* Where the stones go. Everything downstream reads this. */
  function place(src, p) {
    var w = src.width, h = src.height, d = src.data;
    var pxPerMm = w / Math.max(1, p.widthCm * 10);
    var stoneMm = SS[p.stone] || 2.8;
    var stonePx = stoneMm * pxPerMm;
    var pitch = (stoneMm + p.gap) * pxPerMm;
    if (pitch < 1.2) pitch = 1.2;

    var keep = new Uint8Array(w * h), i, n = w * h;
    for (i = 0; i < n; i++) {
      var a = d[i * 4 + 3];
      if (a < p.threshold) continue;
      if (p.ignoreLight) {
        var lum = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
        if (lum > 242) continue;
      }
      keep[i] = 1;
    }
    if (p.mode === 'outline') {                       // stones only along the contour
      var sdf = IM.alphaSDF(src, p.threshold);
      var band = Math.max(stonePx, p.outlineMm * pxPerMm);
      for (i = 0; i < n; i++) if (keep[i] && (sdf[i] < 0 || sdf[i] > band)) keep[i] = 0;
    }

    var rowStep = p.layout === 'offset' ? pitch * 0.866 : pitch;   // hex rows sit closer
    var stones = [], counts = {};
    var half = stonePx / 2;
    for (var row = 0, y = half; y <= h - half + pitch; y += rowStep, row++) {
      var xoff = (p.layout === 'offset' && row % 2) ? pitch / 2 : 0;
      for (var x = half + xoff; x <= w - half; x += pitch) {
        var cover = 0, hits = 0, cr = 0, cg = 0, cb = 0;
        var x0 = Math.max(0, Math.round(x - half)), x1 = Math.min(w - 1, Math.round(x + half));
        var y0 = Math.max(0, Math.round(y - half)), y1 = Math.min(h - 1, Math.round(y + half));
        var st = Math.max(1, Math.floor((x1 - x0) / 5));
        for (var yy = y0; yy <= y1; yy += st) for (var xx = x0; xx <= x1; xx += st) {
          var k = yy * w + xx;
          hits++;
          if (!keep[k]) continue;
          cover++;
          cr += d[k * 4]; cg += d[k * 4 + 1]; cb += d[k * 4 + 2];
        }
        if (!hits || cover / hits < p.density / 100) continue;
        var stone = p.colorMode === 'source'
          ? nearestStone(cr / cover, cg / cover, cb / cover)
          : { name: 'Chosen colour', hex: p.stoneColor };
        stones.push({ x: x, y: y, r: half, hex: stone.hex });
        counts[stone.name] = (counts[stone.name] || 0) + 1;
      }
    }
    return {
      stones: stones, counts: counts, pxPerMm: pxPerMm,
      stoneMm: stoneMm, pitchMm: stoneMm + p.gap,
      heightCm: h / pxPerMm / 10
    };
  }

  function shade(hex, k) {
    var c = IM.rgb(hex);
    return 'rgb(' + c.map(function (v) {
      return Math.round(IM.clamp(k > 0 ? v + (255 - v) * k : v * (1 + k), 0, 255));
    }).join(',') + ')';
  }

  function draw(res, w, h, p) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var ctx = cv.getContext('2d');
    if (p.backdrop !== 'none') {
      ctx.fillStyle = p.backdrop === 'dark' ? '#14120f' : '#f4f1ea';
      ctx.fillRect(0, 0, w, h);
    }
    res.stones.forEach(function (s) {
      if (p.template) {                                // flat dots: the cutting template
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
        return;
      }
      var g = ctx.createRadialGradient(s.x - s.r * 0.32, s.y - s.r * 0.32, s.r * 0.1, s.x, s.y, s.r);
      g.addColorStop(0, shade(s.hex, 0.55));
      g.addColorStop(0.55, s.hex);
      g.addColorStop(1, shade(s.hex, -0.32));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.2832); ctx.fill();
      if (s.r > 2.2) {
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        ctx.lineWidth = Math.max(0.4, s.r * 0.09);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)';      // the facet catching the light
        ctx.beginPath();
        ctx.arc(s.x - s.r * 0.3, s.y - s.r * 0.34, s.r * 0.2, 0, 6.2832);
        ctx.fill();
      }
    });
    return ctx.getImageData(0, 0, w, h);
  }

  NV.register({
    slug: 'rhinestones',
    name: 'Rhinestone patterns',
    group: 'Print effects',
    tagline: 'Turn artwork into a stud layout with the real stone count you need to order.',
    icon: NV.svg('<circle cx="12" cy="5.5" r="2.4"/><circle cx="6" cy="12" r="2.4"/><circle cx="18" cy="12" r="2.4"/><circle cx="12" cy="18.5" r="2.4"/>'),
    intro: 'Stones sit on a real lattice at their real size, so the count and the layout match what you will actually stick down. Set the finished width first — everything is measured from it.',
    debounce: 200,
    controls: [
      { k: 'num', id: 'widthCm', label: 'Finished design width', unit: 'cm', def: 25, min: 2, max: 200, step: 0.5 },
      { k: 'select', id: 'stone', label: 'Stone size', def: 'ss10', opts: [['ss6', 'SS6 · 2.0 mm'], ['ss8', 'SS8 · 2.4 mm'], ['ss10', 'SS10 · 2.8 mm'], ['ss12', 'SS12 · 3.2 mm'], ['ss16', 'SS16 · 3.9 mm'], ['ss20', 'SS20 · 4.7 mm'], ['ss30', 'SS30 · 6.4 mm']] },
      { k: 'range', id: 'gap', label: 'Gap between stones', min: 0, max: 3, step: 0.1, def: 0.4, unit: ' mm', dec: 1 },
      { k: 'seg', id: 'layout', label: 'Layout', def: 'offset', opts: [['offset', 'Offset rows'], ['grid', 'Square grid']] },
      { k: 'group', label: 'Coverage' },
      { k: 'seg', id: 'mode', label: 'Fill', def: 'fill', opts: [['fill', 'Whole shape'], ['outline', 'Outline only']] },
      { k: 'range', id: 'outlineMm', label: 'Outline thickness', min: 1, max: 20, step: 0.5, def: 5, unit: ' mm', dec: 1, show: function (p) { return p.mode === 'outline'; } },
      { k: 'range', id: 'density', label: 'Place a stone from', min: 10, max: 90, step: 5, def: 45, unit: ' % cover' },
      { k: 'range', id: 'threshold', label: 'Alpha threshold', min: 8, max: 250, step: 2, def: 128, unit: '' },
      { k: 'check', id: 'ignoreLight', label: 'Skip near-white areas', def: false },
      { k: 'group', label: 'Stones' },
      { k: 'seg', id: 'colorMode', label: 'Colour', def: 'source', opts: [['source', 'Match artwork'], ['mono', 'One colour']] },
      { k: 'color', id: 'stoneColor', label: 'Stone colour', def: '#e8ecf2', show: function (p) { return p.colorMode === 'mono'; } },
      { k: 'check', id: 'template', label: 'Template view (flat dots for cutting)', def: false },
      { k: 'seg', id: 'backdrop', label: 'Preview on', def: 'none', opts: [['none', 'Transparent'], ['dark', 'Dark'], ['light', 'Light']] }
    ],
    setup: function (api) {
      var box = el('div', { style: 'border:1px solid var(--line);border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:8px' });
      var body = document.querySelector('.rail-body');
      body.insertBefore(box, body.children[1] || null);   // right under the intro
      api.state.custom.report = box;
    },
    process: function (c) {
      var res = place(c.src, c.p);
      c.state.custom.last = res;
      var box = c.state.custom.report;
      if (box) {
        var names = Object.keys(res.counts).sort(function (a, b) { return res.counts[b] - res.counts[a]; });
        box.innerHTML = '';
        box.appendChild(el('div', { class: 'eyebrow', text: 'Stone count' }));
        box.appendChild(el('div', {
          style: 'font-family:var(--f-display);font-size:30px;font-weight:800;line-height:1;color:var(--accent)',
          text: NV.fmt(res.stones.length, 0)
        }));
        box.appendChild(el('p', {
          class: 'hint',
          text: res.stoneMm.toFixed(1) + ' mm stones · pitch ' + res.pitchMm.toFixed(1) + ' mm · ' +
            c.p.widthCm + ' × ' + res.heightCm.toFixed(1) + ' cm · ' +
            NV.fmt(Math.ceil(res.stones.length / 144), 0) + ' gross'
        }));
        if (names.length) {
          var t = el('table'), tb = el('tbody');
          names.forEach(function (n) {
            var hex = (STONES.filter(function (s) { return s.name === n; })[0] || {}).hex || c.p.stoneColor;
            tb.appendChild(el('tr', {}, [
              el('td', {}, [
                el('span', { style: 'display:inline-block;width:11px;height:11px;border-radius:50%;background:' + hex + ';border:1px solid var(--line);margin-right:7px;vertical-align:-1px' }),
                el('span', { text: n })
              ]),
              el('td', { class: 'num', text: NV.fmt(res.counts[n], 0) })
            ]));
          });
          t.appendChild(tb);
          box.appendChild(el('div', { class: 'scroll-x', style: 'max-height:230px;overflow-y:auto' }, [t]));
        }
      }
      return draw(res, c.src.width, c.src.height, c.p);
    },
    exports: [
      { label: 'Download PNG', short: 'Pattern PNG', ext: 'png' },
      {
        label: 'Download SVG template', short: 'SVG template', ext: 'svg', secondary: true,
        make: function (api, done) {
          var res = place(api.src, api.params), p = api.params;
          var mm = function (v) { return +(v / res.pxPerMm).toFixed(2); };
          var W = mm(api.src.width), H = mm(api.src.height);
          var s = '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" ' +
            'width="' + W + 'mm" height="' + H + 'mm" viewBox="0 0 ' + W + ' ' + H + '">\n' +
            '  <!-- ' + res.stones.length + ' stones, ' + res.stoneMm.toFixed(1) + ' mm, pitch ' + res.pitchMm.toFixed(1) + ' mm -->\n';
          res.stones.forEach(function (st) {
            s += '  <circle cx="' + mm(st.x) + '" cy="' + mm(st.y) + '" r="' + mm(st.r) +
              '" fill="' + (p.template ? '#000000' : st.hex) + '"/>\n';
          });
          NV.download(new Blob([s + '</svg>\n'], { type: 'image/svg+xml' }), api.name + '-rhinestones.svg');
          done();
        }
      },
      {
        label: 'Stone list (CSV)', short: 'Stone CSV', ext: 'csv', secondary: true,
        make: function (api, done) {
          var res = api.state.custom.last || place(api.src, api.params);
          var rows = [['Colour', 'Stones', 'Gross']];
          Object.keys(res.counts).forEach(function (n) {
            rows.push([n, res.counts[n], Math.ceil(res.counts[n] / 144)]);
          });
          rows.push([]);
          rows.push(['Total', res.stones.length, Math.ceil(res.stones.length / 144)]);
          rows.push(['Stone size mm', res.stoneMm.toFixed(1)]);
          rows.push(['Design width cm', api.params.widthCm]);
          NV.download(new Blob([rows.map(function (r) { return r.join(','); }).join('\n')],
            { type: 'text/csv' }), api.name + '-stones.csv');
          done();
        }
      }
    ]
  });
})();
