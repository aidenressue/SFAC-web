import puppeteer from 'puppeteer';
const OUT = '/private/tmp/claude-501/-Users-aidenressue-Documents-Website/56e1d545-0ff1-4c0e-911d-543c5d6c3fb7/scratchpad/';
const tag = process.argv[2] || 'a';
const b = await puppeteer.launch({ headless: 'shell' });
for (const name of ['ceramic-coating','paint-correction','fleet-cleaning','maintenance']) {
  const p = await b.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await p.goto(`http://127.0.0.1:3001/${name}.html`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 900));
  await p.screenshot({ path: `${OUT}h-${name}-${tag}.png` });
  const m = await p.evaluate(() => {
    const out = {};
    const first = document.body.firstElementChild;
    for (const sel of ['header','.cc-hero','.pc-hero','.fleet-hero','.mp-hero','h1','video','.cc-hero-cta','.pc-hero-cta','.hero-ctas','.hero-cta','.scroll-cue','.hero-scroll','.scrolldown']) {
      const e = document.querySelector(sel); if (!e) continue;
      const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      out[sel] = { t:Math.round(r.top), l:Math.round(r.left), w:Math.round(r.width), h:Math.round(r.height), fs:c.fontSize, pos:c.position };
    }
    return out;
  });
  console.log('===', name, JSON.stringify(m, null, 1));
  await p.close();
}
await b.close();
