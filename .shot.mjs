import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:'shell' });
const p = await b.newPage();
await p.goto('https://www.shineforacause.com/booking', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,1500));
console.log('LIVE BOOKING:', await p.evaluate(() => ({
  saleActive: typeof saleActive === 'function' ? saleActive() : 'n/a',
  fullExpressMid: svcPrice('reset-full','mid'),
  fullExecMid: svcPrice('executive-full','mid'),
})));
await p.goto('https://www.shineforacause.com/', { waitUntil:'networkidle2' });
await new Promise(r=>setTimeout(r,1200));
console.log('LIVE HOMEPAGE:', await p.evaluate(() => ({
  advertised: [...document.querySelectorAll('.pkg-price .now')].map(e=>e.textContent).slice(0,3),
  struck: [...document.querySelectorAll('.pkg-price .was')].map(e=>e.textContent).slice(0,3),
  saleBanner: !!document.querySelector('.sfac-sale'),
})));
await b.close();
