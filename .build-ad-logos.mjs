// Builds the logo assets Google Ads asks for, at its recommended sizes.
//
//   Square logo  1:1  1200x1200   (min 128x128)
//   Wide logo    4:1  1200x300    (min 512x128)
//
// SOURCE: brand_assets/Dark logo for booking pages.png
//
// That name is misleading — it is the dark-INK logo, meant for light
// backgrounds, and it is the only high-resolution file with the black wordmark
// intact. The two files called "transparent" are broken: whoever cut them out
// removed the black ink along with the background, leaving ghost outlines that
// vanish on white. Checked pixel by pixel: average ink luminance 155 with only
// 20% dark pixels, against 96 and 47% on the good one.
//
// Layout rules:
//   - The source carries its own white margin, so the ink bounding box is
//     measured and cropped first. Otherwise the logo floats tiny in the frame.
//   - Google crops logo edges in some placements and asks for the mark to sit
//     inside the middle 80%, so the cropped logo is fitted to 80% and centred.
//
// Transparent variants are flood-filled from the border rather than keyed on
// colour, so the white highlights INSIDE the gold survive.
//
//   node .build-ad-logos.mjs

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';

const SRC = 'brand_assets/Dark logo for booking pages.png';
const SAFE = 0.8;

mkdirSync('ads', { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const page = await b.newPage();
await page.goto('about:blank');

const srcUri = 'data:image/png;base64,' + readFileSync(SRC).toString('base64');

/** Crop to the ink, and optionally knock the outer white out to transparent. */
const prepared = await page.evaluate(async (uri) => {
  const img = new Image();
  await new Promise((r) => { img.onload = r; img.src = uri; });
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const im = g.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  const W = c.width, H = c.height;
  const isWhite = (i) => d[i] > 242 && d[i + 1] > 242 && d[i + 2] > 242;

  // Ink bounding box.
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!isWhite((y * W + x) * 4)) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }

  // Flood fill white from the border → alpha 0. Interior whites are untouched
  // because the fill can never reach them through the ink.
  const seen = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, 0, x, H - 1); }
  for (let y = 0; y < H; y++) { stack.push(0, y, W - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const k = y * W + x;
    if (seen[k]) continue;
    if (!isWhite(k * 4)) continue;
    seen[k] = 1;
    d[k * 4 + 3] = 0;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  g.putImageData(im, 0, 0);

  // Export the cropped versions.
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const cutTransparent = document.createElement('canvas');
  cutTransparent.width = cw; cutTransparent.height = ch;
  cutTransparent.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);

  const cutWhite = document.createElement('canvas');
  cutWhite.width = cw; cutWhite.height = ch;
  const gw = cutWhite.getContext('2d');
  gw.fillStyle = '#FFFFFF'; gw.fillRect(0, 0, cw, ch);
  gw.drawImage(cutTransparent, 0, 0);

  return {
    box: `${cw}x${ch}`,
    ratio: (cw / ch).toFixed(2),
    transparent: cutTransparent.toDataURL('image/png'),
    white: cutWhite.toDataURL('image/png'),
  };
}, srcUri);

console.log(`ink bounding box ${prepared.box}  (${prepared.ratio}:1)\n`);

async function build({ w, h, out, transparent }) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.setContent(`<style>
      html,body{margin:0;padding:0}
      body{width:${w}px;height:${h}px;
           background:${transparent ? 'transparent' : '#FFFFFF'};
           display:flex;align-items:center;justify-content:center}
      img{max-width:${Math.round(w * SAFE)}px;max-height:${Math.round(h * SAFE)}px;
          width:auto;height:auto;display:block}
    </style><img src="${transparent ? prepared.transparent : prepared.white}">`,
    { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 250));
  await p.screenshot({ path: out, omitBackground: !!transparent });
  const box = await p.evaluate(() => {
    const r = document.querySelector('img').getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  console.log(`${out.padEnd(44)} ${w}x${h}  logo drawn at ${box}`);
  await p.close();
}

await build({ w: 1200, h: 1200, out: 'ads/logo-square-1200.png' });
await build({ w: 1200, h: 1200, out: 'ads/logo-square-1200-transparent.png', transparent: true });
await build({ w: 1200, h: 300,  out: 'ads/logo-wide-1200x300.png' });
await build({ w: 1200, h: 300,  out: 'ads/logo-wide-1200x300-transparent.png', transparent: true });

// ── Proof sheet ────────────────────────────────────────────────────────────
const uri = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const p = await b.newPage();
await p.setViewport({ width: 1100, height: 720 });
await p.setContent(`<style>
    html,body{margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;background:#fff}
    h3{font:600 15px -apple-system,Arial;margin:18px 0 8px 16px;color:#101112}
    .row{display:flex;gap:2px;padding:0 16px}
    .c{width:330px;height:330px;display:flex;align-items:center;justify-content:center}
    .w{background:#fff;border:1px solid #ddd}.k{background:#16181C}.g{background:#7d7d7d}
    .c img{max-width:88%;max-height:88%}
    .cap{font:12px -apple-system,Arial;color:#666;padding:6px 16px 0}
  </style>
  <h3>Transparent version — on a white / dark / grey Google card</h3>
  <div class="row">
    <div class="c w"><img src="${uri('ads/logo-square-1200-transparent.png')}"></div>
    <div class="c k"><img src="${uri('ads/logo-square-1200-transparent.png')}"></div>
    <div class="c g"><img src="${uri('ads/logo-square-1200-transparent.png')}"></div>
  </div>
  <div class="cap">On the dark card the black wordmark and car outline go nearly invisible.</div>
  <h3>White background version — same three cards</h3>
  <div class="row">
    <div class="c w"><img src="${uri('ads/logo-square-1200.png')}"></div>
    <div class="c k"><img src="${uri('ads/logo-square-1200.png')}"></div>
    <div class="c g"><img src="${uri('ads/logo-square-1200.png')}"></div>
  </div>
  <div class="cap">Reads identically wherever Google puts it.</div>`,
  { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
await p.screenshot({ path: 'ads/_proof-transparent-vs-white.png', fullPage: true });
console.log('ads/_proof-transparent-vs-white.png');
await b.close();
