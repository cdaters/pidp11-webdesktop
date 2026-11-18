// Short diagnostic samples of the Go bridge, not Raspberry Pi performance claims.
import {chromium,expect} from '@playwright/test';
import {readFileSync,writeFileSync,renameSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
const root=process.env.PIDP50_WORK??'.research/m50',base='https://127.0.0.1:8445';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function measure(){
 const id=randomBytes(8).toString('hex');writeFileSync(`${root}/request.tmp`,JSON.stringify({id,op:'measure'}));renameSync(`${root}/request.tmp`,`${root}/request.json`);
 for(let i=0;i<100;i++){await sleep(50);const r=JSON.parse(readFileSync(`${root}/response.json`,'utf8'));if(r.id===id){const stat=r.output.split('\n')[0].split(') ')[1].split(' ');return{time:performance.now(),ticks:Number(stat[11])+Number(stat[12]),rssKiB:Number(r.output.match(/VmRSS:\s+(\d+)/)[1]),threads:Number(r.output.match(/Threads:\s+(\d+)/)[1])};}}
 throw Error('Measurement timeout');
}
const results={description:'Go server only; network-none Linux ARM64 on Mac OrbStack; 100 ticks/second. Short samples, not Pi validation.',phases:[],commandLatencyMs:[]};
async function phase(name,work){const before=await measure();await work();const after=await measure();results.phases.push({name,seconds:(after.time-before.time)/1000,cpuPercentOneCore:100*(after.ticks-before.ticks)/100/((after.time-before.time)/1000),rssBeforeKiB:before.rssKiB,rssAfterKiB:after.rssKiB,threads:after.threads});}
await phase('no browser, two guest lines attached',()=>sleep(10000));
const browser=await chromium.launch();try{
 const context=await browser.newContext({ignoreHTTPSErrors:true});
 const r=await context.request.post(`${base}/api/v1/login`,{headers:{Origin:base},data:{token:readFileSync(`${root}/terminal.token`,'utf8').trim()}});expect(r.status()).toBe(200);
 const page=await context.newPage();await page.goto(base);await page.getByRole('button',{name:'Open Guest terminal',exact:true}).click();await page.getByLabel('Guest endpoint').selectOption('v7-dc0');await page.locator('[data-connect]').click();await expect(page.locator('.guest-heading')).toContainText('READ-ONLY');
 await phase('one read-only browser, idle',()=>sleep(10000));
 await page.locator('[data-acquire]').click();await expect(page.locator('[data-release]')).toBeEnabled();
 const screen=page.locator('.guest-xterm .xterm-rows');
 await phase('one keyboard owner, ten actual guest echo commands',async()=>{
  for(let i=0;i<10;i++){const marker='LAT_'+randomBytes(3).toString('hex');await page.locator('.guest-xterm textarea').focus();const start=performance.now();await page.keyboard.type(`echo ${marker}`);await page.keyboard.press('Enter');await expect.poll(async()=>((await screen.innerText()).match(new RegExp(marker,'g'))??[]).length,{timeout:15000,intervals:[20,40,80]}).toBeGreaterThanOrEqual(2);results.commandLatencyMs.push(performance.now()-start);await sleep(500);}
 });
 await context.close();await phase('browser closed, guest lines still attached',()=>sleep(10000));
}finally{await browser.close();}
writeFileSync(`${root}/measurements.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
