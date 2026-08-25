import puppeteer from 'puppeteer';
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e)));
await p.goto('http://127.0.0.1:3001/booking.html', { waitUntil: 'networkidle2' });
await new Promise(r => setTimeout(r, 1200));
const cases = [
  ['Fort Collins', 40.5853,-105.0844, 0],
  ['Laporte',      40.6205,-105.1361, 0],
  ['Bellvue',      40.6289,-105.1706, 0],
  ['Timnath',      40.5297,-104.9847, 0],
  ['Wellington',   40.7053,-105.0086, 0],
  ['Severance',    40.5258,-104.8511, 0],
  ['Windsor',      40.4775,-104.9014, 0],
  ['Loveland',     40.3978,-105.0750, 0],
  ['Ault',         40.5847,-104.7333, 0],
  ['Berthoud',     40.3083,-105.0811, 0],
  ['Johnstown',    40.3369,-104.9122, 0],
  ['Eaton',        40.5303,-104.7124, 0],
  ['Greeley west', 40.4230,-104.8100, 0],
  ['Greeley downtown', 40.4233,-104.7091, 45],
  ['Greeley east', 40.4180,-104.6500, 45],
  ['Evans',        40.3766,-104.6919, 45],
  ['Longmont',     40.1672,-105.1019, 65],
  ['Cheyenne WY',  41.1400,-104.8202, null],
];
const out = await p.evaluate((cs) => cs.map(([name,lat,lng,exp]) => {
  const city = name.replace(/ (west|downtown|east)$/,'').replace(' WY','');
  const r = classifyLocation(city, lat, lng);
  return { name, mi: +milesFromFortCollins(lat,lng).toFixed(1), fee: r.serviced ? r.fee : null,
           tier: r.tier, serviced: r.serviced, exp };
}), cases);
let pass=0, fail=0;
for (const r of out) {
  const ok = r.fee === r.exp;
  ok?pass++:fail++;
  console.log((ok?'PASS':'FAIL').padEnd(5), r.name.padEnd(18), String(r.mi).padStart(5)+' mi',
    ' fee', String(r.fee===null?'not serviced':'$'+r.fee).padEnd(14), 'tier', r.tier,
    ok?'':`  EXPECTED $${r.exp}`);
}
console.log(`\n${pass} pass, ${fail} fail`);
console.log('errors', errs.length?errs:'none');
await b.close();
