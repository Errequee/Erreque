/* Image-processing primitives. Everything runs in the browser. */
(function (root) {
  'use strict';
  var IM = {};
  var INF = 1e20;

  IM.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };

  IM.copy = function (id) {
    return new ImageData(new Uint8ClampedArray(id.data), id.width, id.height);
  };

  IM.blank = function (w, h) { return new ImageData(w, h); };

  IM.canvasOf = function (id) {
    var c = document.createElement('canvas');
    c.width = id.width; c.height = id.height;
    c.getContext('2d').putImageData(id, 0, 0);
    return c;
  };

  IM.dataOf = function (src, w, h) {
    w = w || src.naturalWidth || src.width;
    h = h || src.naturalHeight || src.height;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(src, 0, 0, w, h);
    return x.getImageData(0, 0, w, h);
  };

  /* Progressive rescaling: when shrinking, halving at a time preserves detail. */
  IM.resize = function (src, w, h, smooth) {
    w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
    var cur = src.width ? src : IM.canvasOf(src);
    if (src instanceof ImageData) cur = IM.canvasOf(src);
    if (smooth === false) {
      var o = document.createElement('canvas'); o.width = w; o.height = h;
      var oc = o.getContext('2d'); oc.imageSmoothingEnabled = false;
      oc.drawImage(cur, 0, 0, w, h);
      return o;
    }
    while (cur.width > w * 2 && cur.height > h * 2) {
      var half = document.createElement('canvas');
      half.width = Math.max(w, cur.width >> 1);
      half.height = Math.max(h, cur.height >> 1);
      var hc = half.getContext('2d');
      hc.imageSmoothingEnabled = true; hc.imageSmoothingQuality = 'high';
      hc.drawImage(cur, 0, 0, half.width, half.height);
      cur = half;
    }
    var out = document.createElement('canvas'); out.width = w; out.height = h;
    var ctx = out.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cur, 0, 0, w, h);
    return out;
  };

  /* --- Exact distance transform (Felzenszwalb & Huttenlocher) --- */
  function dt1d(f, d, v, z, idx, srcIdx, n) {
    var k = 0, q, s;
    v[0] = 0; z[0] = -INF; z[1] = INF;
    for (q = 1; q < n; q++) {
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
      if (idx) idx[q] = srcIdx ? srcIdx[v[k]] : v[k];
    }
  }

  /* seeds: Uint8Array (1 = seed). Returns squared distance and, optionally, the index of the nearest seed pixel. */
  IM.edt = function (seeds, w, h, wantIndex) {
    var n = w * h, i, x, y;
    var f = new Float64Array(Math.max(w, h));
    var d = new Float64Array(Math.max(w, h));
    var v = new Int32Array(Math.max(w, h) + 1);
    var z = new Float64Array(Math.max(w, h) + 1);
    var dist = new Float64Array(n);
    var near = wantIndex ? new Int32Array(n) : null;
    var col = wantIndex ? new Int32Array(Math.max(w, h)) : null;
    var rowSrc = wantIndex ? new Int32Array(Math.max(w, h)) : null;

    for (x = 0; x < w; x++) {
      for (y = 0; y < h; y++) f[y] = seeds[y * w + x] ? 0 : INF;
      dt1d(f, d, v, z, col, null, h);
      for (y = 0; y < h; y++) {
        dist[y * w + x] = d[y];
        if (near) near[y * w + x] = col[y] * w + x;
      }
    }
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        f[x] = dist[y * w + x];
        if (near) rowSrc[x] = near[y * w + x];
      }
      dt1d(f, d, v, z, col, rowSrc, w);
      for (x = 0; x < w; x++) {
        dist[y * w + x] = d[x];
        if (near) near[y * w + x] = col[x];
      }
    }
    return { dist: dist, near: near };
  };

  /* Signed distance field from the alpha edge. Positive = inside. */
  IM.alphaSDF = function (id, thr) {
    var w = id.width, h = id.height, n = w * h, p = id.data, i;
    var inside = new Uint8Array(n), outside = new Uint8Array(n);
    thr = thr == null ? 128 : thr;
    for (i = 0; i < n; i++) {
      if (p[i * 4 + 3] >= thr) inside[i] = 1; else outside[i] = 1;
    }
    var din = IM.edt(outside, w, h).dist;   // inside  -> distance to the outside
    var dout = IM.edt(inside, w, h).dist;   // outside -> distance to the inside
    var sdf = new Float32Array(n);
    for (i = 0; i < n; i++) {
      sdf[i] = inside[i] ? Math.sqrt(din[i]) - 0.5 : -(Math.sqrt(dout[i]) - 0.5);
    }
    return sdf;
  };

  /* Contracts (radius > 0) or expands (radius < 0) the alpha with a soft edge. */
  IM.reshapeAlpha = function (id, radius, feather, thr) {
    var w = id.width, h = id.height, n = w * h, p = id.data;
    var sdf = IM.alphaSDF(id, thr);
    var f = Math.max(0.02, feather);
    var out = IM.copy(id), q = out.data, i, a;
    for (i = 0; i < n; i++) {
      a = IM.clamp(0.5 + (sdf[i] - radius) / f, 0, 1) * 255;
      q[i * 4 + 3] = radius >= 0 ? Math.min(p[i * 4 + 3], a) : Math.max(p[i * 4 + 3], a);
    }
    return out;
  };

  /* Pushes the colour of opaque pixels outward: kills halos and makes expanding possible. */
  IM.bleed = function (id, thr) {
    var w = id.width, h = id.height, n = w * h, p = id.data, i;
    thr = thr == null ? 250 : thr;
    var solid = new Uint8Array(n), any = 0;
    for (i = 0; i < n; i++) if (p[i * 4 + 3] >= thr) { solid[i] = 1; any = 1; }
    if (!any) return IM.copy(id);
    var near = IM.edt(solid, w, h, true).near;
    var out = IM.copy(id), q = out.data, s;
    for (i = 0; i < n; i++) {
      if (solid[i]) continue;
      s = near[i] * 4;
      q[i * 4] = p[s]; q[i * 4 + 1] = p[s + 1]; q[i * 4 + 2] = p[s + 2];
    }
    return out;
  };

  /* Defringe: replaces edge-pixel colour with that of the nearest solid pixel. */
  IM.defringe = function (id, amount, thr) {
    if (amount <= 0) return IM.copy(id);
    var bled = IM.bleed(id, thr);
    var p = id.data, b = bled.data, n = id.width * id.height, i, a, k, t;
    var out = IM.copy(id), q = out.data;
    for (i = 0; i < n; i++) {
      a = p[i * 4 + 3];
      if (a === 0 || a >= thr) continue;
      t = (1 - a / thr) * amount;               // the more translucent, the stronger the fix
      for (k = 0; k < 3; k++) q[i * 4 + k] = p[i * 4 + k] * (1 - t) + b[i * 4 + k] * t;
    }
    return out;
  };

  /* Approximate gaussian blur (3 box passes) over a Float32 channel.
     Buffers come from outside: on big images allocating here costs more than the filter. */
  IM.blurChannel = function (src, w, h, r, scratch) {
    if (r < 0.4) return src;
    var sc = scratch || {};
    if (!sc.a || sc.a.length !== src.length) sc.a = new Float32Array(src.length);
    if (!sc.b || sc.b.length !== src.length) sc.b = new Float32Array(src.length);
    var boxes = boxSizes(r, 3), a = src, b = sc.a, i, t;
    for (i = 0; i < 3; i++) { boxBlur(a, b, w, h, (boxes[i] - 1) / 2, sc.b); t = a; a = b; b = t; }
    return a;
  };
  function boxSizes(sigma, n) {
    var wIdeal = Math.sqrt((12 * sigma * sigma / n) + 1);
    var wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
    var wu = wl + 2;
    var mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    var m = Math.round(mIdeal), sizes = [], i;
    for (i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
    return sizes;
  }
  function boxBlur(src, dst, w, h, r, mid) {
    var i, j, x, y, sum;
    if (!mid || mid.length !== src.length) mid = new Float32Array(src.length);
    r = Math.max(0, Math.round(r));
    var iarr = 1 / (r + r + 1);
    for (y = 0; y < h; y++) {
      var ti = y * w, li = ti, ri = ti + r;
      var fv = src[ti], lv = src[ti + w - 1];
      sum = (r + 1) * fv;
      for (j = 0; j < r; j++) sum += src[ti + j];
      for (j = 0; j <= r; j++) { sum += src[ri++] - fv; mid[ti++] = sum * iarr; }
      for (j = r + 1; j < w - r; j++) { sum += src[ri++] - src[li++]; mid[ti++] = sum * iarr; }
      for (j = w - r; j < w; j++) { sum += lv - src[li++]; mid[ti++] = sum * iarr; }
    }
    for (x = 0; x < w; x++) {
      var ti2 = x, li2 = ti2, ri2 = ti2 + r * w;
      var fv2 = mid[x], lv2 = mid[x + w * (h - 1)];
      sum = (r + 1) * fv2;
      for (j = 0; j < r; j++) sum += mid[ti2 + j * w];
      for (j = 0; j <= r; j++) { sum += mid[ri2] - fv2; dst[ti2] = sum * iarr; ri2 += w; ti2 += w; }
      for (j = r + 1; j < h - r; j++) { sum += mid[ri2] - mid[li2]; dst[ti2] = sum * iarr; li2 += w; ri2 += w; ti2 += w; }
      for (j = h - r; j < h; j++) { sum += lv2 - mid[li2]; dst[ti2] = sum * iarr; li2 += w; ti2 += w; }
    }
    return dst;
  }

  /* Unsharp mask over luminance, respecting alpha. */
  IM.unsharp = function (id, amount, radius, threshold) {
    if (amount <= 0) return IM.copy(id);
    var w = id.width, h = id.height, n = w * h, p = id.data, i, k;
    var out = IM.copy(id), q = out.data;
    var chan = new Float32Array(n), sc = {};
    for (k = 0; k < 3; k++) {                     // one channel at a time: less memory on big images
      for (i = 0; i < n; i++) chan[i] = p[i * 4 + k];
      var bl = IM.blurChannel(chan, w, h, radius, sc);
      for (i = 0; i < n; i++) {
        var d = p[i * 4 + k] - bl[i];
        if (d > -threshold && d < threshold) continue;
        q[i * 4 + k] = IM.clamp(p[i * 4 + k] + d * amount, 0, 255);
      }
    }
    return out;
  };

  IM.median3 = function (id) {
    var w = id.width, h = id.height, p = id.data;
    var out = IM.copy(id), q = out.data, x, y, k, i, j, buf = new Array(9);
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      for (k = 0; k < 3; k++) {
        var c = 0;
        for (j = -1; j <= 1; j++) for (i = -1; i <= 1; i++) {
          var xx = IM.clamp(x + i, 0, w - 1), yy = IM.clamp(y + j, 0, h - 1);
          buf[c++] = p[(yy * w + xx) * 4 + k];
        }
        buf.sort(function (a, b) { return a - b; });
        q[(y * w + x) * 4 + k] = buf[4];
      }
    }
    return out;
  };

  IM.adjust = function (id, o) {
    var p = id.data, n = id.width * id.height, i, k, v;
    var out = IM.copy(id), q = out.data;
    var c = (o.contrast || 0) / 100, b = (o.brightness || 0) * 2.55, s = 1 + (o.saturation || 0) / 100;
    var cf = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
    for (i = 0; i < n; i++) {
      var r = p[i * 4], g = p[i * 4 + 1], bl = p[i * 4 + 2];
      var lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;
      r = lum + (r - lum) * s; g = lum + (g - lum) * s; bl = lum + (bl - lum) * s;
      var arr = [r, g, bl];
      for (k = 0; k < 3; k++) {
        v = cf * (arr[k] - 128) + 128 + b;
        q[i * 4 + k] = IM.clamp(v, 0, 255);
      }
    }
    return out;
  };

  /* Alpha curve: below lo -> 0, above hi -> 255. */
  IM.alphaLevels = function (id, lo, hi, hard) {
    var p = id.data, n = id.width * id.height, i, a;
    var out = IM.copy(id), q = out.data;
    var span = Math.max(1, hi - lo);
    for (i = 0; i < n; i++) {
      a = p[i * 4 + 3];
      if (a <= lo) a = 0;
      else if (a >= hi) a = 255;
      else a = hard ? (a > (lo + hi) / 2 ? 255 : 0) : ((a - lo) / span) * 255;
      q[i * 4 + 3] = a;
    }
    return out;
  };

  IM.colorDistance = function (r1, g1, b1, r2, g2, b2) {
    var rm = (r1 + r2) / 2;
    var dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
    return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db) / 3;
  };

  /* Fill by colour proximity from seed points. Returns the background mask. */
  IM.floodMask = function (id, seeds, tol, contiguous) {
    var w = id.width, h = id.height, n = w * h, p = id.data;
    var mask = new Uint8Array(n), i, s;
    if (!contiguous) {
      for (i = 0; i < n; i++) {
        for (s = 0; s < seeds.length; s++) {
          var si = seeds[s] * 4;
          if (IM.colorDistance(p[i * 4], p[i * 4 + 1], p[i * 4 + 2], p[si], p[si + 1], p[si + 2]) <= tol) { mask[i] = 1; break; }
        }
      }
      return mask;
    }
    var stack = [], seen = new Uint8Array(n);
    for (s = 0; s < seeds.length; s++) { stack.push(seeds[s]); seen[seeds[s]] = 1; }
    var refs = seeds.map(function (k) { return [p[k * 4], p[k * 4 + 1], p[k * 4 + 2]]; });
    while (stack.length) {
      var cur = stack.pop(), ci = cur * 4, ok = false;
      for (s = 0; s < refs.length; s++) {
        if (IM.colorDistance(p[ci], p[ci + 1], p[ci + 2], refs[s][0], refs[s][1], refs[s][2]) <= tol) { ok = true; break; }
      }
      if (!ok) continue;
      mask[cur] = 1;
      var x = cur % w, y = (cur / w) | 0;
      if (x > 0 && !seen[cur - 1]) { seen[cur - 1] = 1; stack.push(cur - 1); }
      if (x < w - 1 && !seen[cur + 1]) { seen[cur + 1] = 1; stack.push(cur + 1); }
      if (y > 0 && !seen[cur - w]) { seen[cur - w] = 1; stack.push(cur - w); }
      if (y < h - 1 && !seen[cur + w]) { seen[cur + w] = 1; stack.push(cur + w); }
    }
    return mask;
  };

  /* k-means quantization over opaque pixels. */
  IM.quantize = function (id, k, iters) {
    var p = id.data, n = id.width * id.height, i, j, c;
    iters = iters || 12;
    var idx = [], step = Math.max(1, Math.floor(n / 24000));
    for (i = 0; i < n; i += step) if (p[i * 4 + 3] > 128) idx.push(i);
    if (!idx.length) return { palette: [[0, 0, 0]], map: new Int32Array(n) };
    k = Math.min(k, idx.length);
    var cen = [], used = {};
    cen.push([p[idx[0] * 4], p[idx[0] * 4 + 1], p[idx[0] * 4 + 2]]);
    while (cen.length < k) {                       // k-means++ style seeding
      var best = -1, bestD = -1;
      for (j = 0; j < idx.length; j += Math.max(1, (idx.length / 900) | 0)) {
        var q = idx[j] * 4, dmin = 1e9;
        for (c = 0; c < cen.length; c++) {
          var d = IM.colorDistance(p[q], p[q + 1], p[q + 2], cen[c][0], cen[c][1], cen[c][2]);
          if (d < dmin) dmin = d;
        }
        if (dmin > bestD && !used[idx[j]]) { bestD = dmin; best = idx[j]; }
      }
      if (best < 0) break;
      used[best] = 1;
      cen.push([p[best * 4], p[best * 4 + 1], p[best * 4 + 2]]);
    }
    var sums = [];
    for (var it = 0; it < iters; it++) {
      sums = cen.map(function () { return [0, 0, 0, 0]; });
      for (j = 0; j < idx.length; j++) {
        var o = idx[j] * 4, bi = 0, bd = 1e9;
        for (c = 0; c < cen.length; c++) {
          var dd = IM.colorDistance(p[o], p[o + 1], p[o + 2], cen[c][0], cen[c][1], cen[c][2]);
          if (dd < bd) { bd = dd; bi = c; }
        }
        sums[bi][0] += p[o]; sums[bi][1] += p[o + 1]; sums[bi][2] += p[o + 2]; sums[bi][3]++;
      }
      for (c = 0; c < cen.length; c++) if (sums[c][3]) {
        cen[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
      }
    }
    cen = cen.map(function (v) { return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])]; });
    var map = new Int32Array(n);
    for (i = 0; i < n; i++) {
      if (p[i * 4 + 3] <= 128) { map[i] = -1; continue; }
      var o2 = i * 4, b2 = 0, d2 = 1e9;
      for (c = 0; c < cen.length; c++) {
        var e = IM.colorDistance(p[o2], p[o2 + 1], p[o2 + 2], cen[c][0], cen[c][1], cen[c][2]);
        if (e < d2) { d2 = e; b2 = c; }
      }
      map[i] = b2;
    }
    return { palette: cen, map: map };
  };

  /* Exact contour of a mask: closed loops along the pixel edges. */
  IM.traceMask = function (mask, w, h) {
    var gw = w + 1, edges = new Map(), i, x, y;
    function vid(x, y) { return y * gw + x; }
    function add(x1, y1, x2, y2) {
      var a = vid(x1, y1), b = vid(x2, y2);
      if (!edges.has(a)) edges.set(a, []);
      edges.get(a).push(b);
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      if (y === 0 || !mask[(y - 1) * w + x]) add(x, y, x + 1, y);
      if (x === w - 1 || !mask[y * w + x + 1]) add(x + 1, y, x + 1, y + 1);
      if (y === h - 1 || !mask[(y + 1) * w + x]) add(x + 1, y + 1, x, y + 1);
      if (x === 0 || !mask[y * w + x - 1]) add(x, y + 1, x, y);
    }
    var loops = [];
    edges.forEach(function (list, start) {
      while (list.length) {
        var loop = [], cur = start, prev = -1, guard = 0;
        while (guard++ < 4e6) {
          var outs = edges.get(cur);
          if (!outs || !outs.length) break;
          var pick = 0;
          if (outs.length > 1 && prev >= 0) {                 // untangles diagonal knots
            var pdx = (cur % gw) - (prev % gw), pdy = ((cur / gw) | 0) - ((prev / gw) | 0);
            var bestScore = -9;
            for (var t = 0; t < outs.length; t++) {
              var ndx = (outs[t] % gw) - (cur % gw), ndy = ((outs[t] / gw) | 0) - ((cur / gw) | 0);
              var cross = pdx * ndy - pdy * ndx, dot = pdx * ndx + pdy * ndy;
              var score = cross > 0 ? 2 : (dot > 0 ? 1 : 0);
              if (score > bestScore) { bestScore = score; pick = t; }
            }
          }
          var nxt = outs.splice(pick, 1)[0];
          loop.push([cur % gw, (cur / gw) | 0]);
          prev = cur; cur = nxt;
          if (cur === start) break;
        }
        if (loop.length > 3) loops.push(loop);
      }
    });
    return loops;
  };

  IM.dropCollinear = function (pts) {
    var out = [], n = pts.length, i;
    for (i = 0; i < n; i++) {
      var a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
      if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) out.push(b);
    }
    return out.length > 2 ? out : pts;
  };

  IM.rdp = function (pts, eps) {
    if (eps <= 0 || pts.length < 4) return pts;
    function seg(p, a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      var t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0;
      t = IM.clamp(t, 0, 1);
      var ux = a[0] + t * dx - p[0], uy = a[1] + t * dy - p[1];
      return Math.sqrt(ux * ux + uy * uy);
    }
    function walk(list) {
      if (list.length < 3) return list;
      var maxD = -1, idx = 0;
      for (var i = 1; i < list.length - 1; i++) {
        var d = seg(list[i], list[0], list[list.length - 1]);
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD <= eps) return [list[0], list[list.length - 1]];
      return walk(list.slice(0, idx + 1)).slice(0, -1).concat(walk(list.slice(idx)));
    }
    var closed = pts.concat([pts[0]]);
    var r = walk(closed);
    r.pop();
    return r.length > 2 ? r : pts;
  };

  /* Closed polygon -> SVG path, straight or smoothed with Catmull-Rom. */
  IM.pathData = function (pts, smooth, dec) {
    var n = pts.length, i, d, f = function (v) { return +v.toFixed(dec == null ? 2 : dec); };
    if (n < 3) return '';
    if (!smooth) {
      d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
      for (i = 1; i < n; i++) d += 'L' + f(pts[i][0]) + ' ' + f(pts[i][1]);
      return d + 'Z';
    }
    var k = smooth / 6;
    d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (i = 0; i < n; i++) {
      var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) * k) + ' ' + f(p1[1] + (p2[1] - p0[1]) * k) + ',' +
        f(p2[0] - (p3[0] - p1[0]) * k) + ' ' + f(p2[1] - (p3[1] - p1[1]) * k) + ',' +
        f(p2[0]) + ' ' + f(p2[1]);
    }
    return d + 'Z';
  };

  IM.hex = function (rgb) {
    return '#' + rgb.map(function (v) { return ('0' + IM.clamp(Math.round(v), 0, 255).toString(16)).slice(-2); }).join('');
  };
  IM.rgb = function (hex) {
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
  };

  /* Value noise + fbm, for grunge textures. */
  IM.noise = function (w, h, scale, octaves, seed) {
    var out = new Float32Array(w * h), x, y, o;
    var rnd = mulberry(seed || 1);
    var perm = new Float32Array(4096);
    for (x = 0; x < 4096; x++) perm[x] = rnd();
    function val(ix, iy) { return perm[((ix * 73856093) ^ (iy * 19349663)) & 4095]; }
    function smooth(fx, fy) {
      var ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
      var a = val(ix, iy), b = val(ix + 1, iy), c = val(ix, iy + 1), d = val(ix + 1, iy + 1);
      return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
    }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var amp = 1, freq = 1 / Math.max(1, scale), sum = 0, norm = 0;
      for (o = 0; o < octaves; o++) {
        sum += smooth(x * freq, y * freq) * amp;
        norm += amp; amp *= 0.5; freq *= 2;
      }
      out[y * w + x] = sum / norm;
    }
    return out;
  };
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  root.IM = IM;
})(window);
