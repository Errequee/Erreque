/* DTF check: audits a file for print readiness and fixes what it finds. */
(function () {
  'use strict';
  var el = NV.el, CM = 2.54;

  function analyse(src, full, p) {
    var d = src.data, n = src.width * src.height, i;
    var semi = 0, opaque = 0, clear = 0, sat = 0, lum = 0, white = 0, satN = 0;
    for (i = 0; i < n; i++) {
      var a = d[i * 4 + 3];
      if (a < 8) { clear++; continue; }
      if (a < 248) semi++;
      opaque++;
      var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      sat += mx ? (mx - mn) / mx : 0;
      lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      if (mx > 244 && mn > 236) white++;
      satN++;
    }
    /* Corners tell you whether a background was ever removed. */
    var w = src.width, h = src.height;
    var corners = [0, w - 1, (h - 1) * w, h * w - 1].map(function (k) { return d[k * 4 + 3]; });
    var cornerOpaque = corners.filter(function (a) { return a > 200; }).length;

    var dpi = full.width / (p.printWidthCm / CM);
    var printHeightCm = full.height / dpi * CM;

    /* Thinnest strokes: how much of the art sits within half a millimetre of an edge. */
    var sdf = IM.alphaSDF(src, 128);
    var pxPerMm = src.width / (p.printWidthCm * 10);
    var thinPx = 0.35 * pxPerMm;
    var thin = 0;
    for (i = 0; i < n; i++) if (sdf[i] > 0 && sdf[i] < thinPx) thin++;

    /* The analysis runs on the preview, so scale counts back to the real file. */
    var k2 = (full.width * full.height) / n;
    return {
      n: n, semi: semi, semiFull: Math.round(semi * k2), opaque: opaque, clear: clear,
      semiPct: opaque ? semi / opaque * 100 : 0,
      coverage: clear < n ? (n - clear) / n * 100 : 0,
      sat: satN ? sat / satN * 100 : 0,
      lum: satN ? lum / satN * 100 : 0,
      whitePct: opaque ? white / opaque * 100 : 0,
      thinPct: opaque ? thin / opaque * 100 : 0,
      cornerOpaque: cornerOpaque, hasAlpha: clear > n * 0.005,
      dpi: dpi, printHeightCm: printHeightCm,
      fullW: full.width, fullH: full.height
    };
  }

  function verdicts(a, p) {
    var v = [];
    v.push({
      n: '01', t: 'Semi-transparency',
      grade: a.semiPct < 0.5 ? 'good' : a.semiPct < 3 ? 'ok' : 'bad',
      text: a.semiPct < 0.5
        ? 'Only ' + NV.fmt(a.semiPct, 2) + ' % of the artwork has partial alpha. Nothing to fix.'
        : NV.fmt(a.semiFull, 0) + ' px are semi-transparent (' + NV.fmt(a.semiPct, 1) +
          ' %). White ink cannot print partial alpha, so these come out dirty or grey at the edges.'
    });
    v.push({
      n: '02', t: 'Background',
      grade: !a.hasAlpha ? 'bad' : a.cornerOpaque > 0 ? 'ok' : 'good',
      text: !a.hasAlpha
        ? 'The file has no transparency at all. The background will print as a solid rectangle.'
        : a.cornerOpaque > 0
          ? a.cornerOpaque + ' of 4 corners are still opaque. Check that no background is left behind.'
          : 'Transparent background, corners clear. Ready for DTF.'
    });
    v.push({
      n: '03', t: 'Resolution',
      grade: a.dpi >= 290 ? 'good' : a.dpi >= 180 ? 'ok' : 'bad',
      text: NV.fmt(a.dpi, 0) + ' DPI · ' + a.fullW + ' × ' + a.fullH + ' px at ' +
        NV.fmt(p.printWidthCm, 1) + ' × ' + NV.fmt(a.printHeightCm, 1) + ' cm. ' +
        (a.dpi >= 290 ? 'Optimal for DTF.'
          : a.dpi >= 180 ? 'Usable, but the edges will soften. Upscale if you can.'
            : 'Too low: this will print visibly pixelated. Upscale or print smaller.')
    });
    v.push({
      n: '04', t: 'Colour',
      grade: a.sat >= 30 ? 'good' : a.sat >= 18 ? 'ok' : 'bad',
      text: 'Average saturation ' + NV.fmt(a.sat, 0) + ' %, brightness ' + NV.fmt(a.lum, 0) + ' %. ' +
        (a.sat >= 30 ? 'Colour has enough punch for film.'
          : 'DTF lays down a little flatter than the screen. A touch of vibrance and contrast helps.')
    });
    v.push({
      n: '05', t: 'Fine detail',
      grade: a.thinPct < 4 ? 'good' : a.thinPct < 12 ? 'ok' : 'bad',
      text: NV.fmt(a.thinPct, 1) + ' % of the artwork sits within 0.35 mm of an edge. ' +
        (a.thinPct < 4 ? 'Strokes are thick enough to transfer cleanly.'
          : 'There are hairlines this thin. They tend to lift off the film or vanish under the press — thicken them or print larger.')
    });
    v.push({
      n: '06', t: 'White ink and film',
      grade: 'info',
      text: 'The art covers ' + NV.fmt(a.coverage, 0) + ' % of the canvas' +
        (a.whitePct > 12 ? ', and ' + NV.fmt(a.whitePct, 0) + ' % of it is near-white — that area leans on the white underbase, so keep the press firm.' : '.')
    });
    return v;
  }

  var GRADE = {
    good: ['Good', 'var(--ok)'], ok: ['Check', 'var(--amber)'],
    bad: ['Fix', 'var(--bad)'], info: ['Note', 'var(--dim)']
  };

  NV.register({
    slug: 'dtf-check',
    name: 'DTF file check',
    group: 'Cutout cleanup',
    tagline: 'Audit a file before it costs you film: alpha, background, DPI, colour and hairlines.',
    icon: NV.svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/><path d="M11 8v3.5M11 14.5v.01"/>'),
    intro: 'Six checks on the file you are about to send to the printer. Anything it flags, it can also fix here — then download the corrected PNG.',
    debounce: 260,
    controls: [
      { k: 'num', id: 'printWidthCm', label: 'Print it at this width', unit: 'cm', def: 28, min: 1, max: 300, step: 0.5 },
      { k: 'note', text: 'Every verdict below is measured against that width. Change it and the report re-runs.' },
      { k: 'group', label: 'Fixes' },
      { k: 'check', id: 'fixSemi', label: 'Correct semi-transparency', def: false },
      { k: 'range', id: 'semiLo', label: 'Erase below', min: 0, max: 254, step: 1, def: 40, unit: ' alpha', show: function (p) { return p.fixSemi; } },
      { k: 'range', id: 'semiHi', label: 'Solidify above', min: 1, max: 255, step: 1, def: 190, unit: ' alpha', show: function (p) { return p.fixSemi; } },
      { k: 'check', id: 'fixHalo', label: 'Remove the edge halo', def: false },
      { k: 'check', id: 'fixColor', label: 'Lift colour for film', def: false },
      { k: 'range', id: 'vibrance', label: 'Vibrance', min: 0, max: 60, step: 1, def: 18, unit: '', show: function (p) { return p.fixColor; } },
      { k: 'range', id: 'contrast', label: 'Contrast', min: 0, max: 40, step: 1, def: 10, unit: '', show: function (p) { return p.fixColor; } },
      { k: 'note', text: 'With no fixes ticked the preview is your untouched file, so you can compare against the report.' }
    ],
    setup: function (api) {
      var box = el('div', { style: 'display:flex;flex-direction:column;gap:9px' });
      var body = document.querySelector('.rail-body');
      body.insertBefore(box, body.querySelector('.group-t'));
      api.state.custom.report = box;
    },
    process: function (c) {
      var a = analyse(c.src, c.state.full, c.p);
      var box = c.state.custom.report;
      if (box) {
        box.innerHTML = '';
        box.appendChild(el('div', { class: 'group-t', style: 'margin:0', text: 'Report' }));
        verdicts(a, c.p).forEach(function (v) {
          var g = GRADE[v.grade];
          var card = el('div', {
            style: 'border:1px solid var(--line);border-left:3px solid ' + g[1] +
              ';border-radius:6px;padding:9px 11px;display:flex;flex-direction:column;gap:4px'
          });
          card.appendChild(el('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:8px' }, [
            el('span', { style: 'font-size:13px;font-weight:600', text: v.n + '  ' + v.t }),
            el('span', {
              class: 'mono',
              style: 'font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:' + g[1],
              text: g[0]
            })
          ]));
          card.appendChild(el('p', { class: 'hint', style: 'margin:0', text: v.text }));
          box.appendChild(card);
        });
      }

      var out = IM.copy(c.src), p = c.p;
      if (p.fixSemi) out = IM.alphaLevels(out, p.semiLo, Math.max(p.semiLo + 1, p.semiHi), false);
      if (p.fixHalo) { out = IM.defringe(out, 0.8, 250); out = IM.reshapeAlpha(out, 0.75, 0.8, 128); }
      if (p.fixColor) out = IM.adjust(out, { contrast: p.contrast, saturation: p.vibrance, brightness: 0 });
      return out;
    },
    exports: [
      { label: 'Download corrected PNG', ext: 'png' },
      {
        label: 'Save the report (TXT)', ext: 'txt', secondary: true,
        make: function (api, done) {
          var a = analyse(api.src, api.state.full, api.params);
          var lines = ['DTF file check — ' + api.name,
            'Printed at ' + api.params.printWidthCm + ' cm wide', ''];
          verdicts(a, api.params).forEach(function (v) {
            lines.push('[' + GRADE[v.grade][0].toUpperCase() + '] ' + v.n + ' ' + v.t);
            lines.push('    ' + v.text, '');
          });
          NV.download(new Blob([lines.join('\n')], { type: 'text/plain' }), api.name + '-dtf-check.txt');
          done();
        }
      }
    ]
  });
})();
