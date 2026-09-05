/* Core: tool registry, routing, workbench and exporting. */
(function (root) {
  'use strict';
  var NV = { tools: [], byId: {} };

  NV.register = function (t) { NV.tools.push(t); NV.byId[t.slug] = t; };

  /* ---------------- helpers ---------------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag), k;
    if (attrs) for (k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  NV.el = el;

  NV.svg = function (d, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.6) +
      '" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';
  };

  NV.toast = function (msg, kind) {
    var box = document.querySelector('.toasts') || document.body.appendChild(el('div', { class: 'toasts' }));
    var t = el('div', { class: 'toast ' + (kind || ''), text: msg });
    box.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function () { t.remove(); }, 320); }, 3200);
  };

  NV.fmt = function (v, d) {
    return Number(v).toLocaleString('en-US', { minimumFractionDigits: d == null ? 2 : d, maximumFractionDigits: d == null ? 2 : d });
  };

  /* Saving. Embedded viewers block download links, so we ask the host to save the
     file; on a normal web host a plain anchor does the job. */
  var saver = null;
  function saveApi() {
    if (!saver) {
      saver = (window.claude && typeof claude.use === 'function')
        ? claude.use('downloads').catch(function () { return null; })
        : Promise.resolve(null);
    }
    return saver;
  }

  NV.download = function (blob, name) {
    return saveApi().then(function (d) {
      if (!d) {
        var u = URL.createObjectURL(blob), a = el('a', { href: u, download: name });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
        NV.toast('File downloaded.', 'ok');
        return;
      }
      return d.save({ filename: name, data: blob }).then(function () {
        NV.toast('File saved.', 'ok');
      }, function (e) {
        var code = e && e.code, ext = (name.split('.').pop() || '').toUpperCase();
        if (code === 'declined') return;
        if (code === 'rejected_extension' || code === 'extension_not_enabled') {
          NV.toast('This view cannot save ' + ext + ' files. Open the full site to download it.', 'bad');
        } else if (code === 'too_large') {
          NV.toast('The file is over 16 MB. Lower the DPI or split the job across sheets.', 'bad');
        } else if (code === 'rate_limited') {
          NV.toast('A download is already waiting for confirmation. Finish it and try again.', 'bad');
        } else {
          NV.toast('The file could not be saved.', 'bad');
        }
      });
    });
  };

  NV.blobOf = function (canvas, type, quality) {
    return new Promise(function (res) { canvas.toBlob(res, type || 'image/png', quality); });
  };

  NV.safeName = function (s) {
    return (s || 'artwork').replace(/\.[^.]+$/, '').replace(/[^\w\-]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'diseno';
  };

  var crcTable = (function () {
    var t = new Uint32Array(256), c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(buf, start, len) {
    var c = 0xFFFFFFFF, i;
    start = start || 0; len = len == null ? buf.length : len;
    for (i = start; i < start + len; i++) c = crcTable[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  /* Write the physical resolution (pHYs) into a PNG: it matters when printing. */
  NV.pngWithDpi = function (blob, dpi) {
    return blob.arrayBuffer().then(function (buf) {
      var src = new Uint8Array(buf);
      if (src[0] !== 0x89 || src[1] !== 0x50) return blob;
      var ppm = Math.round(dpi / 0.0254);
      var chunk = new Uint8Array(21);
      var dv = new DataView(chunk.buffer);
      dv.setUint32(0, 9);
      chunk.set([0x70, 0x48, 0x59, 0x73], 4);       // "pHYs"
      dv.setUint32(8, ppm); dv.setUint32(12, ppm);
      chunk[16] = 1;
      dv.setUint32(17, crc32(chunk, 4, 13));
      var at = 8 + 25;                               // after the signature and the IHDR
      var out = new Uint8Array(src.length + chunk.length);
      out.set(src.subarray(0, at), 0);
      out.set(chunk, at);
      out.set(src.subarray(at), at + chunk.length);
      return new Blob([out], { type: 'image/png' });
    });
  };

  /* Stored (uncompressed) ZIP: enough for PNG and SVG, already compressed. */
  NV.zip = function (files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    return Promise.all(files.map(function (f) {
      return (f.blob.arrayBuffer ? f.blob.arrayBuffer() : Promise.resolve(f.blob))
        .then(function (b) { return { name: f.name, data: new Uint8Array(b) }; });
    })).then(function (items) {
      items.forEach(function (it) {
        var nameB = enc.encode(it.name), crc = crc32(it.data);
        var loc = new Uint8Array(30 + nameB.length), dv = new DataView(loc.buffer);
        dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true);
        dv.setUint32(14, crc, true); dv.setUint32(18, it.data.length, true);
        dv.setUint32(22, it.data.length, true); dv.setUint16(26, nameB.length, true);
        loc.set(nameB, 30);
        parts.push(loc, it.data);
        var cen = new Uint8Array(46 + nameB.length), cv = new DataView(cen.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, it.data.length, true);
        cv.setUint32(24, it.data.length, true); cv.setUint16(28, nameB.length, true);
        cv.setUint32(42, offset, true);
        cen.set(nameB, 46);
        central.push(cen);
        offset += loc.length + it.data.length;
      });
      var cenSize = central.reduce(function (a, c) { return a + c.length; }, 0);
      var end = new Uint8Array(22), ev = new DataView(end.buffer);
      ev.setUint32(0, 0x06054b50, true);
      ev.setUint16(8, central.length, true); ev.setUint16(10, central.length, true);
      ev.setUint32(12, cenSize, true); ev.setUint32(16, offset, true);
      return new Blob(parts.concat(central, [end]), { type: 'application/zip' });
    });
  };

  NV.loadImage = function (file) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () { res(img); };
      img.onerror = function () { rej(new Error('that image could not be read.')); };
      img.src = URL.createObjectURL(file);
    });
  };

  /* ---------------- controls ---------------- */
  NV.controls = function (host, spec, params, onChange) {
    var nodes = [];
    spec.forEach(function (c) {
      var wrap = el('div', { class: c.k === 'group' ? 'group-t' : 'field' });
      var val, lab;
      function fire() { onChange(c); }

      if (c.k === 'group') { wrap.textContent = c.label; }
      else if (c.k === 'note') { wrap.className = ''; wrap.appendChild(el('p', { class: 'hint', text: c.text })); }
      else if (c.k === 'range') {
        val = el('b', { class: 'mono' });
        lab = el('div', { class: 'flabel' }, [el('span', { text: c.label }), val]);
        var r = el('input', { type: 'range', min: c.min, max: c.max, step: c.step, value: params[c.id] });
        function show() { val.textContent = (+params[c.id]).toFixed(c.dec == null ? (c.step < 1 ? 1 : 0) : c.dec) + (c.unit || ''); }
        r.addEventListener('input', function () { params[c.id] = +r.value; show(); fire(); });
        show();
        wrap.appendChild(lab); wrap.appendChild(r);
        wrap.reset = function () { r.value = params[c.id]; show(); };
      }
      else if (c.k === 'seg') {
        wrap.appendChild(el('div', { class: 'flabel' }, [el('span', { text: c.label })]));
        var seg = el('div', { class: 'seg' });
        c.opts.forEach(function (o) {
          var b = el('button', { type: 'button', text: o[1], title: o[2] || o[1] });
          if (params[c.id] === o[0]) b.className = 'on';
          b.addEventListener('click', function () {
            params[c.id] = o[0];
            [].forEach.call(seg.children, function (x) { x.className = ''; });
            b.className = 'on'; fire();
          });
          seg.appendChild(b);
        });
        wrap.appendChild(seg);
      }
      else if (c.k === 'select') {
        wrap.appendChild(el('div', { class: 'flabel' }, [el('span', { text: c.label })]));
        var s = el('select');
        c.opts.forEach(function (o) { s.appendChild(el('option', { value: o[0], text: o[1] })); });
        s.value = params[c.id];
        s.addEventListener('change', function () { params[c.id] = s.value; fire(); });
        wrap.appendChild(s);
      }
      else if (c.k === 'check') {
        var cb = el('input', { type: 'checkbox' });
        cb.checked = !!params[c.id];
        cb.addEventListener('change', function () { params[c.id] = cb.checked; fire(); });
        wrap.className = '';
        wrap.appendChild(el('label', { class: 'check' }, [cb, el('span', { text: c.label })]));
      }
      else if (c.k === 'color') {
        wrap.appendChild(el('div', { class: 'flabel' }, [el('span', { text: c.label })]));
        var cp = el('input', { type: 'color', class: 'swatch', value: params[c.id] });
        cp.addEventListener('input', function () { params[c.id] = cp.value; fire(); });
        wrap.appendChild(cp);
      }
      else if (c.k === 'num') {
        wrap.appendChild(el('div', { class: 'flabel' }, [el('span', { text: c.label }), el('b', { text: c.unit || '' })]));
        var nu = el('input', { type: 'number', min: c.min, max: c.max, step: c.step, value: params[c.id] });
        nu.addEventListener('input', function () { params[c.id] = nu.value === '' ? '' : +nu.value; fire(); });
        wrap.appendChild(nu);
        wrap.reset = function () { nu.value = params[c.id]; };
      }
      else if (c.k === 'button') {
        wrap.className = '';
        wrap.appendChild(el('button', { class: 'btn wide ' + (c.style || 'ghost'), type: 'button', text: c.label, onclick: function () { c.act(); } }));
      }
      host.appendChild(wrap);
      nodes.push({ c: c, node: wrap });
    });
    return {
      sync: function () {
        nodes.forEach(function (n) {
          if (n.c.show) n.node.style.display = n.c.show(params) ? '' : 'none';
          if (n.node.reset) n.node.reset();
        });
      }
    };
  };

  NV.defaults = function (spec) {
    var p = {};
    spec.forEach(function (c) { if (c.id) p[c.id] = c.def; });
    return p;
  };

  /* ---------------- viewer ---------------- */
  NV.viewer = function (stage) {
    var view = el('div', { class: 'viewer' });
    var plate = el('div', { class: 'plate' });
    var base = el('canvas'), top = el('canvas', { class: 'top' });
    var div = el('div', { class: 'divider' }, [el('div', { style: 'position:absolute;left:-9px;top:0;bottom:0;width:19px;cursor:ew-resize' })]);
    plate.appendChild(base); plate.appendChild(top); plate.appendChild(div);
    view.appendChild(plate);
    var busy = el('div', { class: 'busy' }, [el('div', { class: 'spin' }), el('span', { text: 'Working' })]);
    var meta = el('div', { class: 'meta' });
    var bar = el('div', { class: 'toolbar' });
    var st = { s: 1, tx: 0, ty: 0, split: 0, cmp: false, w: 0, h: 0 };

    function apply() {
      plate.style.transform = 'translate(-50%,-50%) translate(' + st.tx + 'px,' + st.ty + 'px) scale(' + st.s + ')';
      div.style.left = (st.w * st.split / 100) + 'px';
      /* The original only shows left of the divider; otherwise the result covers
         everything and transparent areas reveal the checkerboard, not the old image. */
      base.style.clipPath = 'inset(0 ' + (100 - st.split) + '% 0 0)';
      top.style.clipPath = 'inset(0 0 0 ' + st.split + '%)';
      plate.classList.toggle('smooth', st.s < 1);
      zoomLabel.textContent = Math.round(st.s * 100) + '%';
    }
    function fit() {
      var r = view.getBoundingClientRect();
      if (!st.w) return;
      st.s = Math.min((r.width - 48) / st.w, (r.height - 48) / st.h, 1);
      st.tx = st.ty = 0; apply();
    }
    function zoom(k, mx, my) {
      var r = view.getBoundingClientRect();
      var cx = mx == null ? 0 : mx - r.left - r.width / 2;
      var cy = my == null ? 0 : my - r.top - r.height / 2;
      var ns = Math.min(32, Math.max(0.02, st.s * k));
      k = ns / st.s;
      st.tx = cx - k * (cx - st.tx); st.ty = cy - k * (cy - st.ty);
      st.s = ns; apply();
    }

    var zoomLabel = el('button', { type: 'button', text: '100%', title: 'Fit to window', onclick: fit });
    var cmpBtn = el('button', { type: 'button', text: 'Compare', title: 'Show the original on the left' });
    cmpBtn.addEventListener('click', function () {
      st.cmp = !st.cmp; st.split = st.cmp ? 50 : 0;
      view.classList.toggle('cmp', st.cmp); cmpBtn.classList.toggle('on', st.cmp); apply();
    });
    bar.appendChild(el('button', { type: 'button', text: '−', title: 'Zoom out', onclick: function () { zoom(1 / 1.25); } }));
    bar.appendChild(zoomLabel);
    bar.appendChild(el('button', { type: 'button', text: '+', title: 'Zoom in', onclick: function () { zoom(1.25); } }));
    bar.appendChild(el('button', { type: 'button', text: '1:1', title: 'Actual size', onclick: function () { st.s = 1; st.tx = st.ty = 0; apply(); } }));
    bar.appendChild(cmpBtn);

    view.addEventListener('wheel', function (e) { e.preventDefault(); zoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });

    var drag = null;
    div.addEventListener('pointerdown', function (e) {
      e.stopPropagation(); drag = { mode: 'split' }; div.setPointerCapture(e.pointerId);
    });
    view.addEventListener('pointerdown', function (e) {
      if (view.dataset.lock === '1') return;
      drag = { mode: 'pan', x: e.clientX, y: e.clientY, tx: st.tx, ty: st.ty };
      view.classList.add('drag'); view.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (drag.mode === 'pan') { st.tx = drag.tx + (e.clientX - drag.x); st.ty = drag.ty + (e.clientY - drag.y); apply(); }
      else {
        var r = plate.getBoundingClientRect();
        st.split = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)); apply();
      }
    });
    window.addEventListener('pointerup', function () { drag = null; view.classList.remove('drag'); });

    stage.appendChild(view); stage.appendChild(bar); stage.appendChild(meta); stage.appendChild(busy);

    return {
      view: view, plate: plate, base: base, top: top,
      busy: function (on) { busy.classList.toggle('on', !!on); },
      meta: function (txt) { meta.textContent = txt; },
      size: function (w, h) {
        st.w = w; st.h = h;
        [base, top].forEach(function (c) { c.width = w; c.height = h; c.style.width = w + 'px'; c.style.height = h + 'px'; });
        plate.style.width = w + 'px'; plate.style.height = h + 'px';
        plate.style.marginLeft = 0; plate.style.marginTop = 0;
      },
      fit: fit, apply: apply,
      /* base = original (left), top = result */
      paintBase: function (src) { paint(base, src); },
      paintTop: function (src) { paint(top, src); }
    };
    function paint(cv, src) {
      var cx = cv.getContext('2d');
      cx.clearRect(0, 0, cv.width, cv.height);
      if (!src) return;
      if (src instanceof ImageData) cx.putImageData(src, 0, 0);
      else cx.drawImage(src, 0, 0, cv.width, cv.height);
    }
  };

  /* ---------------- image workbench ---------------- */
  /* Shared layout: control rail on the left, work surface on the right. */
  NV.bench = function (host, t) {
    var bench = el('div', { class: 'bench' });
    var rail = el('div', { class: 'rail' });
    var stage = el('div', { class: 'stage' });
    bench.appendChild(rail); bench.appendChild(stage);
    host.appendChild(bench);
    var head = el('div', { class: 'rail-head' }, [el('h1', { text: t.name }), el('p', { text: t.tagline })]);
    var body = el('div', { class: 'rail-body' });
    var foot = el('div', { class: 'rail-foot' });
    rail.appendChild(head); rail.appendChild(body); rail.appendChild(foot);
    return { bench: bench, rail: rail, stage: stage, body: body, foot: foot };
  };

  NV.imageTool = function (t, host) {
    var parts = NV.bench(host, t);
    var stage = parts.stage, body = parts.body, foot = parts.foot;

    var params = NV.defaults(t.controls || []);
    var state = { file: null, img: null, full: null, prev: null, k: 1, out: null, custom: {} };
    var vw = null, ui = null, timer = null;
    var PREV = t.previewMax || 1500;

    var drop = el('div', { class: 'drop' }, [
      el('div', { html: NV.svg('<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>') }),
      el('b', { text: 'Drop your artwork here' }),
      el('small', { text: 'PNG, JPG or WEBP. Nothing leaves your computer: it all runs in this browser.' })
    ]);
    var input = el('input', { type: 'file', accept: t.accept || 'image/*', style: 'display:none' });
    drop.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { if (input.files[0]) load(input.files[0]); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer.files[0]; if (f) load(f);
    });
    stage.appendChild(drop); stage.appendChild(input);
    body.appendChild(el('p', { class: 'hint', text: t.help || 'Load an image to get started.' }));

    function load(file) {
      NV.loadImage(file).then(function (img) {
        state.file = file; state.img = img;
        state.full = IM.dataOf(img);
        var m = Math.max(state.full.width, state.full.height);
        state.k = m > PREV ? PREV / m : 1;
        state.prev = state.k < 1
          ? IM.dataOf(IM.resize(img, state.full.width * state.k, state.full.height * state.k), Math.round(state.full.width * state.k), Math.round(state.full.height * state.k))
          : state.full;
        drop.remove(); build();
      }).catch(function (e) { NV.toast(e.message, 'bad'); });
    }

    function build() {
      body.innerHTML = ''; foot.innerHTML = '';
      vw = NV.viewer(stage);
      var api = {
        params: params, state: state, viewer: vw,
        get src() { return state.full; },
        get out() { return state.out; },
        rerun: schedule, toast: NV.toast,
        name: NV.safeName(state.file && state.file.name)
      };
      if (t.intro) body.appendChild(el('p', { class: 'hint', text: t.intro }));
      ui = NV.controls(body, t.controls || [], params, function (c) {
        if (t.onControl) t.onControl(c, params, state);
        ui.sync();
        if (c && c.heavy && t.manual) return;
        schedule();
      });
      ui.sync();

      if (t.manual) {
        foot.appendChild(el('button', { class: 'btn primary wide', text: 'Run', onclick: function () { schedule(true); } }));
      }
      (t.exports || [{ label: 'Download PNG', ext: 'png' }]).forEach(function (ex) {
        foot.appendChild(el('button', {
          class: 'btn ' + (ex.secondary ? 'ghost' : 'primary') + ' wide',
          text: ex.label,
          onclick: function () { doExport(ex, api); }
        }));
      });
      foot.appendChild(el('button', {
        class: 'btn ghost wide', text: 'Change image',
        onclick: function () { stage.innerHTML = ''; stage.appendChild(drop); stage.appendChild(input); body.innerHTML = ''; foot.innerHTML = ''; state.out = null; }
      }));

      vw.size(state.prev.width, state.prev.height);
      vw.paintBase(state.prev);
      requestAnimationFrame(vw.fit);
      if (t.setup) t.setup(api, stage, vw);
      schedule(false, true);
    }

    function schedule(force, first) {
      clearTimeout(timer);
      timer = setTimeout(function () { run(first); }, first ? 0 : (t.debounce || 90));
    }

    function run() {
      if (!state.prev) return;
      vw.busy(true);
      setTimeout(function () {
        try {
          var scaled = scaleParams(state.k);
          var res = t.process({ src: state.prev, p: scaled, k: state.k, preview: true, state: state });
          state.out = res;
          vw.size(res.width || state.prev.width, res.height || state.prev.height);
          vw.paintBase(state.prev);
          vw.paintTop(res);
          vw.meta(state.full.width + ' × ' + state.full.height + ' px' + (state.k < 1 ? '  ·  preview ' + Math.round(state.k * 100) + '%' : ''));
        } catch (e) {
          NV.toast('Processing failed: ' + e.message, 'bad');
          if (window.console) console.error(e);
        }
        vw.busy(false);
      }, 12);
    }

    function scaleParams(k) {
      var o = {}, id;
      for (id in params) o[id] = params[id];
      if (k < 1) (t.controls || []).forEach(function (c) {
        if (c.scale && o[c.id] != null) o[c.id] = o[c.id] * (c.scale === 2 ? k * k : k);
      });
      return o;
    }

    function doExport(ex, api) {
      vw.busy(true);
      setTimeout(function () {
        try {
          if (ex.make) { ex.make(api, finish); return; }
          var res = t.process({ src: state.full, p: params, k: 1, preview: false, state: state });
          var cv = res instanceof ImageData ? IM.canvasOf(res) : res;
          var type = ex.type || 'image/png';
          NV.blobOf(cv, type, ex.quality)
            .then(function (b) { return (type === 'image/png' && params.dpi) ? NV.pngWithDpi(b, params.dpi) : b; })
            .then(function (b) { NV.download(b, api.name + '-' + t.slug + '.' + (ex.ext || 'png')); finish(); });
        } catch (e) { NV.toast('Export failed: ' + e.message, 'bad'); vw.busy(false); }
      }, 12);
      function finish() { vw.busy(false); }
    }
  };

  /* ---------------- site chrome ---------------- */
  var LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">' +
    '<circle cx="12" cy="12" r="6.2"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/></svg>';

  function chrome() {
    var picker = el('div', { class: 'picker' });
    var btn = el('button', {
      class: 'iconbtn', type: 'button',
      html: NV.svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>') + '<span>Tools</span>'
    });
    var menu = el('div', { class: 'picker-menu' });
    menu.appendChild(el('div', { class: 'head eyebrow', text: 'All 13 tools' }));
    NV.tools.forEach(function (t) {
      menu.appendChild(el('a', { href: '#/' + t.slug, html: t.name + '<small>' + t.tagline + '</small>' }));
    });
    btn.addEventListener('click', function (e) { e.stopPropagation(); picker.classList.toggle('open'); });
    document.addEventListener('click', function () { picker.classList.remove('open'); });
    picker.appendChild(btn); picker.appendChild(menu);

    var theme = el('button', { class: 'iconbtn', type: 'button', title: 'Switch theme', html: NV.svg('<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>') });
    theme.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var next = cur === 'dark' ? 'light' : cur === 'light' ? '' : (matchMedia('(prefers-color-scheme: dark)').matches ? 'light' : 'dark');
      if (next) { document.documentElement.setAttribute('data-theme', next); localStorage.setItem('nv-theme', next); }
      else { document.documentElement.removeAttribute('data-theme'); localStorage.removeItem('nv-theme'); }
    });

    var bar = el('header', { class: 'topbar' }, [
      el('a', { class: 'brand', href: '#/' }, [
        el('span', { class: 'mark', html: LOGO }),
        el('span', {}, [el('b', { text: 'Open Press' }), el('br'), el('span', { text: 'dtf tools' })])
      ]),
      el('nav', { class: 'topnav' }, [picker, theme])
    ]);
    document.body.appendChild(bar);
    document.body.appendChild(el('main', { id: 'app' }));
  }

  NV.footer = function () {
    return el('footer', { class: 'foot' }, [el('div', { class: 'wrap' }, [
      el('div', { class: 'cols' }, [
        el('div', {}, [
          el('div', { class: 'eyebrow', text: 'Open Press' }),
          el('p', { text: 'A tool suite for DTF printing, screen printing and cut vinyl. Free, no account, no limits.' })
        ]),
        el('div', {}, [
          el('div', { class: 'eyebrow', text: 'Privacy' }),
          el('p', { text: 'There is no server. Your files are processed in your browser and never uploaded anywhere.' })
        ]),
        el('div', {}, [
          el('div', { class: 'eyebrow', text: 'Independent' }),
          el('p', { text: 'Our own project, with no affiliation to any store or commercial suite.' })
        ])
      ])
    ])]);
  };

  /* ---------------- home ---------------- */
  function lobby(app) {
    var hero = el('section', { class: 'hero' });
    var cv = el('canvas');
    hero.appendChild(cv);
    hero.appendChild(el('div', { class: 'wrap' }, [el('div', { class: 'hero-in' }, [
      el('div', { class: 'eyebrow', text: 'Digital workshop · 13 tools' }),
      el('h1', { html: 'The whole <em>DTF</em> shop<br>in your browser' }),
      el('p', { text: 'Knock out backgrounds, clean up contours, build halftones, vectorize, gang up print sheets and price the job. No account, no watermarks, and not one file uploaded.' }),
      el('div', { class: 'badges' }, [
        el('span', { class: 'badge hot', text: 'Free forever' }),
        el('span', { class: 'badge', text: 'No sign-up' }),
        el('span', { class: 'badge', text: 'Works offline' }),
        el('span', { class: 'badge', text: 'Your files stay put' })
      ])
    ])]));
    app.appendChild(hero);
    halftoneHero(cv, hero);

    var wrap = el('div', { class: 'wrap' });
    var groups = {};
    NV.tools.forEach(function (t) { (groups[t.group] = groups[t.group] || []).push(t); });
    var n = 0;
    Object.keys(groups).forEach(function (g) {
      wrap.appendChild(el('div', { class: 'sheet-head' }, [
        el('h2', { text: g }),
        el('span', { class: 'eyebrow', text: groups[g].length + ' tools' })
      ]));
      var grid = el('div', { class: 'grid' });
      groups[g].forEach(function (t) {
        n++;
        grid.appendChild(el('a', { class: 'card', href: '#/' + t.slug }, [
          el('span', { class: 'num mono', text: ('0' + n).slice(-2) }),
          el('span', { class: 'ico', html: t.icon }),
          el('h3', { text: t.name }),
          el('p', { text: t.tagline })
        ]));
      });
      wrap.appendChild(grid);
    });
    app.appendChild(wrap);
    app.appendChild(NV.footer());
  }

  /* Dot screen: the motif of the trade, drawn on canvas. */
  function halftoneHero(cv, host) {
    var ctx = cv.getContext('2d'), raf = 0, t0 = performance.now();
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function size() {
      var r = host.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
      cv.width = r.width * d; cv.height = r.height * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    }
    function draw(now) {
      var r = host.getBoundingClientRect(), w = r.width, h = r.height;
      var e = Math.max(0, Math.min(1, (now - t0) / 1100));
      var ease = 1 - Math.pow(1 - e, 3);
      ctx.clearRect(0, 0, w, h);
      var cell = 15, ang = -Math.PI / 8, cs = Math.cos(ang), sn = Math.sin(ang);
      var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#FF2D7E';
      var span = Math.ceil(Math.max(w, h) / cell) + 6;
      for (var i = -span; i < span; i++) for (var j = -span; j < span; j++) {
        var x = (i * cs - j * sn) * cell + w * 0.72;
        var y = (i * sn + j * cs) * cell + h * 0.45;
        if (x < -20 || x > w + 20 || y < -20 || y > h + 20) continue;
        var dx = (x - w * 0.78) / (w * 0.42), dy = (y - h * 0.5) / (h * 0.75);
        var d = Math.sqrt(dx * dx + dy * dy);
        var cover = Math.max(0, 1 - d);
        if (cover <= 0.01) continue;
        var rad = Math.max(0, cell * 0.52 * Math.sqrt(cover) * (reduce ? 1 : ease));
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, 6.2832);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.10 + cover * 0.30;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce && e < 1) raf = requestAnimationFrame(draw);
    }
    size(); draw(performance.now());
    addEventListener('resize', function () { size(); cancelAnimationFrame(raf); t0 = performance.now() - 1200; draw(performance.now()); });
  }

  /* ---------------- routing ---------------- */
  function route() {
    var app = document.getElementById('app');
    app.innerHTML = '';
    document.querySelector('.picker').classList.remove('open');
    var slug = (location.hash || '#/').replace(/^#\/?/, '').split('?')[0];
    var t = NV.byId[slug];
    scrollTo(0, 0);
    if (!slug || !t) {
      document.title = 'Open Press — free DTF tools';
      lobby(app);
      return;
    }
    document.title = t.name + ' — Open Press';
    if (t.kind === 'custom') t.render(app);
    else NV.imageTool(t, app);
  }

  NV.start = function () {
    var saved = localStorage.getItem('nv-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    chrome();
    addEventListener('hashchange', route);
    route();
  };

  root.NV = NV;
})(window);
