// Synthetic delayed-response fixture; not genuine device evidence.
import {chromium,firefox,webkit,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const results=[];
const resultPath=process.env.M525_FIXTURE_RESULT;
if(!resultPath)throw Error('Set a fresh M525_FIXTURE_RESULT output path');
for(const [name,engine]of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();try{
  const page=await browser.newPage();let arrived=false;
  await page.route('**/activity',async route=>{arrived=true;await new Promise(r=>setTimeout(r,400));await route.fulfill({json:{mode:'approved-lab',instance:'a'.repeat(16),generation:1,sequence:1,lost:0,event_age_ms:1,activity:'recent verified read completion',events:1,bytes:512,filemarks:0,guest:'fixture'}}).catch(()=>{});});
  await page.goto('http://127.0.0.1:8451');await page.getByRole('button',{name:'Open Magnetic tape',exact:true}).click();const win=page.locator('[data-window="tapes"]');await win.getByRole('button',{name:'Read-only observation',exact:true}).click();await page.addScriptTag({url:'http://127.0.0.1:8451/m525-viewer.js'});
  await win.locator('[data-activity-start]').click();await expect.poll(()=>arrived).toBe(true);await win.locator('[data-activity-stop]').click();await page.waitForTimeout(500);await expect(win.locator('[data-activity-output]')).toHaveText('Disconnected viewer · activity unknown');
  arrived=false;await win.locator('[data-activity-start]').click();await expect.poll(()=>arrived).toBe(true);await page.waitForTimeout(500);await expect(win.locator('[data-activity-output]')).toContainText('activity unknown');await expect(win.locator('[data-activity-output]')).not.toContainText('recent verified');
  await page.unroute('**/activity');
  let requests=0;
  await page.route('**/activity',async route=>{
   requests++;
   if(requests>1)await new Promise(r=>setTimeout(r,400));
   await route.fulfill({json:{mode:'approved-lab',instance:'a'.repeat(16),generation:1,sequence:1,lost:0,event_age_ms:120,activity:'recent verified read completion',events:1,bytes:512,filemarks:0,max_queue_at_drain:1,guest:'fixture'}}).catch(()=>{});
  });
  await win.locator('[data-activity-start]').click();
  await expect(win.locator('[data-activity-output]')).toContainText('recent verified read completion');
  // Expire before the second request's 200 ms deadline, retaining last-known facts.
  await page.waitForTimeout(150);
  await expect(win.locator('[data-activity-output]')).toHaveText(/^unknown\nSource/);
  await win.locator('[data-activity-stop]').click();
  results.push({browser:name,fixture:true,delayed_reply_after_stop_rejected:true,timeout_expires_activity:true,independent_recent_activity_expiry:true});
 }finally{await browser.close();}
}
writeFileSync(resultPath,JSON.stringify(results,null,2),{flag:'wx'});
