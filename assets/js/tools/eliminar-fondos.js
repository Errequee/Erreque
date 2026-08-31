/* Eliminar fondos: varita por color más pinceles de borrar y restaurar. */
(function () {
  'use strict';

  function autoAlpha(src, seeds, p) {
    var w = src.width, h = src.height, n = w * h, i;
    var out = new Float32Array(n);
    var list = seeds.map(function (s) {
      return IM.clamp(Math.round(s[1] * (h - 1)), 0, h - 1) * w + IM.clamp(Math.round(s[0] * (w - 1)), 0, w - 1);
    });
    if (!list.length) { out.fill(1); return out; }
    var mask = IM.floodMask(src, list, p.tolerancia, p.contiguo);
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
    slug: 'eliminar-fondos',
    name: 'Eliminar fondos',
    group: 'Limpieza de recortes',
    tagline: 'Varita por color, pincel para borrar y pincel para devolver lo que se comió.',
    icon: NV.svg('<path d="M13 3 3 13l5 5 10-10z"/><path d="m14 8 5 5"/><path d="M18 20h4"/><path d="M8 18 5 21"/>'),
    intro: 'Haz clic sobre el fondo para quitarlo. Después corrige a mano con los pinceles. Ideal para fondos planos: blancos, chroma y estudio.',
    debounce: 60,
    controls: [
      { k: 'seg', id: 'herramienta', label: 'Herramienta', def: 'varita', opts: [['varita', 'Varita'], ['borrar', 'Borrar'], ['restaurar', 'Restaurar']] },
      { k: 'note', text: 'Clic en el fondo para marcarlo. Cada clic suma un color de referencia.', show: function (p) { return p.herramienta === 'varita'; } },
      { k: 'note', text: 'Pinta sobre la imagen. Mantén Alt para desplazar el lienzo.', show: function (p) { return p.herramienta !== 'varita'; } },
      { k: 'range', id: 'tolerancia', label: 'Tolerancia', min: 1, max: 120, step: 1, def: 26, unit: '' },
      { k: 'check', id: 'contiguo', label: 'Solo la zona conectada', def: true },
      { k: 'range', id: 'pincel', label: 'Tamaño del pincel', min: 4, max: 400, step: 2, def: 60, unit: ' px', show: function (p) { return p.herramienta !== 'varita'; } },
      { k: 'range', id: 'dureza', label: 'Dureza del pincel', min: 0, max: 100, step: 5, def: 80, unit: ' %', show: function (p) { return p.herramienta !== 'varita'; } },
      { k: 'group', label: 'Acabado del recorte' },
      { k: 'range', id: 'suave', label: 'Suavizar borde', min: 0, max: 4, step: 0.1, def: 0.8, unit: ' px', dec: 1, scale: true },
      { k: 'range', id: 'contraer', label: 'Contraer contorno', min: -3, max: 4, step: 0.25, def: 0.75, unit: ' px', dec: 2, scale: true },
      { k: 'range', id: 'desfleque', label: 'Desfleque (quita halo)', min: 0, max: 100, step: 1, def: 75, unit: ' %' },
      { k: 'check', id: 'ver', label: 'Ver el recorte sobre fondo de aviso', def: false }
    ],
    setup: function (api, stage, vw) {
      var st = api.state, p = api.params;
      st.custom = { seeds: [], cache: {} };
      ['full', 'prev'].forEach(function (key) {
        var s = st[key], c = document.createElement('canvas');
        c.width = s.width; c.height = s.height;
        st.custom[key + 'Mask'] = c;
      });
      /* Semillas iniciales: las cuatro esquinas suelen ser fondo. */
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
        var col = p.herramienta === 'borrar' ? 'rgba(255,0,0,' : 'rgba(0,255,0,';
        ['full', 'prev'].forEach(function (key) {
          var cv = st.custom[key + 'Mask'], ctx = cv.getContext('2d');
          var rad = p.pincel / 2 * (cv.width / st.full.width);
          var g = ctx.createRadialGradient(b.x * cv.width, b.y * cv.height, rad * (p.dureza / 100),
            b.x * cv.width, b.y * cv.height, Math.max(0.6, rad));
          g.addColorStop(0, col + '1)'); g.addColorStop(1, col + '0)');
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          if (a) {
            ctx.strokeStyle = col + '1)';
            ctx.lineWidth = rad * 2 * (0.35 + 0.65 * p.dureza / 100);
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
        if (p.herramienta === 'varita') {
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
        if (p.herramienta !== 'varita') {
          var r = vw.base.getBoundingClientRect();
          var d = p.pincel * (r.width / vw.base.width) * (st.full.width / vw.base.width);
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
        vw.view.dataset.lock = (p.herramienta !== 'varita' && !window.__nvAlt) ? '1' : '0';
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
        class: 'btn ghost wide', text: 'Empezar de cero', onclick: function () { api.reset(); NV.toast('Recorte reiniciado.'); }
      }), railFoot.firstChild);
    },
    process: function (c) {
      var st = c.state, src = c.src, w = src.width, h = src.height, n = w * h, i;
      var key = (c.preview ? 'p' : 'f') + '|' + c.p.tolerancia + '|' + c.p.contiguo + '|' + st.custom.seeds.length;
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
      if (c.p.desfleque > 0) out = IM.defringe(out, c.p.desfleque / 100, 250);
      if (Math.abs(c.p.contraer) > 0.001 || c.p.suave > 0.05) out = IM.reshapeAlpha(out, c.p.contraer, c.p.suave, 128);
      if (c.p.ver) {
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
