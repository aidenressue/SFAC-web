import puppeteer from 'puppeteer';
const OUT = '/private/tmp/claude-501/-Users-aidenressue-Documents-Website/56e1d545-0ff1-4c0e-911d-543c5d6c3fb7/scratchpad/';
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 900 });
await p.goto('http://127.0.0.1:3001/index.html', { waitUntil: 'networkidle2' });
await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=700) { scrollTo(0,y); await new Promise(r=>setTimeout(r,40)); } });
await new Promise(r => setTimeout(r, 1400));
for (const [n, s] of [['dfoot','footer'],['dstory','#story']]) {
  const box = await p.evaluate(sel => { const e=document.querySelector(sel); const r=e.getBoundingClientRect();
    return { x:0, y:Math.round(r.top+scrollY), width:1440, height:Math.min(1100, Math.round(r.height)) }; }, s);
  await p.screenshot({ path: `${OUT}${n}.png`, clip: box });
}
console.log(JSON.stringify(await p.evaluate(() => {
  const g = s => { const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect();
    return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; };
  return { logo:g('.foot-logo'), services:g('.foot-services'), areas:g('.foot-areas'), contact:g('.foot-contact'),
    map:g('.foot-mapcol'), storyMedia:g('.story-media'), storyGrid:g('.story-grid'),
    overflow: document.documentElement.scrollWidth > 1440 };
}), null, 1));
await b.close();
