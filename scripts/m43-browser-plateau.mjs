// Accelerated retention diagnostic: 7,200 workload steps, without clock pacing.
// Separate cold-growth and steady-state assessments; not a latency/CPU soak.
import { chromium, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const seconds=7200;
if(!Number.isInteger(seconds)||seconds<30||seconds>7200) throw Error('bounded duration required');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')errors.push(e.text())});
try {
 await page.goto('http://127.0.0.1:8080/');
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'Open Terminal',exact:true}).click();
 const focus=async n=>page.getByRole('button',{name:`Restore DZ${n-1} · DEC terminal`,exact:true}).click();
 for(let n=1;n<=4;n++){await focus(n);await page.locator(`[data-window="terminal-${n}"] [data-keyboard]`).click()}
 await page.getByRole('button',{name:'Arrange terminals',exact:true}).click();
 // Toolbar creation precedes lazy xterm mounting and its asynchronous writes.
 // Measure a fully rendered four-terminal baseline, not partial initialization.
 for(let n=1;n<=4;n++)await expect(page.locator(`[data-window="terminal-${n}"] .xterm-rows`)).toContainText('LOCAL TERMINAL FIXTURE');
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');await cdp.send('HeapProfiler.collectGarbage');
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
 const before=await metrics(),samples=[],latency=[],switchLatency=[];let commands=0,lifecycle=0,media=0;
 const start=performance.now();
 for(let i=0;i<seconds;i++) {
   // One full idle minute per five-minute phase; no terminal input during idle.
   if(i%300<240) {
    const n=i%4+1;await focus(n);await page.locator(`[data-window="terminal-${n}"] textarea.xterm-helper-textarea`).focus();
    const t=performance.now();await page.keyboard.type(i%10===0?'ANSI':'HELP');await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');
    await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));latency.push(performance.now()-t);commands++;
   }
   if(i%60===0) {
    await page.getByRole('button',{name:'Open Front panel',exact:true}).click();
    const t=performance.now();await page.locator('#switch-0').click();await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));switchLatency.push(performance.now()-t);
    await focus(4);await page.getByRole('button',{name:'Close DZ3 · DEC terminal',exact:true}).click();
    await page.getByRole('button',{name:'Open Terminal',exact:true}).click();await page.locator('[data-window="terminal-4"] [data-keyboard]').click();lifecycle++;
    await page.getByRole('button',{name:'Open Disk drives',exact:true}).click();await page.locator('[data-mount="RL0"]').click();await page.locator('[data-eject="RL0"]').click();await page.getByRole('button',{name:'Close Disk drives',exact:true}).click();media++;
    await page.getByRole('button',{name:'Arrange terminals',exact:true}).click();
    await cdp.send('HeapProfiler.collectGarbage'); samples.push({...await metrics(), connected:await page.evaluate(()=>document.querySelectorAll('*').length), terminalNodes:await page.locator('.terminal-host').evaluateAll(xs=>xs.map(x=>({elements:x.querySelectorAll('*').length,text:x.textContent.length,live:x.querySelector('.live-region')?.childNodes.length}))) }); console.log('Accelerated step',i,'nodes',samples.at(-1).Nodes);
   }
   await new Promise(r=>setTimeout(r,0));
 }
 const after=await metrics();await cdp.send('HeapProfiler.collectGarbage');const retained=await metrics();
 const p95=a=>a.sort((a,b)=>a-b)[Math.floor(a.length*.95)];
 const report={scope:'Accelerated Mac Chromium retention diagnostic; 7200 workload steps without wall-clock pacing, 5760 mock commands and 120 lifecycle/media cycles. No guest, Pi, or simultaneous REALCONS workload.',seconds:(performance.now()-start)/1000,commands,lifecycle,media,heap_before_gc:before.JSHeapUsedSize,heap_after_gc:retained.JSHeapUsedSize,heap_peak:Math.max(...samples.map(s=>s.JSHeapUsedSize)),dom_start:before.Nodes,dom_end:retained.Nodes,samples,errors};
 report.initial_budget_status=errors.length||retained.JSHeapUsedSize>64*1024*1024||retained.Nodes>before.Nodes+2000?'FAIL':'PASS';
 const settled=samples.slice(30);
 report.plateau_nodes={min:Math.min(...settled.map(s=>s.Nodes)),max:Math.max(...settled.map(s=>s.Nodes))};
 report.plateau_connected={min:Math.min(...settled.map(s=>s.connected)),max:Math.max(...settled.map(s=>s.connected))};
 report.status=!errors.length&&retained.JSHeapUsedSize<=64*1024*1024&&report.plateau_nodes.max-report.plateau_nodes.min<=50&&report.plateau_connected.max-report.plateau_connected.min<=50?'PASS':'FAIL';
 writeFileSync('.research/m43-results/browser-plateau.json',JSON.stringify(report,null,2)+'\n');
 if(report.status!=='PASS')throw Error('Steady-state retention diagnostic failed');
 console.log(JSON.stringify({...report,samples:undefined}));
}finally{await browser.close()}
