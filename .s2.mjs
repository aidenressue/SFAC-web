import puppeteer from 'puppeteer';
const OUT = '/private/tmp/claude-501/-Users-aidenressue-Documents-Website/56e1d545-0ff1-4c0e-911d-543c5d6c3fb7/scratchpad/';
const tag = process.argv[2] || 'a';
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:3001/index.html', { waitUntil: 'networkidle2' });
// walk the whole page so every reveal fires and heights settle
await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=600) { scrollTo(0,y); await new Promise(r=>setTimeout(r,45)); } });
await new Promise(r => setTimeout(r, 1200));
for (const [name, sel, off] of [['vs','.vs-row',-14],['story2','.story-copy',-14],['foot','.foot-inner',-14]]) {
  for (let i=0;i<2;i++) {
    const ok = await p.evaluate((s,o) => { const e=document.querySelector(s); if(!e) return false;
      scrollTo(0, e.getBoundingClientRect().top + scrollY + o); return true; }, sel, off);
    if (!ok) { console.log('missing', sel); break; }
    await new Promise(r => setTimeout(r, 450));
  }
  await p.screenshot({ path: `${OUT}${name}-${tag}.png` });
}
await b.close();
