// Short, local maximum-queue fixtures; not a hardware or sustained benchmark.
import {chromium} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const browser=await chromium.launch();
try {
 const page=await browser.newPage();await page.goto('http://127.0.0.1:5173/');
 const result=await page.evaluate(async()=>{
  const {paginateSpool,PaperViewer}=await import('/src/printer.ts');
  const {VirtualDevices}=await import('/src/devices.ts');
  const measurements=[];
  for(const [label,text] of [['dense','COLUMN A     COLUMN B     COLUMN C\n'.repeat(500).slice(0,16384)],['blank lines','\n'.repeat(16384)],['form feeds','\f'.repeat(16384)]]){
   const d=new VirtualDevices();for(let i=0;i<32;i++)d.queue('bounded fixture',text);d.print();
   const raw=d.spool(),start=performance.now(),parsed=paginateSpool(raw),parseMs=performance.now()-start;
   const host=document.createElement('div'),status=document.createElement('span');host.className='paper-viewport';host.style.cssText='height:600px;width:900px;position:fixed;top:0';document.body.append(host);
   const viewer=new PaperViewer(host,status),renderStart=performance.now();viewer.update(raw);const updateMs=performance.now()-renderStart;
   measurements.push({label,spoolCodeUnits:raw.length,pages:parsed.pageCount,storedInkRows:parsed.rows.size,parseMs,updateMs,mountedRows:host.querySelectorAll('.paper-line').length,scrollHeight:host.scrollHeight});viewer.dispose();host.remove();
  }
  return{environment:'One Chromium run on the development Mac; not Pi measurements or sustained benchmarks',measurements};
 });
 writeFileSync('docs/printer-m432-measurements.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
} finally {await browser.close();}
