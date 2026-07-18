import puppeteer from 'puppeteer';
import fs from 'fs';
import http from 'http';
// serve the video locally so canvas isn't tainted
const buf = fs.readFileSync('/private/tmp/vid2.mp4');
const srv = http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'video/mp4'});res.end(buf);}).listen(4599);
const b = await puppeteer.launch({ headless: 'shell', args:['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
await p.goto('data:text/html,<video id=v src="http://127.0.0.1:4599/v.mp4"></video>', { waitUntil:'load' });
await p.evaluate(()=>new Promise(r=>{const v=document.getElementById('v');v.addEventListener('loadeddata',r,{once:true});v.load();}));
const shots=[0.15,0.5,0.85];
for (let i=0;i<shots.length;i++){
  const durl = await p.evaluate(async (t)=>{const v=document.getElementById('v');v.currentTime=v.duration*t;await new Promise(r=>setTimeout(r,400));const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);return c.toDataURL('image/jpeg',0.8);}, shots[i]);
  fs.writeFileSync('/private/tmp/vf'+i+'.jpg', Buffer.from(durl.split(',')[1],'base64'));
}
await b.close(); srv.close();
console.log('ok');
