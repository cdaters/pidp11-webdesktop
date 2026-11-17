import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SimulatedPanelAdapter} from '../src/model.ts';
import {paddleDefinitions,paddle,registerColor} from '../src/paddles.ts';
test('shared mechanical shapes keep hardware pigments separate from pose',()=>{
 assert.deepEqual(Array.from({length:22},(_,b)=>b).filter(b=>registerColor(b)==='red'),[3,4,5,9,10,11,15,16,17,21]);
 const defs=paddleDefinitions();
 for(const color of ['red','purple','cream'] as const) for(const pose of ['up','down','rest'] as const){
  assert(defs.includes(`id="p-${color}-${pose}"`));assert(paddle(color,pose,0,0).includes(`href="#p-${color}-${pose}"`));
 }
 assert(!defs.includes('animate'));
});
test('local momentaries return after three 50 ms ticks without altering memory semantics',()=>{
 const a=new SimulatedPanelAdapter();a.dispatch({type:'deposit'});assert.equal(a.snapshot().momentary,'deposit');
 a.tick();a.tick();assert.equal(a.snapshot().momentary,'deposit');a.tick();assert.equal(a.snapshot().momentary,'');assert.equal(a.snapshot().storedWords,1);
});
