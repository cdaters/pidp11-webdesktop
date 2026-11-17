// Focused final-artifact retention diagnostic; this is not a timed soak.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const browser=await chromium.launch(),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 await page.goto('http://127.0.0.1:8080/');
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable');
 const sample=async label=>{
  await page.waitForTimeout(100);await cdp.send('HeapProfiler.collectGarbage');
  const m=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
  return {label,nodes:m.Nodes,heap:m.JSHeapUsedSize,listeners:m.JSEventListeners,connected:await page.evaluate(()=>document.querySelectorAll('*').length)};
 };
 await page.locator('.xterm').waitFor();
 await page.getByRole('button',{name:'Close DZ0 · DEC terminal',exact:true}).click();
 const samples=[await sample('baseline, no terminals')];
 for(let batch=0;batch<4;batch++){
  for(let i=0;i<15;i++){
   await page.getByRole('button',{name:'Open Terminal',exact:true}).click();await page.locator('.xterm').waitFor();
   await page.locator('[data-keyboard]').click();await page.locator('textarea.xterm-helper-textarea').focus();
   for(let j=0;j<10;j++){await page.keyboard.type('HELP');await page.keyboard.press('Enter')}
   await page.getByRole('button',{name:'Close DZ0 · DEC terminal',exact:true}).click();
  }
  samples.push(await sample(`${(batch+1)*15} terminal lifecycles, no terminals`));
 }
 const report={scope:'Final embedded build, accelerated 60 create/use/dispose cycles and 600 commands; post-GC no-terminal baseline comparison, not a second timed soak',samples,errors};
 report.status=!errors.length&&samples.at(-1).nodes<=samples[0].nodes+100&&samples.at(-1).heap<64*1024*1024?'PASS':'FAIL';
 writeFileSync('.research/m43-results/browser-retention.json',JSON.stringify(report,null,2)+'\n');console.log(report);
 if(report.status!=='PASS')throw Error('Terminal lifecycle retention budget');
}finally{await browser.close()}
