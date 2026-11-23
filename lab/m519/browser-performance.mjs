// Chromium rendering fixture, not guest latency or Pi performance. ACK arrives
// only after the actual xterm renderer consumes a bounded output chunk.
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const outputPath = process.argv[2];
if (!outputPath) throw Error('Private result file required');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/api/v1/session',r=>r.fulfill({json:{capabilities:{'terminal.input':false},csrf:'fixture'}}));
  await page.route('**/api/v1/terminals',r=>r.fulfill({json:[{id:'performance',label:'Renderer fixture',connected:true}]}));
  let write, acknowledged=0;
  await page.routeWebSocket('**/api/v1/terminals/performance/ws',ws=>{
    write=data=>ws.send(JSON.stringify({type:'output',data:Buffer.from(data).toString('base64')}));
    ws.send(JSON.stringify({type:'state',connected:true,owner:false,epoch:1}));
    ws.onMessage(data=>{const f=JSON.parse(String(data));if(f.type==='ack')acknowledged+=f.bytes;});
  });
  await page.goto('http://127.0.0.1:5173');await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();
  await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
  const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
  const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]));
  await cdp.send('HeapProfiler.collectGarbage');const before=await metrics();
  const latencies=[];let total=0;
  for(let n=0;n<80;n++){
    const chunk=Array.from({length:24},(_,i)=>`M519 ${n} ${i} `+'TEXT '.repeat(12)+'\r\n').join('');
    total+=chunk.length;const start=performance.now();write(chunk);
    const deadline=start+5000;
    while(acknowledged<total){if(performance.now()>deadline)throw Error('Renderer ACK timeout');await new Promise(r=>setTimeout(r,1));}
    latencies.push(performance.now()-start);
  }
  await cdp.send('HeapProfiler.collectGarbage');const after=await metrics();
  const sorted=latencies.toSorted((a,b)=>a-b);
  const result={kind:'intercepted Chromium rendering fixture, Mac host',chunks:80,lines:1920,bytes:total,
    ackMilliseconds:{median:sorted[40],p95:sorted[75],max:sorted.at(-1)},
    retainedHeapBytes:{before:before.JSHeapUsedSize,after:after.JSHeapUsedSize,delta:after.JSHeapUsedSize-before.JSHeapUsedSize},
    taskCPUSeconds:after.TaskDuration-before.TaskDuration,
    visibleRows:await page.locator('.guest-xterm .xterm-rows > div').count(),
    limits:'80x24 / 300 scrollback; no guest or network latency claim'};
  expect(result.visibleRows).toBe(24);writeFileSync(outputPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();}
