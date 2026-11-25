// Actual V7 /bin/cu through original DC11, TLS bridge and three browser engines.
// Fixed loopback relay only. No route interception; operator console is separate.
import {chromium,firefox,webkit,expect} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='.research/m526/v7', base='https://127.0.0.1:8445';
const sha=b=>createHash('sha256').update(b).digest('hex');
const records=[];
for(const [name,engine] of Object.entries({chromium,firefox,webkit})) {
 const browser=await engine.launch();
 try {
  const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  expect((await context.request.post(base+'/api/v1/login',{headers:{Origin:base},data:{token:readFileSync(root+'/service-private/writer.token','utf8').trim()}})).status()).toBe(200);
  const page=await context.newPage(); let output=Buffer.alloc(0); const states=[];
  page.on('websocket',ws=>ws.on('framereceived',f=>{
   const frame=JSON.parse(String(f.payload));
   if(frame.type==='output') {output=Buffer.concat([output,Buffer.from(frame.data,'base64')]); if(output.length>65536) throw Error('bounded capture exhausted');}
   if(frame.serial && states.length<128) states.push(frame.serial);
  }));
  await page.goto(base); await page.getByRole('button',{name:'Open Communications',exact:true}).click();
  await expect(page.locator('[data-serial-facts]')).toContainText('DC11 unit 0, line 3');
  await page.locator('[data-connect]').click();
  await expect(page.locator('[data-serial-facts]')).toContainText('Observation');
  await page.locator('[data-acquire]').click(); await expect(page.locator('[data-release]')).toBeEnabled();
  const incoming=`M526-${name.toUpperCase()}-TO-V7-29E0\n`;
  const before=readFileSync(root+'/console-private.txt','utf8').length;
  const start=performance.now();
  await page.locator('.guest-xterm textarea').focus();
  await page.keyboard.type(incoming.trimEnd()); await page.locator('.terminal-workstation > summary').click(); await page.locator('[data-terminal-key="LineFeed"]').click();
  await expect.poll(()=>readFileSync(root+'/console-private.txt','utf8').slice(before),{timeout:5000}).toContain(incoming.trimEnd());
  const visibleMS=performance.now()-start;
  const guestMessage=`M526-V7-TO-${name.toUpperCase()}-8AC2`;
  execFileSync('python3',['lab/m526/request.py',root,'guest',JSON.stringify({op:'console',data:guestMessage+'\r',wait:.6})],{timeout:10000});
  await expect.poll(()=>output.toString('ascii'),{timeout:5000}).toContain(guestMessage+'\n');
  await expect.poll(()=>states.length).toBeGreaterThan(0);
  await expect(page.locator('.guest-xterm .xterm-rows')).toContainText(guestMessage);
  await page.screenshot({path:root+`/${name}-communications.png`});
  await page.locator('[data-disconnect]').click();
  await expect(page.locator('[data-serial-facts]')).toContainText('Current transport state unknown');
  const after=(await context.request.get(base+'/api/v1/terminals')).json();
  expect((await after)[0].connected).toBe(true);
  await page.locator('[data-connect]').click();
  await expect(page.locator('[data-serial-facts]')).toContainText('Observation · no input ownership');
  await page.locator('[data-disconnect]').click();
  records.push({engine:name,genuine_guest:true,guest_to_browser_hex:Buffer.from(guestMessage+'\n').toString('hex'),guest_to_browser_sha256:sha(guestMessage+'\n'),browser_text:incoming.trimEnd(),browser_return:'Explicit LF; CR alone remained buffered in this guest line discipline',guest_console_observed:true,visible_upper_ms:visibleMS,last_transport_sample:states.at(-1),browser_disconnect_preserved_attachment:true,explicit_reconnect_readonly:true});
  writeFileSync(root+'/browser-results.json',JSON.stringify(records,null,2)+'\n');
 } finally {await browser.close();}
}
console.log(JSON.stringify(records,null,2));
