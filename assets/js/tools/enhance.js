/* Enhance: upscales and restores bite with local filters. */
(function () {
  'use strict';
  NV.register({
    slug: 'enhance',
    name: 'Enhance and upscale',
    group: 'Artwork prep',
    tagline: 'Upscale up to 4×, bring back the bite and drop the noise on small images.',
    icon: NV.svg('<path d="M4 9V4h5M20 15v5h-5M4 15v5h5M20 9V4h-5"/><circle cx="12" cy="12" r="2.5"/>'),
    intro: 'This works with local filters: progressive resampling, an unsharp mask and a median. It will not invent detail that was never there, but it does rescue a pixelated image for print.',
    debounce: 220,
    controls: [
      { k: 'seg', id: 'scale', label: 'Upscale', def: 2, opts: [[1, '1×'], [2, '2×'], [3, '3×'], [4, '4×']] },
      { k: 'range', id: 'sharpen', label: 'Sharpness', min: 0, max: 200, step: 5, def: 70, unit: ' %' },
      { k: 'range', id: 'radius', label: 'Sharpen radius', min: 0.4, max: 4, step: 0.1, def: 1.1, unit: ' px', dec: 1 },
      { k: 'range', id: 'threshold', label: 'Protect flat areas', min: 0, max: 30, step: 1, def: 4, unit: '' },
      { k: 'group', label: 'Cleanup' },
      { k: 'check', id: 'denoise', label: 'Reduce noise and JPG artefacts', def: false },
      { k: 'group', label: 'Colour' },
      { k: 'range', id: 'contrast', label: 'Contrast', min: -50, max: 80, step: 1, def: 8, unit: '' },
      { k: 'range', id: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, def: 10, unit: '' },
      { k: 'range', id: 'brightness', label: 'Brightness', min: -40, max: 40, step: 1, def: 0, unit: '' },
      { k: 'note', text: 'Tip: for DTF, upscale first and sharpen last, with a low radius. The preview is quick; a full-resolution download can take a few seconds on big images.' }
    ],
    process: function (c) {
      var s = +c.p.scale, src = c.src;
      if (!c.preview && src.width * s * src.height * s > 80e6) {
        throw new Error('the output would be ' + Math.round(src.width * s * src.height * s / 1e6) +
          ' MP and will not fit in memory. Lower the upscale or crop the image first.');
      }
      var out = s > 1
        ? IM.dataOf(IM.resize(src, src.width * s, src.height * s), Math.round(src.width * s), Math.round(src.height * s))
        : IM.copy(src);
      if (c.p.denoise) out = IM.median3(out);
      if (c.p.sharpen > 0) out = IM.unsharp(out, c.p.sharpen / 100, c.p.radius * (s > 1 ? s * 0.6 : 1), c.p.threshold);
      if (c.p.contrast || c.p.saturation || c.p.brightness) {
        out = IM.adjust(out, { contrast: c.p.contrast, saturation: c.p.saturation, brightness: c.p.brightness });
      }
      return out;
    }
  });
})();
