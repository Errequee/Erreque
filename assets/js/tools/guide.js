/* Workshop guide: the order to work in, and what each tool is actually for. */
(function () {
  'use strict';
  var el = NV.el;

  var STEPS = [
    ['Start from the biggest file you have',
     'Everything downstream inherits the resolution you begin with. A 600 px logo blown up to 28 cm will look soft no matter what you do to it. Check what you have before you spend time on it.',
     'dtf-check', 'Run the file check'],
    ['Knock the background out',
     'Flat backgrounds — white, chroma, studio — come off with the wand in a click or two. Then fix the leftovers by hand with the brushes rather than fighting the tolerance slider.',
     'remove-background', 'Open the background remover'],
    ['Clean the contour',
     'A cutout leaves a rim of pixels from the old background. Shrink by 1–2 px with defringe on and the halo goes. This is the step most people skip, and it is the one that shows on the shirt.',
     'reduce-edges', 'Open the edge tool'],
    ['Kill the partial alpha',
     'White ink prints solid or not at all. Soft shadows, glows and feathered edges come out grey and dirty. Push them to solid or clear before printing, not after.',
     'semi-transparency', 'Open the alpha tool'],
    ['Size it in centimetres, not pixels',
     'Set the real print size and the DPI together. The PNG carries the resolution in its header, so the RIP places it correctly instead of guessing.',
     'resize', 'Open the resizer'],
    ['Gang it onto the roll',
     'Film is sold by the metre, so the money is made here. Pack the sheet by height, set a small gap and read the run length before you print.',
     'gang-sheets', 'Open print sheets'],
    ['Price it from your own numbers',
     'Cost per piece comes from the roll price, ink, powder, labour minutes and waste. Work it out once for your shop and quote from that, not from what someone else charges.',
     'pricing', 'Open the calculator']
  ];

  var MISTAKES = [
    ['Printing a JPG', 'JPG has no transparency, so the background prints as a rectangle. It also adds blocky artefacts around hard edges. Work in PNG from the start.'],
    ['Gradients that fade to nothing', 'A gradient fading to transparent is partial alpha, which is exactly what the printer cannot do. Use a dot fade instead — solid dots that get smaller read as a fade to the eye and print cleanly.'],
    ['Hairlines under half a millimetre', 'Thin strokes lift off the film or disappear under the press. Thicken them or print the design larger.'],
    ['Trusting the screen for colour', 'Film sits a little flatter than a backlit monitor. A small lift in vibrance and contrast usually lands closer to what you saw.'],
    ['Skipping the test press', 'Every film and every fabric behaves differently. One test on the same garment costs a few pesos; a bad run costs the whole order.']
  ];

  NV.register({
    slug: 'guide',
    name: 'Workshop guide',
    group: 'Cutout cleanup',
    tagline: 'The order to work in, what each tool fixes and the mistakes that cost film.',
    icon: NV.svg('<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5z"/><path d="M8 7.5h7M8 11h7M8 14.5h4"/>'),
    kind: 'custom',
    render: function (host) {
      var t = this;
      var wrap = el('div', { class: 'wrap doc' });
      wrap.appendChild(el('div', { class: 'eyebrow', text: 'Start here' }));
      wrap.appendChild(el('h1', { style: 'font-size:34px;text-transform:uppercase;margin:8px 0 10px', text: t.name }));
      wrap.appendChild(el('p', { text: 'Every tool here does one job. Run them in this order and the file that reaches the printer is already right. Nothing is locked, nothing expires, and no file you open ever leaves your browser.' }));

      wrap.appendChild(el('h2', { text: 'The order to work in' }));
      var steps = el('div', { style: 'display:flex;flex-direction:column;gap:2px;margin-top:6px' });
      STEPS.forEach(function (s, i) {
        var row = el('div', {
          style: 'display:grid;grid-template-columns:44px 1fr;gap:16px;padding:16px 0;border-top:1px solid var(--line-soft)'
        });
        row.appendChild(el('div', {
          class: 'mono',
          style: 'font-size:13px;color:var(--accent);padding-top:2px',
          text: ('0' + (i + 1)).slice(-2)
        }));
        var right = el('div', {});
        right.appendChild(el('h3', { style: 'margin:0 0 6px', text: s[0] }));
        right.appendChild(el('p', { style: 'margin:0 0 10px', text: s[1] }));
        right.appendChild(el('a', { class: 'btn', href: '#/' + s[2], text: s[3] + ' →' }));
        row.appendChild(right);
        steps.appendChild(row);
      });
      wrap.appendChild(steps);

      wrap.appendChild(el('h2', { text: 'What costs people film' }));
      var m = el('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-top:8px' });
      MISTAKES.forEach(function (x) {
        m.appendChild(el('div', { class: 'panelbox' }, [
          el('h3', { style: 'margin:0 0 7px;font-size:15.5px', text: x[0] }),
          el('p', { style: 'margin:0;font-size:13.5px', text: x[1] })
        ]));
      });
      wrap.appendChild(m);

      wrap.appendChild(el('h2', { text: 'The rest of the bench' }));
      wrap.appendChild(el('p', { text: 'Not every job needs every tool. These are the ones you reach for when a particular problem shows up.' }));
      var grid = el('div', { class: 'grid', style: 'padding-top:8px' });
      ['enhance', 'vectorize', 'halftones', 'rhinestones', 'frames-grunge', 'convert', 'mockups', 'sizing'].forEach(function (slug) {
        var tool = NV.byId[slug];
        if (!tool) return;
        grid.appendChild(el('a', { class: 'card', href: '#/' + slug }, [
          el('span', { class: 'ico', html: tool.icon }),
          el('h3', { text: tool.name }),
          el('p', { text: tool.tagline })
        ]));
      });
      wrap.appendChild(grid);

      host.appendChild(wrap);
      host.appendChild(NV.footer());
    }
  });
})();
