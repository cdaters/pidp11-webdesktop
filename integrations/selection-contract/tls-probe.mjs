// Invoked only by the opt-in Go test against its disposable trusted TLS server.
import assert from 'node:assert/strict';
import {createSelectionClient} from './client.mjs';
const chunks=[];
for await(const chunk of process.stdin) chunks.push(chunk);
const config=JSON.parse(Buffer.concat(chunks).toString());
const client=createSelectionClient(config);
let selection={endpoint:'line',generation:'attachment',simulator_generation:'sim',viewer_revision:1,text:'EXPLICIT FIXTURE'};
const outcomes=[];
async function call(path,method='GET',token=config.readToken,body,headers={}) {
 return fetch(config.origin+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...headers},
  body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(5000)});
}
const control=async operation=>assert.equal((await call('/test/'+operation,'POST')).status,204);
await client.capabilities();
const status=await (await call('/api/pidp11/status')).json();
assert.equal(status.os,null);assert.equal(status.running,null);assert.equal(status.cpu_running,'unknown');
assert.equal(status.attachment_confirmed,true);
outcomes.push('trusted TLS; explicit unknown OS/CPU');
let receipt=await client.publish(selection,{previewConfirmed:true});
assert.equal((await client.read(receipt)).text,selection.text);
assert.equal((await call('/api/pidp11/screen','GET',config.publicationToken)).status,401);
assert.equal((await call('/api/pidp11/selection','DELETE')).status,403);
assert.equal((await call('/api/pidp11/status','GET',config.readToken,undefined,{Origin:'https://browser.invalid'})).status,403);
for(const path of ['keys','shell','console','monitor','panel','start','switch']) {
 const response=await call('/api/pidp11/'+path);
 assert.ok([403,404].includes(response.status));assert.ok(!(await response.text()).includes(selection.text));
}
outcomes.push('credential/origin separation; no machine authority');
// Two independently constructed callers share one server-side slot. A fresh
// publication invalidates the first receipt even when its text is identical.
const secondPage = createSelectionClient(config);
const secondReceipt = await secondPage.publish(selection, {previewConfirmed:true});
assert.notEqual(secondReceipt, receipt);
await assert.rejects(client.read(receipt));
assert.equal((await secondPage.read(secondReceipt)).text, selection.text);
// Pin the compatibility exception honestly: the legacy route permits an absent
// receipt. New consumers still must supply and verify their exact receipt.
assert.equal((await call('/api/pidp11/screen')).status, 200);
await client.revoke();
await assert.rejects(secondPage.read(secondReceipt));
receipt = await client.publish(selection, {previewConfirmed:true});
outcomes.push('two authenticated callers; identical-text replacement; global revoke; legacy receipt exception');

await assert.rejects(client.read('b'.repeat(32)));
await client.revoke();await assert.rejects(client.read(receipt));
const epoch=(await (await call('/api/pidp11/status')).json()).publication_epoch;
await client.revoke();
assert.equal((await call('/api/pidp11/selection','POST',config.publicationToken,{consent:true,selection,publication_epoch:epoch})).status,409);
outcomes.push('receipt substitution, revocation and delayed old epoch refused');
const concurrentEpoch=(await (await call('/api/pidp11/status')).json()).publication_epoch;
const publications=await Promise.all(['one','two'].map(text=>call('/api/pidp11/selection','POST',config.publicationToken,
 {consent:true,selection:{...selection,text},publication_epoch:concurrentEpoch})));
assert.deepEqual(publications.map(r=>r.status).sort(),[204,409]);
outcomes.push('concurrent HTTP publishers consume one epoch');
receipt=await client.publish(selection,{previewConfirmed:true});
await control('expire');await assert.rejects(client.read(receipt));
receipt=await client.publish(selection,{previewConfirmed:true});
await control('disconnect');await assert.rejects(client.read(receipt));
await assert.rejects(client.publish(selection,{previewConfirmed:true}));
await control('reconnect');await assert.rejects(client.read(receipt));
await assert.rejects(client.publish(selection,{previewConfirmed:true}));
selection={...selection,viewer_revision:2};
receipt=await client.publish(selection,{previewConfirmed:true});
const oldEpoch=(await (await call('/api/pidp11/status')).json()).publication_epoch;
await control('restart');await assert.rejects(client.read(receipt));
assert.equal((await call('/api/pidp11/selection','POST',config.publicationToken,{consent:true,selection,publication_epoch:oldEpoch})).status,409);
outcomes.push('expiry, browser-lifetime loss and adapter restart retire consent');
for(const body of ['{','{} {}',JSON.stringify({extra:'private-canary'}),'x'.repeat(7000)]) {
 const response=await fetch(config.origin+'/api/pidp11/selection',{method:'POST',headers:{Authorization:'Bearer '+config.publicationToken},body});
 assert.equal(response.status,400);assert.ok(!(await response.text()).includes('private-canary'));
}
await assert.rejects(client.read('a'.repeat(32),{signal:AbortSignal.abort()}));
outcomes.push('malformed/oversized HTTP publications and cancellation refused');
console.log(JSON.stringify({realTLS:true,guestOrModel:false,independentAudit:false,outcomes}));
