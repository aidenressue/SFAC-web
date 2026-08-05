import puppeteer from 'puppeteer';
const OUT = '/private/tmp/claude-501/-Users-aidenressue-Documents-Website/56e1d545-0ff1-4c0e-911d-543c5d6c3fb7/scratchpad/';
const tag = process.argv[2] || 'a';
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await p.goto('http://127.0.0.1:3001/index.html', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 900));

async function shot(name, sel, align = 'start') {
  if (sel) { await p.evaluate((s,a) => { const e=document.querySelector(s); if(e) e.scrollIntoView({block:a}); }, sel, align);
    await new Promise(r => setTimeout(r, 600)); }
  await p.screenshot({ path: `${OUT}${name}-${tag}.png` });
}
await shot('hero', null);
await shot('svc', '.services-grid', 'center');
await shot('story', '#story');
await shot('pkg', '#packages');
await shot('cmp', '#compare');
await shot('foot', 'footer, .site-foot, .foot-inner', 'start');

console.log(JSON.stringify(await p.evaluate(() => {
  const R = e => { if(!e) return null; const r = e.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height) }; };
  const rows = [...document.querySelectorAll('.vs-row')].map(r => {
    const t = r.querySelector('.vs-topic'), cells = [...r.querySelectorAll('.vs-cell')];
    const tr = t.getBoundingClientRect();
    const cTop = Math.min(...cells.map(c=>c.getBoundingClientRect().top));
    const cBot = Math.max(...cells.map(c=>c.getBoundingClientRect().bottom));
    return { topic: t.textContent, boxH: Math.round(tr.height), cellsSpan: Math.round(cBot-cTop),
      sameHeight: Math.abs(tr.height-(cBot-cTop)) < 2 };
  });
  const docW = document.documentElement.scrollWidth;
  return { storyMedia: R(document.querySelector('.story-media')),
    pkgCards: [...document.querySelectorAll('.pkg-panel.active .pkg-card')].map(c=>({n:c.querySelector('.pkg-name')?.textContent, ...R(c)})),
    vsRows: rows, horizontalOverflow: docW > 390 ? docW : false, vh: innerHeight };
}), null, 1));
await b.close();
