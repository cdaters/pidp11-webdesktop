// Actual original desktop + isolated activity injection; no intercepted event feed.
// Filesystem markers below are independent lab-operator actions, never browser APIs.
import {chromium,firefox,webkit,expect} from '@playwright/test';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
const root=process.env.PIDP_ACTIVITY_WORK;
if(!root?.match(/\/m525\/browser(?:2)?$/))throw Error('Exact private lab work root required');
const wait=async(path)=>{const until=Date.now()+20000;while(!existsSync(path)){if(Date.now()>until)throw Error('Operator checkpoint timeout');await new Promise(r=>setTimeout(r,50));}};
await wait(root+'/browser-ready.json');
const results=[];
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto('http://127.0.0.1:8450');await page.getByRole('button',{name:'Open Magnetic tape',exact:true}).click();
  const win=page.locator('[data-window="tapes"]');await win.locator('.window-titlebar').dblclick();await win.getByRole('button',{name:'Read-only observation',exact:true}).click();
  await page.addScriptTag({url:'http://127.0.0.1:8450/m525-viewer.js'});
  await page.evaluate(()=>{window.activitySamples=[];document.querySelector('[data-activity-output]').parentElement.addEventListener('m525-render',e=>{if(window.activitySamples.length<128)window.activitySamples.push(e.detail);});});
  let requests=0;page.on('request',r=>{if(r.url().endsWith('/activity'))requests++;});
  await expect(win.locator('[data-activity-output]')).toContainText('Disconnected');expect(requests).toBe(0);
  await win.locator('[data-activity-start]').click();
  await page.waitForFunction(()=>window.activitySamples.length>0);
  const baselineSequence=await page.evaluate(()=>{const seq=window.activitySamples.at(-1).sequence;window.activitySamples=[];return seq;});
  const requestsBefore=requests;const started=performance.now();
  writeFileSync(root+'/'+name+'-start','Independent Mac lab operator starts bounded DIR workload');
  await expect(win.locator('[data-activity-output]')).toContainText('recent verified read completion');
  await page.screenshot({path:root+'/'+name+'-activity.png'});
  await wait(root+'/'+name+'-done');await page.waitForTimeout(500);
  await expect(win.locator('[data-activity-output]')).toContainText('unknown');
  const elapsed=performance.now()-started;const requestsAtWorkloadEnd=requests-requestsBefore;const samples=await page.evaluate(()=>window.activitySamples);
  const seen=new Set([baselineSequence]);const ages=samples.filter(s=>{if(seen.has(s.sequence))return false;seen.add(s.sequence);return s.ageUpperMS>=0;}).map(s=>s.ageUpperMS).sort((a,b)=>a-b);
  if(name==='webkit'){
   writeFileSync(root+'/replace-approved','Independent operator: idle/halt, replace readonly authored tape');await wait(root+'/replacement.json');
   await expect(win.locator('[data-activity-output]')).toContainText('retired');
  }else{
   await win.locator('[data-activity-stop]').click();const before=requests;await page.waitForTimeout(350);expect(requests).toBe(before);await expect(win.locator('[data-activity-output]')).toContainText('unknown');
  }
  results.push({browser:name,source:'genuine instrumented RT11; no intercepted responses',requests:requestsAtWorkloadEnd,elapsed_ms:elapsed,request_rate:requestsAtWorkloadEnd/(elapsed/1000),raw_samples:samples,age_upper_bound_samples:ages,p95_upper_ms:ages[Math.ceil(ages.length*.95)-1],expired_to_unknown:true,cancellation_passed:name!=='webkit',attachment_retirement_passed:name==='webkit'});
 }finally{await browser.close();}
}
writeFileSync(root+'/browser-results.json',JSON.stringify(results,null,2)+'\n');writeFileSync(root+'/browser-finished','Observation finished; independent operator may quit');
