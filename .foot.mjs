import puppeteer from 'puppeteer';
const OUT = '/private/tmp/claude-501/-Users-aidenressue-Documents-Website/56e1d545-0ff1-4c0e-911d-543c5d6c3fb7/scratchpad/';
const url = process.argv[2] || 'http://127.0.0.1:3001/index.html';
const tag = process.argv[3] || 'a';
const w = Number(process.argv[4] || 390);
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: w, height: 844, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: 'networkidle2' });
await p.evaluate(async () => { for (let y=0; y<document.body.scrollHeight; y+=600) { scrollTo(0,y); await new Promise(r=>setTimeout(r,40)); } });
await new Promise(r => setTimeout(r, 1400));
const box = await p.evaluate(() => { const e = document.querySelector('footer');
  const r = e.getBoundingClientRect(); return { x:0, y:Math.round(r.top+scrollY), width:innerWidth, height:Math.round(r.height) }; });
await p.screenshot({ path: `${OUT}footfull-${tag}.png`, clip: box });
console.log(JSON.stringify(await p.evaluate(() => {
  const g = s => { const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect();
    return { l:Math.round(r.left), t:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) }; };
  return { logo:g('.foot-logo'), services:g('.foot-services'), areas:g('.foot-areas'),
    contact:g('.foot-contact'), map:g('.foot-mapcol'), footH:g('footer').h,
    missionShown: !!document.querySelector('.foot-mission')?.offsetParent,
    overflow: document.documentElement.scrollWidth > innerWidth ? document.documentElement.scrollWidth : false };
}), null, 1));
await b.close();
