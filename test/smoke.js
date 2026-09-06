/* Smoke test: opens all 16 tools in Chromium, loads an image, moves every
   control and fails if anything errors.
   Usage: npm test   (needs playwright and an installed Chromium) */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SP = path.join(__dirname, 'tmp');
// Defaults to the source tree; point SITE at a built page to test a bundle.
const SITE = process.env.SITE || 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHROME = process.env.CHROME_PATH || undefined;

if (!fs.existsSync(path.join(SP, 'test.png'))) {
  fs.mkdirSync(SP, { recursive: true });
  execFileSync('python3', [path.join(__dirname, 'fixtures.py')], { cwd: SP });
}

const IMAGE_TOOLS = ['dtf-check','remove-background','reduce-edges','semi-transparency','enhance','vectorize','resize','convert','halftones','rhinestones','frames-grunge'];
const CUSTOM_TOOLS = ['guide','gang-sheets','mockups','pricing','sizing'];

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/fonts\.g(oogleapis|static)/.test(m.text() + m.location().url)) return;   // offline, fonts fall back
    errors.push('CONSOLE: ' + m.text());
  });

  const fail = (m) => { console.log('  ✗ ' + m); process.exitCode = 1; };
  const ok = (m) => console.log('  ✓ ' + m);

  await page.goto(SITE);
  await page.waitForTimeout(400);

  // --- home ---
  const cards = await page.$$eval('.card', n => n.length);
  console.log('HOME');
  cards === 16 ? ok(`${cards} tools listed`) : fail(`expected 16 cards, found ${cards}`);
  const groups = await page.$$eval('.sheet-head h2', n => n.map(x => x.textContent));
  ok('groups: ' + groups.join(' | '));

  // Click a control if it is actually on screen. Hidden ones are not failures -
  // a `show:` rule takes them out - but waiting out the 30 s action timeout on
  // each of them costs more than the whole rest of the run.
  async function tap(el, settle) {
    if (!await el.isVisible()) return;
    await el.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(settle || 260);
  }

  // The phone build folds the rail into tap-open sections; open them all so the
  // controls behind them are clickable. A no-op on the desktop build.
  async function unfold() {
    await page.evaluate(() => document.querySelectorAll('.group-toggle:not(.open)')
      .forEach(h => h.click()));
    await page.waitForTimeout(150);
  }

  async function loadImage(file) {
    await page.setInputFiles('.stage input[type=file]', path.join(SP, file));
    await page.waitForTimeout(700);
  }
  async function resultStats() {
    return page.evaluate(() => {
      const c = document.querySelector('.plate canvas.top');
      if (!c) return null;
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let opaque = 0, semi = 0, colored = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] > 250) opaque++;
        else if (d[i+3] > 4) semi++;
        if (d[i+3] > 8 && (d[i] + d[i+1] + d[i+2]) > 20) colored++;
      }
      return { w: c.width, h: c.height, opaque, semi, colored, total: d.length / 4 };
    });
  }

  for (const slug of IMAGE_TOOLS) {
    console.log('\nTOOL ' + slug);
    const before = errors.length;
    await page.goto(SITE + '#/' + slug);
    await page.waitForTimeout(300);
    await loadImage(slug === 'reduce-edges' || slug === 'semi-transparency' ? 'cutout.png' : 'test.png');
    await unfold();
    const manual = await page.$('.rail-foot button:text-is("Run")');
    if (manual) { await manual.click(); await page.waitForTimeout(2500); }
    await page.waitForTimeout(500);
    const s = await resultStats();
    if (!s) { fail('no result canvas'); continue; }
    if (s.opaque + s.semi === 0) fail('empty result (fully transparent)');
    else ok(`output ${s.w}×${s.h} · ${Math.round((s.opaque+s.semi)/s.total*100)}% has pixels`);

    // Push every slider towards one end. The click has to land at 85 % of the
    // track to move the value, so it goes through raw mouse coordinates - which
    // means scrolling the slider to the middle of the viewport first. Left where
    // it was, a slider below the fold put the click on the sticky foot, and
    // "change image" cleared the stage out from under the next assertion.
    const ranges = await page.$$('.rail-body input[type=range]');
    for (const r of ranges.slice(0, 6)) {
      if (!await r.isVisible()) continue;
      await r.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(80);
      const box = await r.boundingBox();
      if (!box || box.y < 0 || box.y > page.viewportSize().height) continue;
      await page.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(900);
    const s2 = await resultStats();
    if (!s2) fail('the canvas vanished when controls moved');
    else ok(`after moving controls: ${s2.w}×${s2.h}`);

    // toggle every segment and checkbox that a `show:` rule has not hidden
    for (const b of await page.$$('.rail-body .seg button')) await tap(b);
    for (const c of await page.$$('.rail-body .check input')) await tap(c);
    await page.waitForTimeout(700);
    const news = errors.slice(before);
    if (news.length) news.forEach(e => fail(e));
    else ok('no console errors');
  }

  for (const slug of CUSTOM_TOOLS) {
    console.log('\nTOOL ' + slug + ' (custom)');
    const before = errors.length;
    await page.goto(SITE + '#/' + slug);
    await page.waitForTimeout(500);
    await unfold();
    if (slug === 'gang-sheets') {
      await page.setInputFiles('.rail-body input[type=file]', [path.join(SP,'test.png'), path.join(SP,'cutout.png')]);
      await page.waitForTimeout(800);
      const meta = await page.textContent('.meta');
      ok('sheet: ' + meta);
      const rows = await page.$$eval('.rail-body input[type=number]', n => n.length);
      ok(rows + ' number fields in the list');
      const cvs = await page.evaluate(() => {
        const c = document.querySelector('.stage canvas');
        const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let nonwhite = 0;
        for (let i=0;i<d.length;i+=4) if (d[i]<245||d[i+1]<245||d[i+2]<245) nonwhite++;
        return { w:c.width, h:c.height, nonwhite };
      });
      cvs.nonwhite > 1000 ? ok(`canvas ${cvs.w}×${cvs.h} with artwork placed`) : fail('the sheet came out empty');
    }
    if (slug === 'mockups') {
      await page.setInputFiles('.rail-body input[type=file]', path.join(SP,'cutout.png'));
      await page.waitForTimeout(700);
      const segs = await page.$$('.rail-body .seg button');
      for (const b of segs) await tap(b, 300);
      // The last surface is "My photo", which has no photo here - go back to the
      // T-shirt before counting, or the artwork has nothing to sit on.
      if (segs[0]) { await segs[0].click(); await page.waitForTimeout(500); }
      const cvs = await page.evaluate(() => {
        const c = document.querySelector('.stage canvas');
        const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let ink = 0;   // the fixture's disc is amber: warm, mid green, almost no blue
        for (let i=0;i<d.length;i+=4) if (d[i]>190 && d[i+1]>120 && d[i+1]<210 && d[i+2]<110) ink++;
        return { w:c.width, h:c.height, ink };
      });
      cvs.ink > 500
        ? ok(`mockup ${cvs.w}×${cvs.h} with the artwork on the garment (${cvs.ink} px)`)
        : fail(`the artwork never landed on the garment (${cvs.ink} px)`);
    }
    if (slug === 'pricing') {
      const price = await page.textContent('.panelbox div[style*="38px"]');
      ok('price computed: ' + price);
      const inputs = await page.$$('.panelbox input[type=number]');
      await inputs[3].fill('999');
      await page.waitForTimeout(300);
      const price2 = await page.textContent('.panelbox div[style*="38px"]');
      price2 !== price ? ok('recalculates when an input changes: ' + price2) : fail('did not recalculate');
    }
    if (slug === 'guide') {
      const steps = await page.$$eval('.doc a.btn', n => n.length);
      steps >= 7 ? ok(steps + ' step links') : fail('guide steps missing: ' + steps);
    }
    if (slug === 'sizing') {
      const rows = await page.$$eval('tbody tr', n => n.length);
      rows > 25 ? ok(rows + ' reference rows') : fail('tables missing: ' + rows);
      const svg = await page.$('svg[viewBox="0 0 420 470"]');
      svg ? ok('placement diagram present') : fail('the diagram is missing');
    }
    const news = errors.slice(before);
    if (news.length) news.forEach(e => fail(e)); else ok('no console errors');
  }

  console.log('\nTOTAL ERRORS: ' + errors.length);
  await browser.close();
})();
