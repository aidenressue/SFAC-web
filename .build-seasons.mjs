// Builds the maintenance hero: two seasonal photos side by side with a thin
// divider, each carrying a small wall calendar pinned into its top right corner.
//
// The calendars are drawn here rather than generated, because image models
// garble date grids: wrong weekday alignment, repeated numbers, 32-day months.
// These come from the real 2026 calendar, so they are simply correct.
//
// The card is sized so the month name survives being scaled down to a phone:
// at 390px wide each panel is only ~195px, so the month is set large relative
// to the panel and the date grid is allowed to become texture.
//
//   node .build-seasons.mjs <summer.jpg> <winter.jpg> [out.jpg]

import { readFileSync } from 'fs';
import puppeteer from 'puppeteer';

const [summer, winter, out = 'web.screenshots/mt-hero-seasons.jpg'] = process.argv.slice(2);
if (!summer || !winter) {
  console.error('usage: node .build-seasons.mjs <summer> <winter> [out]');
  process.exit(1);
}

const PANEL = 1024;      // native size of the source images, so nothing is resampled
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

const panel = (label, year, month, photo) => `
    <div class="panel">
      <img src="${dataUri(photo)}">
      <div class="cal">
        <div class="cal-rings"><i></i><i></i><i></i></div>
        <div class="cal-month">${label}</div>
        <table>
          <thead><tr>${['S','M','T','W','T','F','S'].map(d => `<th>${d}</th>`).join('')}</tr></thead>
          <tbody>${monthGrid(year, month)
            .map(r => `<tr>${r.map(d => `<td>${d ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
    </div>`;

const html = `<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:${PANEL * 2 + DIVIDER}px; background:#000;
         font-family:'Archivo','Helvetica Neue',Arial,sans-serif; }
  .wrap { display:flex; width:${PANEL * 2 + DIVIDER}px; }
  .panel { position:relative; width:${PANEL}px; height:${PANEL}px; overflow:hidden; }
  .panel img { width:100%; height:100%; object-fit:cover; display:block; }
  .rule { width:${DIVIDER}px; background:#101112; }

  /* Pinned into the corner of the photo, no band of its own. */
  .cal {
    position:absolute; top:40px; right:40px; width:372px;
    background:rgba(255,255,255,.94); border-radius:14px;
    padding:22px 20px 18px; backdrop-filter:blur(2px);
    box-shadow:0 14px 40px rgba(0,0,0,.34);
  }
  .cal-rings { position:absolute; top:-9px; left:0; right:0;
               display:flex; justify-content:center; gap:84px; }
  .cal-rings i { width:11px; height:18px; border-radius:6px;
                 background:linear-gradient(180deg,#E2E4E7,#9AA0A6); display:block; }
  .cal-month { text-align:center; font-size:74px; font-weight:800; letter-spacing:-.02em;
               line-height:1; color:#101112; margin:2px 0 14px; }
  table { width:100%; border-collapse:collapse; }
  th { font-size:16px; font-weight:800; color:#A87B27; padding-bottom:6px; letter-spacing:.04em; }
  td { height:32px; text-align:center; font-size:17px; font-weight:600; color:#3A3D42; }
</style>
<div class="wrap">
${panel('June', 2026, 6, summer)}
  <div class="rule"></div>
${panel('January', 2026, 1, winter)}
</div>`;

const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.setViewport({ width: PANEL * 2 + DIVIDER, height: PANEL });
await p.setContent(html, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 300));
await (await p.$('.wrap')).screenshot({ path: out, quality: 92, type: 'jpeg' });
const size = await p.evaluate(() => {
  const r = document.querySelector('.wrap').getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)}`;
});
console.log(`wrote ${out}  ${size}`);
await b.close();
