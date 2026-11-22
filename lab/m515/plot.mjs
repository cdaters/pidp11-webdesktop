// Genuine, one-shot V7 plot tracing. Failure stops the campaign; no command retry.
import {chromium, firefox, webkit, expect} from '@playwright/test';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {Tek4010} from '../../src/tek4010.ts';
import {harness, root} from '../m59/harness.mjs';
import {classifyPlot} from './plot-evidence.mjs';
if (!root.endsWith('/m515/v7')) throw Error('Explicit M5.15 disposable V7 required');
const runDirectory=root+'/plot-'+Date.now()+'-'+randomBytes(4).toString('hex');
mkdirSync(runDirectory,{mode:0o700});
console.log('Private plot evidence: '+runDirectory);
const fault=process.env.M515_PLOT_FAULT;
if(fault && fault!=='missing-input') throw Error('Unsupported diagnostic fault');
const results = [], base = 'https://127.0.0.1:8445';
for (const [name, engine] of Object.entries({chromium, firefox, webkit}).filter(([name])=>!fault || name==='chromium')) {
  const browser = await engine.launch();
  const frames = [], events = [], evidence = {browser:name, peripheralPhaseStarted:false};
  let page;
  try {
    await harness('detach', 'v7-dc0');
    await harness('attach', 'v7-dc0');
    const context = await browser.newContext({ignoreHTTPSErrors:true});
    expect((await context.request.post(base+'/api/v1/login', {headers:{Origin:base},
      data:{token:readFileSync(root+'/writer.token','utf8').trim()}})).status()).toBe(200);
    page = await context.newPage();
    page.on('websocket', ws => {
      ws.on('framereceived', f => {if(frames.length < 2000) frames.push({time:Date.now(), data:JSON.parse(f.payload.toString())});});
      ws.on('close', () => events.push({time:Date.now(),event:'websocket-close'}));
    });
    page.on('pageerror', error => events.push({time:Date.now(),event:'pageerror',message:error.message}));
    await page.goto(base);
    await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
    await page.getByLabel('Guest endpoint').selectOption('v7-dc0');
    await page.locator('[data-connect]').click();
    await page.locator('[data-acquire]').click();
    await expect(page.locator('[data-release]')).toBeEnabled();
    await page.locator('.guest-xterm textarea').focus();
    await page.keyboard.press('Enter');
    const screen=page.locator('.guest-xterm .xterm-rows');
    await expect.poll(()=>screen.innerText(),{timeout:15000}).toMatch(/login:|\$\s*$/);
    if((await screen.innerText()).includes('login:')) {
      await page.keyboard.type('dmr');await page.keyboard.press('Enter');
      await expect.poll(()=>screen.innerText()).toMatch(/\$\s*$/);
    }
    await page.locator('[data-disconnect]').click();
    await page.getByLabel('Guest terminal personality').selectOption('tek4010');
    await page.locator('[data-connect]').click();
    await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
    evidence.before=await harness('console','stty < /dev/tty00\r');
    await harness('console',"echo '0 0' > /tmp/m515p; echo '1 1' >> /tmp/m515p; echo '2 4' >> /tmp/m515p; echo '3 2' >> /tmp/m515p; echo '4 5' >> /tmp/m515p\r");
    const marker='M515'+randomBytes(4).toString('hex');
    const begin=marker+'B', end=marker+'E';
    evidence.dispatchedAt=Date.now();
    evidence.injectedFault=fault ?? null;
    const input=fault ? '/tmp/absent-'+marker : '/tmp/m515p';
    // tee preserves the guest pipeline bytes separately from the serial driver.
    const command=`echo ${begin}; graph -g 1 -l 'V7 GRAPH' < ${input} | plot -Ttek | tee /tmp/m515tek > /dev/tty00; echo ${end}\r`;
    let output=await harness('console',command,3);
    const deadline=Date.now()+15000;
    while(!new RegExp('(?:^|[\\r\\n])'+end+'[\\r\\n]').test(output) && Date.now()<deadline) output+=await harness('console','',1);
    writeFileSync(`${runDirectory}/${name}-console-private.txt`,output);
    evidence.beginObserved=new RegExp('(?:^|[\\r\\n])'+begin+'[\\r\\n]').test(output);
    evidence.endObserved=new RegExp('(?:^|[\\r\\n])'+end+'[\\r\\n]').test(output);
    await expect.poll(()=>page.locator('.guest-tek line').count(),{timeout:15000}).toBeGreaterThan(10);
    evidence.renderedLines=await page.locator('.guest-tek line').count();
    await expect(page.locator('.guest-tek')).toContainText('V7 GRAPH');
    evidence.guestByteCount=await harness('console','wc -c /tmp/m515tek\r');
  } catch(error) {
    evidence.failure=error.message;
    throw error;
  } finally {
    const since=evidence.dispatchedAt ?? Date.now();
    const raw=readFileSync(root+'/serial-private.jsonl','utf8').trim().split('\n').map(JSON.parse);
    evidence.serialBytes=raw.filter(e=>e.time*1000>=since && e.direction==='simh-to-bridge').reduce((n,e)=>n+Buffer.from(e.data,'base64').length,0);
    const parser=new Tek4010();
    const output=frames.filter(f=>f.time>=since && f.data.type==='output');
    evidence.websocketBytes=output.reduce((n,f)=>n+Buffer.from(f.data.data,'base64').length,0);
    try {for(const frame of output) parser.feed(Buffer.from(frame.data.data,'base64'));}
    catch(error){evidence.parserError=error.message;}
    evidence.parserLines=parser.marks.filter(mark=>mark.kind==='line').length;
    if(page) {
      evidence.renderedLines=await page.locator('.guest-tek line').count().catch(()=>0);
      evidence.finalStatus=await page.locator('.guest-status').innerText().catch(()=> 'unavailable');
    }
    evidence.classification=classifyPlot(evidence);
    writeFileSync(`${runDirectory}/${name}-frames-private.json`,JSON.stringify({frames,events}));
    results.push(evidence);
    writeFileSync(runDirectory+'/results.json',JSON.stringify(results,null,2)+'\n');
    await browser.close();
  }
  expect(evidence.classification).toBe('pass');
  console.log(name+': '+JSON.stringify(evidence));
}
