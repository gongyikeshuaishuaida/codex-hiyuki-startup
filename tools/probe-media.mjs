import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const src='data:video/mp4;base64,'+(await readFile(new URL('../assets/hiyuki-native-hd-motion.mp4',import.meta.url))).toString('base64');
for(const channel of [undefined,'msedge']) {
 const browser=await chromium.launch({headless:true,...(channel?{channel}:{})});
 try {
  const page=await browser.newPage();await page.setContent('<video muted></video>');
  const result=await page.evaluate(async src=>{const v=document.querySelector('video');const event=await new Promise(resolve=>{v.onloadeddata=()=>resolve('loadeddata');v.onerror=()=>resolve('error');setTimeout(()=>resolve('timeout'),10000);v.src=src;v.load()});return {event,width:v.videoWidth,height:v.videoHeight,error:v.error?.message||null}},src);
  console.log(JSON.stringify({browser:channel||'playwright-headless-shell',...result}));if(channel==='msedge'&&result.width!==1920)throw Error('Edge could not decode the packaged H.264 video');
 }finally{await browser.close()}
}
