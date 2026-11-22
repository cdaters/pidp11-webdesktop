import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,renameSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {classifyPlot} from './plot-evidence.mjs';
import {acquireCampaign} from './campaign.mjs';

test('plot acceptance requires every observed boundary, never peripheral progress',()=>{
 const complete={beginObserved:true,endObserved:true,serialBytes:440,websocketBytes:440,parserLines:22,renderedLines:22};
 assert.equal(classifyPlot(complete),'pass');
 for(const change of [{beginObserved:false},{endObserved:false},{serialBytes:0},{websocketBytes:0},{parserError:'bad stream'},{parserLines:0},{renderedLines:0},{parserLines:undefined,renderedLines:undefined},{parserLines:NaN},{renderedLines:undefined},{serialBytes:-1},{websocketBytes:NaN},{failure:'Expected graph label missing'}]) {
  assert.notEqual(classifyPlot({...complete,...change,peripheralPhaseStarted:true}),'pass');
 }
});

test('a second campaign cannot dispatch; stale or replaced locks are preserved',()=>{
 const root=mkdtempSync(join(tmpdir(),'pidp-campaign-'));
 try {
  const release=acquireCampaign(root);
  assert.throws(()=>acquireCampaign(root),/locked/);
  release();
  const second=acquireCampaign(root);
  renameSync(root+'/.campaign.lock',root+'/saved.lock');
  writeFileSync(root+'/.campaign.lock','replacement evidence');
  assert.throws(second,/changed/);
  assert.equal(readFileSync(root+'/.campaign.lock','utf8'),'replacement evidence');
  rmSync(root+'/.campaign.lock');
  writeFileSync(root+'/.campaign.lock','stale evidence');
  assert.throws(()=>acquireCampaign(root),/locked/);
  assert.equal(readFileSync(root+'/.campaign.lock','utf8'),'stale evidence');
 } finally {rmSync(root,{recursive:true});}
});
