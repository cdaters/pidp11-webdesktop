import {test} from 'node:test';
import assert from 'node:assert/strict';
import {serialProfile,serialState,serialText} from '../src/serial-session.ts';
const profile={simulator:'isolated-instance-1',guest:'UNIX V7',controller:'DC11',unit:0,line:3,guest_device:'/dev/tty03',application:'/bin/cu',peer:'local peer',framing:'ascii7-raw-socket'};
test('serial identity rejects controller/line contradictions and malformed labels',()=>{
 assert.ok(serialProfile(profile));
 for(const patch of [{controller:'DH11'},{line:2},{unit:1},{line:16},{guest:'\nV7'},{simulator:''},{framing:'binary'},{peer:'x'.repeat(81)}]) assert.equal(serialProfile({...profile,...patch}),undefined);
});
test('transport accounting rejects imprecise, negative or excessive values',()=>{
 const sample={received:3,written:2,capped:false,pending:3,sample_unix_ms:100};
 assert.ok(serialState(sample));
 for(const patch of [{received:2**53},{written:-1},{pending:65537},{received:NaN},{capped:'no'},{sample_unix_ms:1.2}]) assert.equal(serialState({...sample,...patch}),undefined);
});
test('serial freshness and ownership never infer guest receipt or carrier',()=>{
 const p=serialProfile(profile)!;const sample=serialState({received:3,written:2,capped:false,pending:3,sample_unix_ms:100})!;
 assert.match(serialText(p,sample,true,false,0),/Observation · no input ownership/);
 assert.match(serialText(p,sample,true,true,3001),/Current transport state unknown/);
 assert.match(serialText(p,sample,true,true,-1),/Current transport state unknown/);
 assert.match(serialText(p,sample,false,true,0),/Disconnected · no input authority/);
 assert.match(serialText(p,sample,true,true,0),/do not prove guest receipt/);
 assert.match(serialText(p,undefined,true,false,0),/No transport counts received/);
});
