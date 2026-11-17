import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newer,requestFor} from '../src/remote.ts';
import type {RemoteState} from '../src/remote.ts';
import {displayedData} from '../src/panel.ts';
import {SimulatedPanelAdapter} from '../src/model.ts';
const state:RemoteState={...new SimulatedPanelAdapter().snapshot(),revision:10,controlRevision:4,epoch:2,owner:'a',reason:'test',blocked:false};
test('remote view rejects older state while allowing repeated full snapshots',()=>{assert.equal(newer(state,{...state,revision:9}),false);assert.equal(newer(state,{...state,revision:10}),true)});
test('latches send explicit levels; actions send pulses without replayable toggles',()=>{assert.deepEqual(requestFor({type:'halt'},state),{type:'set',control:'halt',value:0});assert.deepEqual(requestFor({type:'start'},state),{type:'pulse',control:'start'});assert.equal(requestFor({type:'reset'},state),null)});
test('all upstream selector ordinals survive UI mapping',()=>{for(let value=0;value<8;value++)assert.deepEqual(requestFor({type:'address-select',value},state),{type:'set',control:'address-select',value});for(let value=0;value<4;value++)assert.equal(requestFor({type:'data-select',value},state)?.value,value)});
test('HALT release stays stopped; consecutive memory commands advance; lamp test auto returns',()=>{const a=new SimulatedPanelAdapter();a.dispatch({type:'halt'});a.tick();assert.equal(a.snapshot().running,false);a.dispatch({type:'continue'});assert.equal(a.snapshot().running,true);a.dispatch({type:'halt'});const addr=a.snapshot().address;a.dispatch({type:'examine'});a.dispatch({type:'examine'});assert.equal(a.snapshot().address,addr+2);a.dispatch({type:'lamp-test'});for(let i=0;i<10;i++)a.tick();assert.equal(a.snapshot().lampTest,false)});

test('REALCONS data output is authoritative for every selector',()=>{
  const state={...new SimulatedPanelAdapter().snapshot(),source:'realcons-lab' as const,data:0o54321};
  for(let dataSelect=0;dataSelect<4;dataSelect++)assert.equal(displayedData({...state,dataSelect}),0o54321);
});
