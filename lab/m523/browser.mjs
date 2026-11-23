// Genuine captured-device rendering, not intercepted responses or live I/O claims.
import { chromium, firefox, webkit, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const root=process.env.PIDP_STORAGE_WORK;
if (!root?.endsWith('/m523/rt11')) throw Error('Reviewed private work root required');
const base='https://127.0.0.1:8449',results=[];
for (const [name,engine] of Object.entries({chromium,firefox,webkit})) {
 const browser=await engine.launch();
 try {
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const login=await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token:readFileSync(root+'/writer.token','utf8').trim()}});expect(login.status()).toBe(200);
  const page=await context.newPage();await page.goto(base);
  for (const kind of ['disk','tape']) {
   const expected=JSON.parse(readFileSync(root+'/'+kind+'-published.json','utf8'));
   const inventory=await (await context.request.get(base+'/api/v1/storage')).json();expect(inventory.length).toBe(2);
   const row=inventory.find(r=>r.id===kind);expect(row).toBeTruthy();
   for (const [field,value] of Object.entries(expected)) expect(row[field],field).toEqual(value);
   await page.getByRole('button',{name:`Open ${kind==='disk'?'Disk drives':'Magnetic tape'}`,exact:true}).click();
   const win=page.locator(`[data-window="${kind==='disk'?'disks':'tapes'}"]`);await win.locator('.window-titlebar').dblclick();
   await win.getByRole('button',{name:'Read-only observation',exact:true}).click();await win.locator('[data-storage-refresh]').click();await win.getByLabel('Storage capture').selectOption(row.generation);
   const before=performance.now();await win.locator('[data-storage-view]').click();await expect(win.locator('[data-storage-details]')).toContainText(expected.sha256);const presentation=performance.now()-before;
   await expect(win.locator('[data-storage-facts]')).toContainText('no animated or inferred activity');await expect(win.getByRole('button',{name:/Mount|Eject|Rewind/})).toHaveCount(0);
   if(kind==='tape'){await expect(win.locator('[data-storage-facts]')).toContainText('58');await expect(win.locator('[data-storage-facts]')).toContainText('No guest driver qualified');}
   await page.screenshot({path:root+`/storage-${kind}-${name}.png`});
   await win.getByRole('button',{name:'Retained snapshot',exact:true}).click();await expect(win.locator('[data-storage-status]')).toContainText('not connected');await expect(win.locator('[data-storage-details]')).toContainText(expected.sha256);
   results.push({browser:name,device:row.device,generation:row.generation,sha256:row.sha256,freshness:row.freshness,source:'original captured SIMH evidence; no interception',all_captured_fields_equal:true,retained_is_not_connected:true,click_to_verified_dom_ms:presentation});
   await win.getByRole('button',{name:kind==='disk'?'Close Disk drives':'Close Magnetic tape',exact:true}).click();
  }
 } finally {await browser.close()}
}
writeFileSync(root+'/browser-results.json',JSON.stringify(results,null,2)+'\n');
