// Genuine disposable V7 through the detached service. No intercepted API/WS data.
import {chromium,firefox,webkit,expect} from '@playwright/test';
import {readFileSync,writeFileSync,renameSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const root=process.env.PIDP551_WORK??'.research/m56/guest',base='https://127.0.0.1:8445';
const token=readFileSync(`${root}/writer.token`,'utf8').trim();
const observer=readFileSync(`${root}/observer.token`,'utf8').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function harness(op,data=''){
 const id=randomBytes(8).toString('hex');writeFileSync(`${root}/request.tmp`,JSON.stringify({id,op,data,wait:1}));renameSync(`${root}/request.tmp`,`${root}/request.json`);
 for(let i=0;i<100;i++){await sleep(100);if(existsSync(`${root}/response.json`)){const r=JSON.parse(readFileSync(`${root}/response.json`,'utf8'));if(r.id===id)return r.output;}}throw Error('Harness timeout');
}
const results={source:'Genuine disposable UNIX V7; network-none original SIMH; Mac browsers through fixed local test forwarding',browsers:[]};
const screen=p=>p.locator('.guest-xterm .xterm-rows');
async function command(p,text){await p.locator('.guest-xterm textarea').focus();await p.keyboard.type(text,{delay:15});await p.keyboard.press('Enter');}
for(const personality of ['vt100','vt52']) for(const [engineName,engine] of Object.entries({chromium,firefox,webkit})){
 const name=`${personality}_${engineName}`;
 const browser=await engine.launch();
 try{
  for(const id of ['v7-dc0','v7-dc2'])await harness('detach',id);
  const context=await browser.newContext({ignoreHTTPSErrors:true}); // Lab certificate only; deployment requires explicit trust.
  const login=await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token}});expect(login.status()).toBe(200);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
  await expect(page.locator('.guest-heading')).toContainText('DETACHED');await expect(page.locator('[data-connect]')).toBeDisabled();
  expect((await harness('status')).lines.every(l=>l.state==='detached')).toBe(true);
  await harness('attach','v7-dc0');await page.locator('[data-refresh]').click();await page.getByLabel('Guest endpoint').selectOption('v7-dc0');
  await page.getByLabel('Guest terminal personality').selectOption(personality);
  await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await page.locator('[data-acquire]').click();await expect(page.locator('[data-release]')).toBeEnabled();
  await command(page,'');
  await expect.poll(async()=>await screen(page).innerText(),{timeout:15000}).toMatch(/login:|\$\s*$/);
  if((await screen(page).innerText()).includes('login:')) {
   await command(page,'dmr');
   await expect.poll(async()=>await screen(page).innerText(),{timeout:15000}).toMatch(/\$\s*$/);
  }
  await command(page,`echo M56_${name}`);await expect.poll(async()=>((await screen(page).innerText()).match(new RegExp(`M56_${name}`,'g'))??[]).length,{timeout:15000}).toBeGreaterThanOrEqual(2);
  await command(page,'ls /');await expect(screen(page)).toContainText('usr');
  await page.locator('[data-disconnect]').click();await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  await expect(screen(page)).not.toContainText(`M56_${name}`);
  const conventional=await harness('traditional',`echo CONVENTIONAL_${name}\r`);expect(conventional).toContain(`CONVENTIONAL_${name}`);
  const operator=await harness('console',`echo OPERATOR_${name}\r`);expect(operator).toContain(`OPERATOR_${name}`);
  // Old choices cannot follow an operator-approved replacement attachment.
  await harness('detach','v7-dc0');await expect(page.locator('.guest-heading')).toContainText('DISCONNECTED');
  await harness('attach','v7-dc0');await page.locator('[data-connect]').click();await expect(page.locator('.guest-status')).toContainText('unavailable');
  await expect(page.locator('[data-acquire]')).toBeDisabled();
  await page.locator('[data-refresh]').click();await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  // Stopping the service leaves genuine guest and both conventional paths alive.
  await harness('bridge-stop');await expect(page.locator('.guest-heading')).toContainText('DISCONNECTED');
  expect(await harness('traditional',`echo WITHOUT_SERVICE_${name}\r`)).toContain(`WITHOUT_SERVICE_${name}`);
  expect(await harness('console',`echo CONSOLE_WITHOUT_SERVICE_${name}\r`)).toContain(`CONSOLE_WITHOUT_SERVICE_${name}`);
  const restarted=await harness('bridge-start');expect(restarted.lines.every(l=>l.state==='detached')).toBe(true);
  const stale=await context.request.get(base+'/api/v1/terminals');expect([401,403]).toContain(stale.status());
  expect(errors).toEqual([]);results.browsers.push({name,personality,passed:true,detachedStartup:true,explicitAttachment:true,genuineCommands:true,staleGenerationRejected:true,independentConsoleAndDC11:true,restartDetached:true,oldCookieRevoked:true});
  console.log(`${name}: M5.6 service and genuine guest passed`);
 }finally{await browser.close();}
}
writeFileSync(`${root}/browser-results.json`,JSON.stringify(results,null,2)+'\n');
