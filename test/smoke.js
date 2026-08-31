/* Prueba de humo: abre las 13 herramientas en Chromium, carga una imagen,
   mueve todos los controles y comprueba que no salte ningún error.
   Uso: npm test   (necesita playwright y un Chromium instalado) */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SP = path.join(__dirname, 'tmp');
const SITE = 'file://' + path.resolve(__dirname, '..', 'index.html');
const CHROME = process.env.CHROME_PATH || undefined;

if (!fs.existsSync(path.join(SP, 'test.png'))) {
  fs.mkdirSync(SP, { recursive: true });
  execFileSync('python3', [path.join(__dirname, 'fixtures.py')], { cwd: SP });
}

const IMAGE_TOOLS = ['eliminar-fondos','reducir-bordes','semitransparencias','mejorador','vectorizador','redimensionar','conversor','semitonos','marcos-grunge'];
const CUSTOM_TOOLS = ['plantillas','mockups','calculadora','medidas'];

(async () => {
  const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() !== 'error') return;
    if (/fonts\.g(oogleapis|static)/.test(m.text() + m.location().url)) return;   // sin red, las fuentes caen al respaldo
    errors.push('CONSOLE: ' + m.text());
  });

  const fail = (m) => { console.log('  ✗ ' + m); process.exitCode = 1; };
  const ok = (m) => console.log('  ✓ ' + m);

  await page.goto(SITE);
  await page.waitForTimeout(400);

  // --- portada ---
  const cards = await page.$$eval('.card', n => n.length);
  console.log('LOBBY');
  cards === 13 ? ok(`${cards} herramientas listadas`) : fail(`se esperaban 13 tarjetas, hay ${cards}`);
  const groups = await page.$$eval('.sheet-head h2', n => n.map(x => x.textContent));
  ok('grupos: ' + groups.join(' | '));

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
    await loadImage(slug === 'reducir-bordes' || slug === 'semitransparencias' ? 'recorte.png' : 'test.png');
    if (await page.$('.rail-foot .btn')) {
      const manual = await page.$('text=Procesar');
      if (manual) { await manual.click(); await page.waitForTimeout(2500); }
    }
    await page.waitForTimeout(500);
    const s = await resultStats();
    if (!s) { fail('no hay lienzo de resultado'); continue; }
    if (s.opaque + s.semi === 0) fail('resultado vacío (todo transparente)');
    else ok(`salida ${s.w}×${s.h} · ${Math.round((s.opaque+s.semi)/s.total*100)}% con píxeles`);

    // mover todos los deslizadores a un extremo y otro
    const ranges = await page.$$('.rail-body input[type=range]');
    for (const r of ranges.slice(0, 6)) {
      const box = await r.boundingBox();
      if (!box) continue;
      await page.mouse.click(box.x + box.width * 0.85, box.y + box.height / 2);
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(900);
    const s2 = await resultStats();
    if (!s2) fail('el lienzo desapareció al mover controles');
    else ok(`tras mover controles: ${s2.w}×${s2.h}`);

    // alternar cada segmento y casilla
    const segs = await page.$$('.rail-body .seg button');
    for (const b of segs) { await b.click().catch(()=>{}); await page.waitForTimeout(260); }
    const checks = await page.$$('.rail-body .check input');
    for (const c of checks) { await c.click().catch(()=>{}); await page.waitForTimeout(260); }
    await page.waitForTimeout(700);
    const news = errors.slice(before);
    if (news.length) news.forEach(e => fail(e));
    else ok('sin errores de consola');
  }

  for (const slug of CUSTOM_TOOLS) {
    console.log('\nTOOL ' + slug + ' (custom)');
    const before = errors.length;
    await page.goto(SITE + '#/' + slug);
    await page.waitForTimeout(500);
    if (slug === 'plantillas') {
      await page.setInputFiles('.rail-body input[type=file]', [path.join(SP,'test.png'), path.join(SP,'recorte.png')]);
      await page.waitForTimeout(800);
      const meta = await page.textContent('.meta');
      ok('hoja: ' + meta);
      const rows = await page.$$eval('.rail-body input[type=number]', n => n.length);
      ok(rows + ' campos numéricos en la lista');
      const cvs = await page.evaluate(() => {
        const c = document.querySelector('.stage canvas');
        const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let nonwhite = 0;
        for (let i=0;i<d.length;i+=4) if (d[i]<245||d[i+1]<245||d[i+2]<245) nonwhite++;
        return { w:c.width, h:c.height, nonwhite };
      });
      cvs.nonwhite > 1000 ? ok(`lienzo ${cvs.w}×${cvs.h} con arte colocado`) : fail('la hoja salió vacía');
    }
    if (slug === 'mockups') {
      await page.setInputFiles('.rail-body input[type=file]', path.join(SP,'recorte.png'));
      await page.waitForTimeout(700);
      const segs = await page.$$('.rail-body .seg button');
      for (const b of segs) { await b.click().catch(()=>{}); await page.waitForTimeout(300); }
      const cvs = await page.evaluate(() => {
        const c = document.querySelector('.stage canvas');
        const d = c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        let ink = 0;
        for (let i=0;i<d.length;i+=4) if (d[i]>150 && d[i+1]<160 && d[i+2]<90) ink++;
        return { w:c.width, h:c.height, ink };
      });
      ok(`mockup ${cvs.w}×${cvs.h}, píxeles del diseño: ${cvs.ink}`);
    }
    if (slug === 'calculadora') {
      const price = await page.textContent('.panelbox div[style*="38px"]');
      ok('precio calculado: ' + price);
      const inputs = await page.$$('.panelbox input[type=number]');
      await inputs[3].fill('999');
      await page.waitForTimeout(300);
      const price2 = await page.textContent('.panelbox div[style*="38px"]');
      price2 !== price ? ok('recalcula al cambiar un insumo: ' + price2) : fail('no recalculó');
    }
    if (slug === 'medidas') {
      const rows = await page.$$eval('tbody tr', n => n.length);
      rows > 25 ? ok(rows + ' filas de referencia') : fail('faltan tablas: ' + rows);
      const svg = await page.$('svg[viewBox="0 0 420 470"]');
      svg ? ok('diagrama de colocación presente') : fail('falta el diagrama');
    }
    const news = errors.slice(before);
    if (news.length) news.forEach(e => fail(e)); else ok('sin errores de consola');
  }

  console.log('\nTOTAL ERRORES: ' + errors.length);
  await browser.close();
})();
