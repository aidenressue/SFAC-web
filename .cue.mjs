import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell' });
for (const w of [1440, 390]) {
  for (const n of ['index','ceramic-coating','paint-correction','fleet-cleaning']) {
    const p = await b.newPage();
    await p.setViewport({ width: w, height: 844 });
    await p.goto(`http://127.0.0.1:3001/${n}.html`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 900));
    const m = await p.evaluate(() => {
      const e = document.querySelector('.scroll-cue, .cc-scrollcue'); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { cx: Math.round(r.left + r.width/2), pageCx: Math.round(innerWidth/2), cls: e.className };
    });
    if (m) console.log(`${w}px  ${n.padEnd(17)} arrow centre ${m.cx} vs page centre ${m.pageCx}  off by ${m.cx-m.pageCx}`);
    await p.close();
  }
}
await b.close();
