import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root=process.env.PACKAGE_UNDER_TEST?resolve(process.env.PACKAGE_UNDER_TEST):resolve(import.meta.dirname,'..');
const {buildInjection}=await import(pathToFileURL(join(root,'extension/payload.mjs')).href);
const manifest=JSON.parse(await readFile(join(root,'runtime-files.json'),'utf8'));
for(const item of manifest.files) {
 const data=await readFile(join(root,item.path));
 assert.equal(createHash('sha256').update(data).digest('hex'),item.sha256,`Packaged file changed or missing: ${item.path}`);
}
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:process.platform==='win32'?{channel:'msedge'}:{})});
const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1280,height:960},reducedMotion:'no-preference'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(join(root,'index.html')).href);await page.waitForFunction(()=>window.launcherUI&&document.querySelector('.window').dataset.playing==='true');await page.locator('#pause').click();
 const defaults=await page.evaluate(()=>({version:window.STARTUP_VISUAL.version,duration:window.STARTUP_VISUAL.durationMs,video:[document.querySelector('.slash-video').videoWidth,document.querySelector('.slash-video').videoHeight],muted:document.querySelector('.slash-video').muted}));
 assert.equal(defaults.version,13);assert.equal(defaults.duration,13500);assert.deepEqual(defaults.video,[1920,1080]);assert.equal(defaults.muted,true);
 await page.evaluate(()=>window.launcherUI.sampleAsync(8.1));
 if(process.argv.includes('--screenshots')) {await mkdir(join(root,'docs'),{recursive:true});await page.locator('.window').screenshot({path:join(root,'docs/preview.png')});}
 await page.evaluate(()=>window.launcherUI.openSettings());assert(await page.locator('#settings-dialog').isVisible());
 if(process.argv.includes('--screenshots'))await page.locator('#settings-dialog').screenshot({path:join(root,'docs/settings.png')});
 await page.locator('#intro-title').fill('测试角色');await page.locator('#artwork-subtitle').fill('测试台词');await page.locator('#preview-images').click();
 await page.waitForFunction(()=>!document.querySelector('#settings-dialog').open);assert.equal(await page.locator('.cinematic-quote').textContent(),'测试台词');
 await page.reload();await page.waitForFunction(()=>document.querySelector('.cinematic-quote')?.textContent==='测试台词');
 await page.evaluate(()=>window.launcherUI.openSettings());await page.locator('#reset-images').click();await page.locator('#preview-images').click();
 await page.waitForFunction(()=>!document.querySelector('#settings-dialog').open&&document.querySelector('.cinematic-quote').textContent==='该下雪了');assert.equal(await page.locator('.cinematic-name').textContent(),'绯雪');
 const host=await browser.newPage({viewport:{width:1280,height:720},reducedMotion:'no-preference'});host.on('pageerror',e=>errors.push(e.message));
 await host.setContent('<html><body><main>App ready</main></body></html>');await host.evaluate(await buildInjection(root,{deferStart:true}));await host.waitForFunction(()=>window.__aemeathExtension?.status().ready,null,{timeout:60000});
 const prepared=await host.evaluate(()=>({status:window.__aemeathExtension.status(),visibility:document.querySelector('iframe').style.visibility}));assert.equal(prepared.status.phase,'prepared');assert.equal(prepared.visibility,'hidden');
 for(const t of [1,5,8.1,9.7,11.5,12.1,12.8]) {
  const state=await host.evaluate(async t=>{const f=document.querySelector('iframe'),w=f.contentWindow;await w.launcherUI.sampleAsync(t);const v=w.document.querySelector('.slash-video');return {videoTime:v.currentTime,error:v.error?.message||null};},t);
  assert.equal(state.error,null);assert(Math.abs(state.videoTime-Math.max(0,t-8.9))<.04,`Native action seeks at ${t}s`);
 }
 await host.evaluate(()=>window.__aemeathExtension.dispose());assert.equal(await host.locator('iframe').count(),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result:'PASS',checkedFiles:manifest.files.length,preview:defaults,settingsSaveReloadReset:true,preparedInjection:true,nativeMotion:true,dispose:true}));
}finally{await browser.close();}
