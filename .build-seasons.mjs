// Builds the maintenance hero: two seasonal photos side by side with a thin
// divider, each under a hanging wall calendar (June on the left, January on the
// right).
//
// The calendars are drawn here rather than generated, because image models
// garble date grids: wrong weekday alignment, repeated numbers, 32-day months.
// These come from the real 2026 calendar, so they are simply correct.
//
//   node .build-seasons.mjs <summer.jpg> <winter.jpg> [out.jpg]

import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';

const [summer, winter, out = 'web.screenshots/mt-hero-seasons.jpg'] = process.argv.slice(2);
if (!summer || !winter) {
  console.error('usage: node .build-seasons.mjs <summer> <winter> [out]');
  process.exit(1);
}

/** Each photo is square, so the pair lands near 2:1 before the calendars. */
const HALF = 900;
const PHOTO_H = 900;
const CAL_H = 420;
const DIVIDER = 6;

const dataUri = (p) => {
  const ext = p.split('.').pop().toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${readFileSync(p).toString('base64')}`;
};

/** Real weekday alignment, straight from the calendar, Sunday first. */
function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells = Array(first).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const calendar = (label, year, month) => `
      <div class="calbar">
        <div class="cal">
          <div class="cal-rings"><i></i><i></i><i></i><i></i><i></i></div>
          <div class="cal-month">${label}</div>
          <table>
            <thead><tr>${['S','M','T','W','T','F','S'].map(d => `<th>${d}</th>`).join('')}</tr></thead>
            <tbody>${monthGrid(year, month)
              .map(r => `<tr>${r.map(d => `<td>${d ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;

const column = (label, year, month, photo) => `
    <div class="col">
      ${calendar(label, year, month)}
      <img class="photo" src="${dataUri(photo)}">
    </div>`;

const html = `<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${HALF * 2 + DIVIDER}px; background:#fff;
         font-family:'Archivo','Helvetica Neue',Arial,sans-serif; }
  .wrap { display:flex; align-items:stretch; width:${HALF * 2 + DIVIDER}px; }
  .col { width:${HALF}px; }
  .rule { width:${DIVIDER}px; background:#101112; }
  .calbar { height:${CAL_H}px; display:flex; align-items:center; justify-content:center;
            background:#F4F3F0; }
  .cal { width:440px; background:#fff; border:1px solid #DED9CF; border-radius:10px;
         padding:26px 26px 22px; position:relative;
         box-shadow:0 10px 30px rgba(16,17,18,.13); }
  .cal-rings { position:absolute; top:-11px; left:0; right:0;
               display:flex; justify-content:center; gap:52px; }
  .cal-rings i { width:13px; height:22px; border-radius:7px;
                 background:linear-gradient(180deg,#C9CBCE,#8C9095); display:block; }
  .cal-month { text-align:center; font-size:44px; font-weight:800; letter-spacing:-.02em;
               color:#101112; margin:6px 0 16px; }
  table { width:100%; border-collapse:collapse; }
  th { font-size:17px; font-weight:800; color:#A87B27; padding-bottom:10px; letter-spacing:.06em; }
  td { height:46px; text-align:center; font-size:21px; font-weight:600; color:#2B2D30; }
  .photo { width:${HALF}px; height:${PHOTO_H}px; object-fit:cover; display:block; }
</style>
<div class="wrap">
${column('June', 2026, 6, summer)}
  <div class="rule"></div>
${column('January', 2026, 1, winter)}
</div>`;

const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: HALF * 2 + DIVIDER, height: PHOTO_H + CAL_H });
await p.setContent(html, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 300));
await (await p.$('.wrap')).screenshot({ path: out, quality: 92, type: 'jpeg' });
const size = await p.evaluate(() => {
  const r = document.querySelector('.wrap').getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)}`;
});
console.log(`wrote ${out}  ${size}`);
await b.close();
