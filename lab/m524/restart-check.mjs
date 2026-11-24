import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const root=process.env.PIDP_STORAGE_WORK;
if(!root?.match(/\/m524\/(rt11|v7)$/))throw Error('Reviewed private work root required');
const base='https://127.0.0.1:8449',browser=await chromium.launch();
try {
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 const login=await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token:readFileSync(root+'/writer.token','utf8').trim()}});expect(login.status()).toBe(200);
 const rows=await (await context.request.get(base+'/api/v1/storage')).json();expect(rows).toEqual([]);
 const prior=JSON.parse(readFileSync(root+'/browser-results.json','utf8')).filter(row=>row.browser==='chromium');
 for(const row of prior){const response=await context.request.get(base+`/api/v1/storage/${row.device==='RP0'?'disk':'tape'}/${row.generation}`);expect(response.status()).toBe(404);}
 const page=await context.newPage();let requests=0;page.on('request',r=>{if(r.url().includes('/api/v1/storage'))requests++;});
 await page.goto(base);await page.getByRole('button',{name:'Open Disk drives',exact:true}).click();const win=page.locator('[data-window="disks"]');await win.getByRole('button',{name:'Read-only observation',exact:true}).click();expect(requests).toBe(0);
 await win.locator('[data-storage-refresh]').click();await expect(win.locator('[data-storage-status]')).toContainText('No approved captures');
 writeFileSync(root+'/restart-browser.json',JSON.stringify({empty_inventory:true,old_generations_retired:1,no_automatic_request_on_open:true,explicit_refresh_shows_unavailable:true},null,2)+'\n');
}finally{await browser.close()}
