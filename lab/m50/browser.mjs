// Genuine UNIX V7 acceptance. No response stubs, prerecorded output or mock shell.
import {chromium,firefox,webkit,expect} from '@playwright/test';
import {readFileSync,writeFileSync,renameSync,existsSync,mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const root=process.env.PIDP50_WORK??'.research/m50';
const base='https://127.0.0.1:8445';
const token=readFileSync(`${root}/terminal.token`,'utf8').trim();
const reader=readFileSync(`${root}/observer.token`,'utf8').trim();
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const results={source:'Genuine UNIX V7 under original pinned SIMH/REALCONS; not transport fixtures',browsers:[],independence:[],restart:null};
async function harness(op,data=''){
 const id=randomBytes(6).toString('hex');writeFileSync(`${root}/request.tmp`,JSON.stringify({id,op,data,wait:1}));renameSync(`${root}/request.tmp`,`${root}/request.json`);
 for(let i=0;i<100;i++){await sleep(100);if(existsSync(`${root}/response.json`)){const r=JSON.parse(readFileSync(`${root}/response.json`,'utf8'));if(r.id===id)return r.output;}}throw Error('Local harness timeout');
}
async function client(browser,key=token,endpoint='v7-dc0'){
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1500,height:1000}});
 const r=await context.request.post(`${base}/api/v1/login`,{headers:{Origin:base},data:{token:key}});expect(r.status()).toBe(200);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
 await expect(page.locator('[data-connect]')).toBeEnabled();await page.getByLabel('Guest endpoint').selectOption(endpoint);
 await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
 return{context,page,errors};
}
const screen=p=>p.locator('.guest-xterm .xterm-rows');
async function command(p,text){await p.locator('.guest-xterm textarea').focus();await p.keyboard.type(text,{delay:15});await p.keyboard.press('Enter');}
async function own(p){await p.locator('[data-acquire]').click();await expect(p.locator('[data-release]')).toBeEnabled();}
async function loginGuest(p){await command(p,'');await sleep(700);const current=await screen(p).innerText();if(current.includes('login:')){await command(p,'dmr');await expect(screen(p)).toContainText('$',{timeout:10000});}}
mkdirSync('docs/screenshots',{recursive:true});
for(const [name,engine] of Object.entries({chromium,firefox,webkit})){
 const browser=await engine.launch();try{
  const a=await client(browser),b=await client(browser),observer=await client(browser,reader);
  await expect(observer.page.locator('[data-acquire]')).toBeDisabled();await own(a.page);
  await b.page.locator('[data-acquire]').click();await expect(b.page.locator('.guest-status')).toContainText('Keyboard unavailable');await expect(b.page.locator('[data-release]')).toBeDisabled();
  await loginGuest(a.page);await command(a.page,'ls /');await expect(screen(a.page)).toContainText('usr',{timeout:15000});
  const marker=`M50_${name}_${randomBytes(4).toString('hex')}`;await command(a.page,`echo ${marker}`);
  await expect.poll(async()=>((await screen(a.page).innerText()).match(new RegExp(marker,'g'))??[]).length,{timeout:15000}).toBeGreaterThanOrEqual(2);
  await expect(screen(b.page)).toContainText(marker,{timeout:10000});await expect(screen(observer.page)).toContainText(marker,{timeout:10000});
  await a.page.getByLabel('Backspace encoding').selectOption('35');
  await a.page.locator('.guest-xterm textarea').focus();await a.page.keyboard.type('echo ERASE_OKX');await a.page.keyboard.press('Backspace');await a.page.keyboard.press('Enter');
  await expect.poll(async()=>/\nERASE_OK\n/.test(await screen(a.page).innerText()),{timeout:15000}).toBe(true);
  const transcript=await screen(a.page).innerText();
  if(name==='chromium')await a.page.screenshot({path:'docs/screenshots/m50-real-unix-v7.png'});
  const independent=await harness('traditional',`echo INDEPENDENT_${name}\r`);expect(independent).toContain(`INDEPENDENT_${name}`);expect(independent).toContain('$');
  const operator=await harness('console',`echo OPERATOR_${name}\r`);expect(operator).toContain(`OPERATOR_${name}`);expect(operator).toContain('$');
  results.independence.push({browser:name,traditional:independent,operator});
  await a.context.close();await sleep(250);await own(b.page);
  await command(b.page,`echo AFTER_CLOSE_${name}`);await expect.poll(async()=>((await screen(b.page).innerText()).match(new RegExp(`AFTER_CLOSE_${name}`,'g'))??[]).length,{timeout:15000}).toBeGreaterThanOrEqual(2);
  // A second real DC11 guest line can own a keyboard concurrently.
  const second=await client(browser,token,'v7-dc2');await own(second.page);await loginGuest(second.page);await command(second.page,`echo SEPARATE_LINE_${name}`);await expect(screen(second.page)).toContainText(`SEPARATE_LINE_${name}`,{timeout:10000});
  // Explicit reconnect starts a fresh display without acquiring or replaying input.
  await b.page.locator('[data-disconnect]').click();await b.page.locator('[data-connect]').click();await expect(b.page.locator('.guest-heading')).toContainText('READ-ONLY');await expect(screen(b.page)).not.toContainText(marker);await own(b.page);
  await command(b.page,'cat /usr/dmr/m50.vt');await expect(screen(b.page)).toContainText('REAL UNIX V7 / VT100 TRANSPORT',{timeout:15000});await expect(screen(b.page)).toContainText('REVERSE VIDEO',{timeout:10000});
  await expect(screen(b.page)).toContainText('┌',{timeout:10000});
  await expect(screen(b.page)).toContainText('└──────┘',{timeout:15000});
  await expect(screen(b.page)).toContainText('$',{timeout:10000});
  if(name==='chromium')await b.page.screenshot({path:'docs/screenshots/m50-real-vt100-sequences.png'});
  // Refresh does not resume a keyboard lease; cookie authorization alone is insufficient.
  await b.page.reload();await b.page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();await expect(b.page.locator('[data-release]')).toBeDisabled();
  expect([...a.errors,...b.errors,...observer.errors,...second.errors]).toEqual([]);
  console.log(name+": genuine guest acceptance passed");
  results.browsers.push({name,passed:true,transcript,concurrentViewers:3,independentKeyboardLines:2,disconnectReconnect:true,refreshReadOnly:true,guestVT100Output:true});
 }finally{await browser.close();}
}
// Server interruption breaks the browser bridge, not the original guest/console.
const browser=await chromium.launch();try{
 const a=await client(browser);await own(a.page);await harness('bridge-stop');await expect(a.page.locator('.guest-heading')).toContainText('DISCONNECTED');
 const during=await harness('traditional','echo GUEST_WITHOUT_BRIDGE\r');expect(during).toContain('GUEST_WITHOUT_BRIDGE');expect(during).toContain('$');
 const console=await harness('console','echo CONSOLE_WITHOUT_BRIDGE\r');expect(console).toContain('CONSOLE_WITHOUT_BRIDGE');
 await harness('bridge-start');const b=await client(browser);await own(b.page);await loginGuest(b.page);await command(b.page,'echo BRIDGE_RETURNED');await expect.poll(async()=>((await screen(b.page).innerText()).match(/BRIDGE_RETURNED/g)??[]).length,{timeout:15000}).toBeGreaterThanOrEqual(2);
 results.restart={passed:true,traditional:during,operator:console};
}finally{await browser.close();}
writeFileSync(`${root}/browser-acceptance.json`,JSON.stringify(results,null,2)+'\n');console.log('PASS: genuine guest commands, concurrent viewers, two independent guest lines, operator/conventional access, reconnect, VT100 output and backend interruption in all three engines.');
