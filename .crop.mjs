import puppeteer from 'puppeteer';
const out='/tmp/claude-501/-Users-aidenressue-Documents-Website/fe0839e4-5511-40e2-8551-87dc3e5051f4/scratchpad';
const b=await puppeteer.launch({headless:'shell'});
const p=await b.newPage();
await p.setViewport({width:1600,height:1500});
await p.goto('file://'+out+'/view.html',{waitUntil:'networkidle2'});
const h=await p.evaluate(()=>document.querySelector('img').getBoundingClientRect().height);
console.log('rendered height',h);
const n=Math.ceil(h/1500);
for(let i=0;i<n;i++){
  await p.screenshot({path:`${out}/hi-${String(i).padStart(2,'0')}.png`,clip:{x:0,y:i*1500,width:1600,height:Math.min(1500,h-i*1500)}});
}
await b.close();
console.log('slices',n);
