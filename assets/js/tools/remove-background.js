/* Remove background: a colour wand plus erase and restore brushes. */
(function () {
  'use strict';

  function autoAlpha(src, seeds, p) {
    var w = src.width, h = src.height, n = w * h, i;
    var out = new Float32Array(n);
    var list = seeds.map(function (s) {
      return IM.clamp(Math.round(s[1] * (h - 1)), 0, h - 1) * w + IM.clamp(Math.round(s[0] * (w - 1)), 0, w - 1);
    });
    if (!list.length) { out.fill(1); return out; }
    var mask = IM.floodMask(src, list, p.tolerance, p.contiguous);
    for (i = 0; i < n; i++) out[i] = mask[i] ? 0 : 1;
    return out;
  }

  function paintCursor(view) {
    var c = NV.el('div', {
      style: 'position:absolute;border:1px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.6);border-radius:50%;pointer-events:none;display:none;z-index:6;mix-blend-mode:difference'
    });
    view.appendChild(c);
    return c;
  }

  NV.register({
    slug: 'remove-background',
    name: 'Remove background',
    group: 'Cutout cleanup',
    tagline: 'A colour wand, a brush to erase and a brush to bring back what it ate.',
    icon: NV.svg('<path d="M13 3 3 13l5 5 10-10z"/><path d="m14 8 5 5"/><path d="M18 20h4"/><path d="M8 18 5 21"/>'),
    intro: 'Click the background to knock it out, then fix the rest by hand with the brushes. Best on flat backgrounds: white, chroma and studio shots.',
    debounce: 60,
    controls: [
      { k: 'seg', id: 'tool', label: 'Tool', def: 'wand', opts: [['wand', 'Wand'], ['erase', 'Erase'], ['restore', 'Restore']] },
      { k: 'note', text: 'Click the background to mark it. Every click adds another reference colour.', show: function (p) { return p.tool === 'wand'; } },
      { k: 'note', text: 'Paint over the image. Hold Alt to pan the canvas.', show: function (p) { return p.tool !== 'wand'; } },
      { k: 'range', id: 'tolerance', label: 'Tolerance', min: 1, max: 120, step: 1, def: 26, unit: '' },
      { k: 'check', id: 'contiguous', label: 'Connected area only', def: true },
      { k: 'range', id: 'brush', label: 'Brush size', min: 4, max: 400, step: 2, def: 60, unit: ' px', show: function (p) { return p.tool !== 'wand'; } },
      { k: 'range', id: 'hardness', label: 'Brush hardness', min: 0, max: 100, step: 5, def: 80, unit: ' %', show: function (p) { return p.tool !== 'wand'; } },
      { k: 'group', label: 'Cutout finish' },
      { k: 'range', id: 'feather', label: 'Soften edge', min: 0, max: 4, step: 0.1, def: 0.8, unit: ' px', dec: 1, scale: true },
      { k: 'range', id: 'shrink', label: 'Shrink contour', min: -3, max: 4, step: 0.25, def: 0.75, unit: ' px', dec: 2, scale: true },
      { k: 'range', id: 'defringe', label: 'Defringe (removes halo)', min: 0, max: 100, step: 1, def: 75, unit: ' %' },
      { k: 'check', id: 'inspect', label: 'Show the cutout on a warning background', def: false }
    ],
    setup: function (api, stage, vw) {
      var st = api.state, p = api.params;
      st.custom = { seeds: [], cache: {} };
      ['full', 'prev'].forEach(function (key) {
        var s = st[key], c = document.createElement('canvas');
        c.width = s.width; c.height = s.height;
        st.custom[key + 'Mask'] = c;
      });
      /* Starting seeds: the four corners are usually background. */
      st.custom.seeds = [[0.004, 0.004], [0.996, 0.004], [0.004, 0.996], [0.996, 0.996]];

      var cursor = paintCursor(vw.view), last = null, drawing = false;

      function toImage(e) {
        var r = vw.base.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) / r.width,
          y: (e.clientY - r.top) / r.height,
          scale: r.width / vw.base.width
        };
      }
      function stroke(a, b) {
        var col = p.tool === 'erase' ? 'rgba(255,0,0,' : 'rgba(0,255,0,';
        ['full', 'prev'].forEach(function (key) {
          var cv = st.custom[key + 'Mask'], ctx = cv.getContext('2d');
          var rad = p.brush / 2 * (cv.width / st.full.width);
          var g = ctx.createRadialGradient(b.x * cv.width, b.y * cv.height, rad * (p.hardness / 100),
            b.x * cv.width, b.y * cv.height, Math.max(0.6, rad));
          g.addColorStop(0, col + '1)'); g.addColorStop(1, col + '0)');
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          if (a) {
            ctx.strokeStyle = col + '1)';
            ctx.lineWidth = rad * 2 * (0.35 + 0.65 * p.hardness / 100);
            ctx.beginPath();
            ctx.moveTo(a.x * cv.width, a.y * cv.height);
            ctx.lineTo(b.x * cv.width, b.y * cv.height);
            ctx.stroke();
          }
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(b.x * cv.width, b.y * cv.height, Math.max(0.6, rad), 0, 6.2832);
          ctx.fill();
        });
      }

      vw.view.addEventListener('pointerdown', function (e) {
        var m = toImage(e);
        if (m.x < 0 || m.x > 1 || m.y < 0 || m.y > 1) return;
        if (p.tool === 'wand') {
          if (e.shiftKey) st.custom.seeds = [];
          st.custom.seeds.push([m.x, m.y]);
          st.custom.cache = {};
          api.rerun();
          return;
        }
        if (e.altKey) return;
        drawing = true; last = m; stroke(null, m); api.rerun();
      });
      window.addEventListener('pointermove', function (e) {
        var m = toImage(e);
        if (p.tool !== 'wand') {
          var r = vw.base.getBoundingClientRect();
          var d = p.brush * (r.width / vw.base.width) * (st.full.width / vw.base.width);
          var vr = vw.view.getBoundingClientRect();
          cursor.style.display = 'block';
          cursor.style.width = cursor.style.height = d + 'px';
          cursor.style.left = (e.clientX - vr.left - d / 2) + 'px';
          cursor.style.top = (e.clientY - vr.top - d / 2) + 'px';
        } else cursor.style.display = 'none';
        if (!drawing) return;
        stroke(last, m); last = m; api.rerun();
      });
      window.addEventListener('pointerup', function () { drawing = false; last = null; });
      vw.view.addEventListener('pointerleave', function () { cursor.style.display = 'none'; });
      function lock() {
        vw.view.dataset.lock = (p.tool !== 'wand' && !window.__nvAlt) ? '1' : '0';
      }
      window.addEventListener('keydown', function (e) { if (e.key === 'Alt') { window.__nvAlt = 1; lock(); } });
      window.addEventListener('keyup', function (e) { if (e.key === 'Alt') { window.__nvAlt = 0; lock(); } });
      setInterval(lock, 250);

      api.reset = function () {
        st.custom.seeds = []; st.custom.cache = {};
        ['full', 'prev'].forEach(function (key) {
          var c = st.custom[key + 'Mask'];
          c.getContext('2d').clearRect(0, 0, c.width, c.height);
        });
        api.rerun();
      };
      var railFoot = document.querySelector('.rail-foot');
      railFoot.insertBefore(NV.el('button', {
        class: 'btn ghost wide', text: 'Start over', onclick: function () { api.reset(); NV.toast('Cutout reset.'); }
      }), railFoot.firstChild);
    },
    process: function (c) {
      var st = c.state, src = c.src, n = src.width * src.height, i;
      var key = (c.preview ? 'p' : 'f') + '|' + c.p.tolerance + '|' + c.p.contiguous + '|' + st.custom.seeds.length;
      var alpha = st.custom.cache[key];
      if (!alpha) { alpha = autoAlpha(src, st.custom.seeds, c.p); st.custom.cache = {}; st.custom.cache[key] = alpha; }

      var mc = st.custom[(c.preview ? 'prev' : 'full') + 'Mask'];
      var md = mc.getContext('2d').getImageData(0, 0, mc.width, mc.height).data;
      var out = IM.copy(src), q = out.data, p0 = src.data;
      for (i = 0; i < n; i++) {
        var a = alpha[i];
        var er = md[i * 4] / 255, keep = md[i * 4 + 1] / 255;
        a = a * (1 - er);
        if (keep > 0) a = Math.max(a, keep);
        q[i * 4 + 3] = p0[i * 4 + 3] * a;
      }
      if (c.p.defringe > 0) out = IM.defringe(out, c.p.defringe / 100, 250);
      if (Math.abs(c.p.shrink) > 0.001 || c.p.feather > 0.05) out = IM.reshapeAlpha(out, c.p.shrink, c.p.feather, 128);
      if (c.p.inspect) {
        var v = out.data;
        for (i = 0; i < n; i++) {
          var al = v[i * 4 + 3] / 255;
          v[i * 4] = v[i * 4] * al + 255 * (1 - al) * 0.18 + 40 * (1 - al);
          v[i * 4 + 1] = v[i * 4 + 1] * al + 12 * (1 - al);
          v[i * 4 + 2] = v[i * 4 + 2] * al + 70 * (1 - al);
          v[i * 4 + 3] = 255;
        }
      }
      return out;
    }
  });
})();
