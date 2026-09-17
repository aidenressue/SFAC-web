import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless:'shell' });
const p = await b.newPage();
await p.goto('https://www.shineforacause.com/booking', { waitUntil:'domcontentloaded' });
await new Promise(r=>setTimeout(r,4000));
console.log('LIVE booking:', await p.evaluate(() => ({
  saleActive: saleActive(),
  saleLabel: SITE_SALE.label,
  fullExpress: ['small','mid','large','van'].map(s=>svcPrice('reset-full',s).price).join('/'),
  fullExec: ['small','mid','large','van'].map(s=>svcPrice('executive-full',s).price).join('/'),
})));
await b.close();
