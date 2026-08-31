/* Mockups: coloca el diseño sobre la prenda y respeta la caída de la tela. */
(function () {
  'use strict';
  var el = NV.el, W = 1200, H = 1400;

  /* Silueta de camiseta como Path2D: sirve de relleno y de recorte para sombras. */
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

  /* Sombra de caída: se aplica solo dentro de la prenda. */
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
    group: 'Producción',
    tagline: 'Prueba el diseño sobre camiseta o tote, o sobre tu propia foto.',
    icon: NV.svg('<path d="M8 3 5 5 3 9l3 2v10h12V11l3-2-2-4-3-2a4 4 0 0 1-8 0z"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var parts = NV.bench(host, t);
      var p = {
        prenda: 'camiseta', colorPrenda: '#f2f0eb', fondo: '#e8e3d8',
        tam: 42, x: 50, y: 40, rot: 0, opacidad: 96, tela: true, guia: true
      };
      var design = null, photo = null;

      var wrap = el('div', { style: 'flex:1;overflow:auto;padding:20px;display:flex;justify-content:center;align-items:flex-start' });
      var cv = el('canvas', { width: W, height: H, style: 'max-width:100%;max-height:78vh;box-shadow:0 20px 60px -34px #000;cursor:move;border-radius:4px' });
      wrap.appendChild(cv);
      parts.stage.appendChild(wrap);
      var info = el('div', { class: 'meta', text: 'Arrastra el diseño para colocarlo' });
      parts.stage.appendChild(info);

      function zone() {
        if (p.prenda === 'tote') return { x: 320, y: 470, w: 560, h: 600 };
        if (p.prenda === 'foto') return { x: W * 0.2, y: H * 0.2, w: W * 0.6, h: H * 0.6 };
        return { x: 390, y: 310, w: 420, h: 545 };
      }

      function render() {
        var ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = p.fondo;
        ctx.fillRect(0, 0, W, H);

        var garment = null;
        if (p.prenda === 'foto' && photo) {
          var k = Math.max(W / photo.width, H / photo.height);
          ctx.drawImage(photo, (W - photo.width * k) / 2, (H - photo.height * k) / 2, photo.width * k, photo.height * k);
        } else if (p.prenda === 'tote') {
          garment = totePath();
          toteDetails(ctx);
          ctx.fillStyle = p.colorPrenda;
          ctx.fill(garment);
        } else {
          garment = teePath();
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,.28)';
          ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
          ctx.fillStyle = p.colorPrenda;
          ctx.fill(garment);
          ctx.restore();
        }

        var z = zone();
        ctx.save();
        if (garment) ctx.clip(garment);            // el arte y la sombra no salen de la prenda
        if (design) {
          var maxw = z.w * (p.tam / 100);
          var dw = maxw, dh = maxw * design.height / design.width;
          var cx = z.x + z.w * (p.x / 100), cy = z.y + z.h * (p.y / 100);
          ctx.save();
          ctx.globalAlpha = p.opacidad / 100;
          ctx.translate(cx, cy);
          ctx.rotate(p.rot * Math.PI / 180);
          ctx.drawImage(design, -dw / 2, -dh / 2, dw, dh);
          ctx.restore();
        }
        if (garment) {
          ctx.globalCompositeOperation = 'multiply';
          shade(ctx);
          if (p.tela) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = ctx.createPattern(weave(), 'repeat');
            ctx.fillRect(0, 0, W, H);
          }
        }
        ctx.restore();

        if (p.prenda === 'camiseta' && garment) teeDetails(ctx);
        if (p.guia) {
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
        p.tam = IM.clamp(p.tam + (e.deltaY < 0 ? 2 : -2), 5, 130);
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
        NV.loadImage(pIn.files[0]).then(function (img) { photo = img; p.prenda = 'foto'; ui.sync(); render(); });
      });

      parts.body.appendChild(el('button', { class: 'btn primary wide', text: 'Cargar diseño', onclick: function () { dIn.click(); } }));
      parts.body.appendChild(dIn); parts.body.appendChild(pIn);

      var ui = NV.controls(parts.body, [
        { k: 'seg', id: 'prenda', label: 'Soporte', def: 'camiseta', opts: [['camiseta', 'Camiseta'], ['tote', 'Tote'], ['foto', 'Mi foto']] },
        { k: 'button', label: 'Cargar foto de prenda', act: function () { pIn.click(); }, },
        { k: 'color', id: 'colorPrenda', label: 'Color de la prenda', def: '#f2f0eb', show: function (q) { return q.prenda !== 'foto'; } },
        { k: 'color', id: 'fondo', label: 'Color del fondo', def: '#e8e3d8', show: function (q) { return q.prenda !== 'foto'; } },
        { k: 'group', label: 'Colocación' },
        { k: 'range', id: 'tam', label: 'Tamaño', min: 5, max: 130, step: 1, def: 42, unit: ' %' },
        { k: 'range', id: 'x', label: 'Posición horizontal', min: -30, max: 130, step: 0.5, def: 50, unit: ' %', dec: 0 },
        { k: 'range', id: 'y', label: 'Posición vertical', min: -30, max: 130, step: 0.5, def: 40, unit: ' %', dec: 0 },
        { k: 'range', id: 'rot', label: 'Rotación', min: -45, max: 45, step: 1, def: 0, unit: '°' },
        { k: 'range', id: 'opacidad', label: 'Opacidad', min: 20, max: 100, step: 1, def: 96, unit: ' %' },
        { k: 'group', label: 'Realismo' },
        { k: 'check', id: 'tela', label: 'Textura de tela', def: true },
        { k: 'check', id: 'guia', label: 'Mostrar la zona de impresión', def: true }
      ], p, function () { render(); });
      ui.sync();
      parts.body.appendChild(el('p', { class: 'hint', text: 'Arrastra sobre el lienzo para mover y usa la rueda para escalar. La zona punteada es el área imprimible sugerida.' }));

      parts.foot.appendChild(el('button', {
        class: 'btn primary wide', text: 'Descargar mockup',
        onclick: function () {
          if (!design) return NV.toast('Carga primero un diseño.', 'bad');
          var g = p.guia; p.guia = false; render();
          NV.blobOf(cv).then(function (b) {
            NV.download(b, 'mockup-' + p.prenda + '.png');
            p.guia = g; render();
          });
        }
      }));
      render();
    }
  });
})();
