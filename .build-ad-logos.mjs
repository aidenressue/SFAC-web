// Builds the logo assets Google Ads asks for, at its recommended sizes.
//
//   Square logo  1:1  1200x1200   (min 128x128)
//   Wide logo    4:1  1200x300    (min 512x128)
//
// TWO INKS, TWO BACKGROUNDS. The brand has a dark-ink logo and a light-ink one,
// and they are not interchangeable:
//
//   brand/dark-logo-for-booking-pages.png   black + gold ink  -> white background
//   brand/shine-for-a-cause-logo.png        white + gold ink  -> black background
//
// Putting the black wordmark on black loses the whole name, so the black-背景
// asset is built from the light-ink file, not from the one used for white.
//
// Not used, deliberately: the files named "LOGO transparent" and "LOGO cropped".
// Whoever cut those out stripped the black ink with the background and left
// ghost outlines (average ink luminance 155 with only 20% dark pixels, against
// 96 and 47% on a good file). logo-nav-dark.png is the right ink but only 320px
// wide, far short of the 1200px Google wants.
//
// FILL: 90% of the frame, not the 80% "safe area" Google suggests. The lockup is
// 2.15:1, so in a 1:1 frame the width is what binds and 80% left it looking lost
// in the middle of a big square. 90% keeps a real margin while filling the slot.
//
//   node .build-ad-logos.mjs

import { readFileSync, mkdirSync } from 'fs';
import puppeteer from 'puppeteer';

const VARIANTS = [
  { name: 'black', src: 'brand/shine-for-a-cause-logo.png',       bg: '#000000' },
  { name: 'white', src: 'brand/dark-logo-for-booking-pages.png',  bg: '#FFFFFF' },
];
const FILL = 0.90;

mkdirSync('ads', { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const page = await b.newPage();
await page.goto('about:blank');

const srcUri = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

/**
 * Crop each source to its ink so the logo is measured by the mark, not by
 * whatever margin the file happens to carry, and knock any solid background out
 * so both inks composite the same way.
 *
 * The white is removed by flooding in from the border rather than keying on
 * colour, so white highlights INSIDE the gold survive.
 */
async function prepare(src) {
  return page.evaluate(async (uri) => {
    const img = new Image();
    await new Promise((r) => { img.onload = r; img.src = uri; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const im = g.getImageData(0, 0, c.width, c.height);
    const d = im.data, W = c.width, H = c.height;
    const isBg = (i) => d[i + 3] === 0 || (d[i] > 242 && d[i + 1] > 242 && d[i + 2] > 242);

    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) stack.push(x, 0, x, H - 1);
    for (let y = 0; y < H; y++) stack.push(0, y, W - 1, y);
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const k = y * W + x;
      if (seen[k] || !isBg(k * 4)) continue;
      seen[k] = 1; d[k * 4 + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    g.putImageData(im, 0, 0);

    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[(y * W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const cut = document.createElement('canvas');
    cut.width = cw; cut.height = ch;
    cut.getContext('2d').drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    return { box: `${cw}x${ch}`, ratio: (cw / ch).toFixed(2), data: cut.toDataURL('image/png') };
  }, srcUri(src));
}

async function build({ data, w, h, out, bg }) {
  const p = await b.newPage();
  await p.setViewport({ width: w, height: h });
  await p.setContent(`<style>
      html,body{margin:0;padding:0}
      body{width:${w}px;height:${h}px;background:${bg};
           display:flex;align-items:center;justify-content:center}
      img{max-width:${Math.round(w * FILL)}px;max-height:${Math.round(h * FILL)}px;
          width:auto;height:auto;display:block}
    </style><img src="${data}">`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 250));
  await p.screenshot({ path: out });
  const box = await p.evaluate(() => {
    const r = document.querySelector('img').getBoundingClientRect();
    return `${Math.round(r.width)}x${Math.round(r.height)}`;
  });
  console.log(`${out.padEnd(40)} ${w}x${h}  logo drawn at ${box}`);
  await p.close();
}

const prepared = {};
for (const v of VARIANTS) {
  prepared[v.name] = await prepare(v.src);
  console.log(`${v.name.padEnd(6)} source ink ${prepared[v.name].box} (${prepared[v.name].ratio}:1)`);
}
console.log('');

for (const v of VARIANTS) {
  const d = prepared[v.name].data;
  await build({ data: d, w: 1200, h: 1200, out: `ads/logo-square-1200-${v.name}.png`, bg: v.bg });
  await build({ data: d, w: 1200, h: 300,  out: `ads/logo-wide-1200x300-${v.name}.png`, bg: v.bg });
}

// ── Proof sheet: each asset on the light and dark cards Google might use ─────
const uri = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');
const p = await b.newPage();
await p.setViewport({ width: 1080, height: 760 });
await p.setContent(`<style>
    html,body{margin:0;font-family:-apple-system,Helvetica,Arial,sans-serif;background:#fff}
    h3{font:600 15px -apple-system,Arial;margin:20px 0 8px 16px;color:#101112}
    .row{display:flex;gap:14px;padding:0 16px}
    .c{width:320px;height:320px;display:flex;align-items:center;justify-content:center}
    .lt{background:#f2f2f2;border:1px solid #ddd}.dk{background:#16181C}
    .c img{max-width:92%;max-height:92%}
    .cap{font:12px -apple-system,Arial;color:#666;padding:6px 16px 0}
  </style>
  <h3>Black background asset — on a light card / a dark card</h3>
  <div class="row">
    <div class="c lt"><img src="${uri('ads/logo-square-1200-black.png')}"></div>
    <div class="c dk"><img src="${uri('ads/logo-square-1200-black.png')}"></div>
  </div>
  <div class="cap">Reads as a black tile either way, and the name stays white.</div>
  <h3>White background asset — same two cards</h3>
  <div class="row">
    <div class="c lt"><img src="${uri('ads/logo-square-1200-white.png')}"></div>
    <div class="c dk"><img src="${uri('ads/logo-square-1200-white.png')}"></div>
  </div>
  <div class="cap">Disappears into a light card, which is what you were seeing.</div>`,
  { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 300));
await p.screenshot({ path: 'ads/_proof-black-vs-white.png', fullPage: true });
console.log('\nads/_proof-black-vs-white.png');
await b.close();
