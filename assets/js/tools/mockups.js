/* Mockups: place the artwork on the garment and let the fabric drape show through. */
(function () {
  'use strict';
  var el = NV.el, W = 1200, H = 1400;

  /* Tee silhouette as a Path2D: it fills the shirt and clips the shading. */
  function teePath() {
    var d = new Path2D();
    d.moveTo(600, 239);
    d.bezierCurveTo(538, 239, 486, 204, 477, 152);
    d.lineTo(431, 146);
    d.lineTo(258, 194);
    d.bezierCurveTo(242, 199, 236, 213, 242, 225);
    d.lineTo(139, 395);
    d.bezierCurveTo(133, 407, 141, 421, 157, 425);
    d.lineTo(292, 459);
    d.bezierCurveTo(308, 462, 324, 454, 326, 441);
    d.lineTo(358, 338);
    d.lineTo(331, 1122);
    d.quadraticCurveTo(330, 1150, 364, 1150);
    d.lineTo(836, 1150);
    d.quadraticCurveTo(870, 1150, 869, 1122);
    d.lineTo(842, 338);
    d.lineTo(874, 441);
    d.bezierCurveTo(876, 454, 892, 462, 908, 459);
    d.lineTo(1043, 425);
    d.bezierCurveTo(1059, 421, 1067, 407, 1061, 395);
    d.lineTo(958, 225);
    d.bezierCurveTo(964, 213, 958, 199, 942, 194);
    d.lineTo(769, 146);
    d.lineTo(723, 152);
    d.bezierCurveTo(714, 204, 662, 239, 600, 239);
    d.closePath();
    return d;
  }

  function teeDetails(ctx) {
    ctx.strokeStyle = 'rgba(0,0,0,.20)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(479, 157);
    ctx.bezierCurveTo(493, 211, 544, 245, 600, 245);
    ctx.bezierCurveTo(656, 245, 707, 211, 721, 157);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.13)';
    [[157, 425, 292, 459], [1043, 425, 908, 459], [338, 1122, 862, 1122]].forEach(function (l) {
      ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]); ctx.stroke();
    });
  }

  function totePath() {
    var d = new Path2D();
    d.rect(250, 380, 700, 800);
    return d;
  }

  function toteDetails(ctx) {
    ctx.strokeStyle = 'rgba(0,0,0,.3)';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(400, 392);
    ctx.bezierCurveTo(400, 172, 800, 172, 800, 392);
    ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,.16)';
    ctx.strokeRect(250, 380, 700, 800);
  }

  /* Drape shading: applied inside the garment only. */
  function shade(ctx) {
    var g = ctx.createRadialGradient(600, 500, 120, 600, 700, 780);
    g.addColorStop(0, 'rgba(255,255,255,.14)');
    g.addColorStop(0.5, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    var f = ctx.createLinearGradient(0, 0, W, 0);
    f.addColorStop(0, 'rgba(0,0,0,.20)');
    f.addColorStop(0.22, 'rgba(0,0,0,0)');
    f.addColorStop(0.78, 'rgba(0,0,0,0)');
    f.addColorStop(1, 'rgba(0,0,0,.20)');
    ctx.fillStyle = f;
    ctx.fillRect(0, 0, W, H);
  }

  /* Adult tee, flat chest width x body length in cm. */
  var CHART = {
    s:  { w: 46, h: 70 }, m: { w: 51, h: 73 }, l: { w: 56, h: 76 },
    xl: { w: 61, h: 79 }, xxl: { w: 66, h: 81 }, xxxl: { w: 71, h: 84 }
  };
  var TOTE = { w: 38, h: 42 };

  var weaveCache = null;
  function weave() {
    if (weaveCache) return weaveCache;
    var c = document.createElement('canvas'); c.width = c.height = 220;
    var x = c.getContext('2d'), id = x.createImageData(220, 220);
    var nz = IM.noise(220, 220, 2.2, 3, 11);
    for (var i = 0; i < 220 * 220; i++) {
      var v = 128 + (nz[i] - 0.5) * 90;
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    weaveCache = c;
    return c;
  }

  NV.register({
    slug: 'mockups',
    name: 'Mockups',
    group: 'Production',
    tagline: 'Try the artwork on a tee or a tote, or on a photo of your own.',
    icon: NV.svg('<path d="M8 3 5 5 3 9l3 2v10h12V11l3-2-2-4-3-2a4 4 0 0 1-8 0z"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var parts = NV.bench(host, t);
      var p = {
        garment: 'tee', garmentColor: '#f2f0eb', background: '#e8e3d8',
        size: 42, x: 50, y: 40, rot: 0, opacity: 96, fabric: true, guide: true,
        garmentSize: 'm', ruler: true
      };
      var design = null, photo = null;

      var wrap = el('div', { style: 'flex:1;overflow:auto;padding:20px;display:flex;justify-content:center;align-items:flex-start' });
      var cv = el('canvas', { width: W, height: H, style: 'max-width:100%;max-height:78vh;box-shadow:0 20px 60px -34px #000;cursor:move;border-radius:4px' });
      wrap.appendChild(cv);
      parts.stage.appendChild(wrap);
      var info = el('div', { class: 'meta', text: 'Drag the artwork to place it' });
      parts.stage.appendChild(info);

      /* Pixels per centimetre, taken from the drawn garment's real width. */
      function scale() {
        if (p.garment === 'tote') return { pxcm: 700 / TOTE.w, g: TOTE };
        if (p.garment === 'photo') return null;
        var g = CHART[p.garmentSize] || CHART.m;
        return { pxcm: 538 / g.w, g: g };          // the tee body spans 331..869 px
      }

      function measure() {
        var sc = scale();
        if (!sc || !design) return null;
        var z = zone();
        var dw = z.w * (p.size / 100);
        return {
          w: dw / sc.pxcm, h: dw * design.height / design.width / sc.pxcm,
          gw: sc.g.w, gh: sc.g.h
        };
      }

      function zone() {
        if (p.garment === 'tote') return { x: 320, y: 470, w: 560, h: 600 };
        if (p.garment === 'photo') return { x: W * 0.2, y: H * 0.2, w: W * 0.6, h: H * 0.6 };
        return { x: 390, y: 310, w: 420, h: 545 };
      }

      function render() {
        var ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = p.background;
        ctx.fillRect(0, 0, W, H);

        var garment = null;
        if (p.garment === 'photo' && photo) {
          var k = Math.max(W / photo.width, H / photo.height);
          ctx.drawImage(photo, (W - photo.width * k) / 2, (H - photo.height * k) / 2, photo.width * k, photo.height * k);
        } else if (p.garment === 'tote') {
          garment = totePath();
          toteDetails(ctx);
          ctx.fillStyle = p.garmentColor;
          ctx.fill(garment);
        } else {
          garment = teePath();
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,.28)';
          ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
          ctx.fillStyle = p.garmentColor;
          ctx.fill(garment);
          ctx.restore();
        }

        var z = zone();
        ctx.save();
        if (garment) ctx.clip(garment);            // artwork and shading stay on the garment
        if (design) {
          var maxw = z.w * (p.size / 100);
          var dw = maxw, dh = maxw * design.height / design.width;
          var cx = z.x + z.w * (p.x / 100), cy = z.y + z.h * (p.y / 100);
          ctx.save();
          ctx.globalAlpha = p.opacity / 100;
          ctx.translate(cx, cy);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.drawImage(design, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
        if (garment) {
          ctx.globalCompositeOperation = 'multiply';
          shade(ctx);
          if (p.fabric) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = ctx.createPattern(weave(), 'repeat');
            ctx.fillRect(0, 0, W, H);
          }
        }
        ctx.restore();

        if (p.garment === 'tee' && garment) teeDetails(ctx);
        var mm = measure();
        if (mm && p.ruler) {
          var pad = 16, bx = 26, by = 26, bw = 300, bh = 94;
          ctx.fillStyle = 'rgba(10,9,8,.82)';
          if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill(); }
          else ctx.fillRect(bx, by, bw, bh);
          ctx.strokeStyle = 'rgba(255,45,126,.5)'; ctx.lineWidth = 1.5;
          if (ctx.roundRect) ctx.stroke();
          ctx.textBaseline = 'top';
          ctx.fillStyle = '#FF2D7E';
          ctx.font = '600 13px ui-monospace, monospace';
          ctx.fillText('ARTWORK SIZE', bx + pad, by + pad);
          ctx.fillStyle = '#F3EEE6';
          ctx.font = '700 30px ui-sans-serif, system-ui, sans-serif';
          ctx.fillText(mm.w.toFixed(1) + ' × ' + mm.h.toFixed(1) + ' cm', bx + pad, by + pad + 20);
          ctx.fillStyle = '#A99E8F';
          ctx.font = '500 12px ui-monospace, monospace';
          ctx.fillText((p.garment === 'tote' ? 'TOTE' : String(p.garmentSize).toUpperCase()) +
            '  ·  GARMENT ' + mm.gw + ' × ' + mm.gh + ' cm', bx + pad, by + pad + 58);
        }
        if (p.guide) {
          ctx.strokeStyle = 'rgba(255,45,126,.75)';
          ctx.setLineDash([10, 8]);
          ctx.lineWidth = 2;
          ctx.strokeRect(z.x, z.y, z.w, z.h);
          ctx.setLineDash([]);
        }
      }

      var drag = null;
      cv.addEventListener('pointerdown', function (e) {
        var r = cv.getBoundingClientRect();
        drag = { x: e.clientX, y: e.clientY, px: p.x, py: p.y, sx: W / r.width, sy: H / r.height };
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', function (e) {
        if (!drag) return;
        var z = zone();
        p.x = IM.clamp(drag.px + (e.clientX - drag.x) * drag.sx / z.w * 100, -30, 130);
        p.y = IM.clamp(drag.py + (e.clientY - drag.y) * drag.sy / z.h * 100, -30, 130);
        ui.sync(); render();
      });
      cv.addEventListener('pointerup', function () { drag = null; });
      cv.addEventListener('wheel', function (e) {
        e.preventDefault();
        p.size = IM.clamp(p.size + (e.deltaY < 0 ? 2 : -2), 5, 130);
        ui.sync(); render();
      }, { passive: false });

      var dIn = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      dIn.addEventListener('change', function () {
        if (!dIn.files[0]) return;
        NV.loadImage(dIn.files[0]).then(function (img) { design = img; render(); });
      });
      var pIn = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
      pIn.addEventListener('change', function () {
        if (!pIn.files[0]) return;
        NV.loadImage(pIn.files[0]).then(function (img) { photo = img; p.garment = 'photo'; ui.sync(); render(); });
      });

      parts.body.appendChild(el('button', { class: 'btn primary wide', text: 'Load artwork', onclick: function () { dIn.click(); } }));
      parts.body.appendChild(dIn); parts.body.appendChild(pIn);

      var ui = NV.controls(parts.body, [
        { k: 'seg', id: 'garment', label: 'Surface', def: 'tee', opts: [['tee', 'T-shirt'], ['tote', 'Tote'], ['photo', 'My photo']] },
        { k: 'button', label: 'Load a garment photo', act: function () { pIn.click(); }, },
        { k: 'color', id: 'garmentColor', label: 'Garment colour', def: '#f2f0eb', show: function (q) { return q.garment !== 'photo'; } },
        { k: 'color', id: 'background', label: 'Background colour', def: '#e8e3d8', show: function (q) { return q.garment !== 'photo'; } },
        { k: 'select', id: 'garmentSize', label: 'Garment size', def: 'm', show: function (q) { return q.garment === 'tee'; },
          opts: [['s', 'S · 46 × 70 cm'], ['m', 'M · 51 × 73 cm'], ['l', 'L · 56 × 76 cm'], ['xl', 'XL · 61 × 79 cm'], ['xxl', '2XL · 66 × 81 cm'], ['xxxl', '3XL · 71 × 84 cm']] },
        { k: 'group', label: 'Placement' },
        { k: 'range', id: 'size', label: 'Size', min: 5, max: 130, step: 1, def: 42, unit: ' %' },
        { k: 'range', id: 'x', label: 'Horizontal position', min: -30, max: 130, step: 0.5, def: 50, unit: ' %', dec: 0 },
        { k: 'range', id: 'y', label: 'Vertical position', min: -30, max: 130, step: 0.5, def: 40, unit: ' %', dec: 0 },
        { k: 'range', id: 'rot', label: 'Rotation', min: -45, max: 45, step: 1, def: 0, unit: '°' },
        { k: 'range', id: 'opacity', label: 'Opacity', min: 20, max: 100, step: 1, def: 96, unit: ' %' },
        { k: 'group', label: 'Realism' },
        { k: 'check', id: 'fabric', label: 'Fabric texture', def: true },
        { k: 'check', id: 'guide', label: 'Show the print area', def: true },
        { k: 'check', id: 'ruler', label: 'Show the artwork size in cm', def: true, show: function (q) { return q.garment !== 'photo'; } }
      ], p, function () { render(); });
      ui.sync();
      parts.body.appendChild(el('p', { class: 'hint', text: 'Drag on the canvas to move it and scroll to scale. The dashed area is the suggested print zone, and the readout is the real size the artwork would print at on this garment.' }));

      parts.foot.appendChild(el('button', {
        class: 'btn primary wide', text: 'Download mockup',
        onclick: function () {
          if (!design) return NV.toast('Load an artwork first.', 'bad');
          var g = p.guide, r = p.ruler;
          p.guide = false; p.ruler = false; render();
          NV.blobOf(cv).then(function (b) {
            NV.download(b, 'mockup-' + p.garment + '.png');
            p.guide = g; p.ruler = r; render();
          });
        }
      }));
      render();
    }
  });
})();
