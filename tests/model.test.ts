import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedPanelAdapter, ADDRESS_MASK } from '../src/model.ts';

test('deterministic activity, halt and step', () => {
  const a = new SimulatedPanelAdapter(), b = new SimulatedPanelAdapter();
  for(const model of [a,b]){model.dispatch({type:'halt'});model.dispatch({type:'continue'});}
  for (let i = 0; i < 20; i++) { a.tick(); b.tick(); }
  assert.deepEqual(a.snapshot(), b.snapshot());
  a.dispatch({ type: 'halt' }); const before = a.snapshot();
  a.tick(); assert.deepEqual(a.snapshot(), before);
  a.dispatch({ type: 'continue' }); assert.equal(a.snapshot().address, before.address + 2);
  assert.equal(a.snapshot().halted, true);
});
test('all 22 switches are independently usable and invalid bits rejected', () => {
  const a = new SimulatedPanelAdapter(); a.dispatch({ type: 'register', value: 0 });
  for (let bit = 0; bit < 22; bit++) a.dispatch({ type: 'switch', bit });
  assert.equal(a.snapshot().switchRegister, ADDRESS_MASK);
  assert.equal(a.dispatch({ type: 'switch', bit: 22 }).accepted, false);
});
test('load, deposit and examine round-trip a word without changing other addresses', () => {
  const a = new SimulatedPanelAdapter();
  a.dispatch({type:'halt'});assert.equal(a.dispatch({ type: 'deposit' }).accepted, false);a.dispatch({type:'halt'});
  a.dispatch({ type: 'register', value: 0o1001 });
  a.dispatch({ type: 'load' }); assert.equal(a.snapshot().address, 0o1000);
  a.dispatch({ type: 'register', value: 0o177777 }); a.dispatch({ type: 'deposit' });
  a.dispatch({ type: 'continue' }); assert.notEqual(a.snapshot().data, 0o177777);
  a.dispatch({ type: 'register', value: 0o1000 }); a.dispatch({ type: 'load' });
  a.dispatch({ type: 'examine' }); assert.equal(a.snapshot().data, 0o177777);
});
test('wraps at 22 bits, truncates data, validates register input', () => {
  const a = new SimulatedPanelAdapter();
  a.dispatch({ type: 'register', value: ADDRESS_MASK }); a.dispatch({ type: 'load' });
  a.dispatch({ type: 'deposit' }); assert.equal(a.snapshot().data, 0xffff);
  a.dispatch({ type: 'continue' }); assert.equal(a.snapshot().address, 0);
  for (const value of [-1, NaN, Infinity, 1.5, ADDRESS_MASK + 1])
    assert.equal(a.dispatch({ type: 'register', value }).accepted, false);
});
test('lamp test preserves CPU demonstration state; reset clears scratch data', () => {
  const a = new SimulatedPanelAdapter();
  const before = a.snapshot(); a.dispatch({ type: 'lamp-test' });
  assert.equal(a.snapshot().address, before.address); assert.equal(a.snapshot().lampTest, true);
  a.dispatch({ type: 'deposit' }); a.dispatch({ type: 'reset' });
  assert.equal(a.snapshot().storedWords, 0); assert.equal(a.snapshot().lampTest, false);
});
test('snapshots immutable, subscription removable, rejected commands do not publish', () => {
  const a = new SimulatedPanelAdapter(); let calls = 0;
  const off = a.subscribe(s => { assert.equal(Object.isFrozen(s), true); calls++; });
  a.dispatch({ type: 'register', value: -1 }); assert.equal(calls, 1);
  a.dispatch({type:'register',value:42}); assert.equal(calls, 2); off(); a.dispatch({type:'register',value:43}); assert.equal(calls, 2);
});
test('selector ranges and start keep HALT semantics', () => {
  const a = new SimulatedPanelAdapter();
  a.dispatch({ type: 'register', value: 0o2000 }); a.dispatch({type:'load'});a.dispatch({type:'register',value:0o7777}); a.dispatch({ type: 'start' });
  assert.equal(a.snapshot().halted, true); assert.equal(a.snapshot().address, 0o2000);
  assert.equal(a.dispatch({ type: 'data-select', value: 4 }).accepted, false);
  a.dispatch({ type: 'address-select', value: 7 }); assert.equal(a.snapshot().addressSelect, 7);
});
