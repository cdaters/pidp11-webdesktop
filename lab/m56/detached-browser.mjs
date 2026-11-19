// Real installed candidate in the isolated Linux VM; no synthetic route handlers.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const token=execFileSync('orbctl',['run','-m','pidp11-m56','-u','root','cat','/etc/pidp11-webdesktop/writer.token'],{encoding:'utf8'}).trim();
const browser=await chromium.launch();
try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 const origin='https://127.0.0.1:8445';
 const login=await context.request.post(origin+'/api/v1/login',{headers:{Origin:origin},data:{token}});expect(login.status()).toBe(200);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
 await expect(page.locator('.guest-heading')).toContainText('DETACHED');await expect(page.locator('[data-connect]')).toBeDisabled();
 await page.locator('[data-refresh]').click();await expect(page.locator('.guest-status')).toContainText('No guest attached');expect(errors).toEqual([]);
 writeFileSync('.research/m56/detached-browser.json',JSON.stringify({source:'Installed candidate under systemd in isolated ARM64 Linux; no guest listener',browser:'Chromium',authenticated:true,detached:true,noAutomaticConnection:true,errors},null,2)+'\n');
 console.log('Installed detached desktop opened and authenticated with no guest listener.');
}finally{await browser.close();}
