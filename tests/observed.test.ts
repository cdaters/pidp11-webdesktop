import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ObservedPanelAdapter,
  type ObservedSnapshot,
} from "../src/observed.ts";
export function observedFixture(): ObservedSnapshot {
  return {
    source: "realcons-observation-lab",
    available: true,
    fresh: true,
    ageMs: 10,
    frame: {
      boot: "0000000000000001",
      seq: 1,
      capturedUnixMs: Date.now(),
      inputs: {
        SR: 123,
        LAMPTEST: 0,
        LOAD_ADRS: 0,
        EXAM: 0,
        DEPOSIT: 0,
        CONT: 0,
        HALT: 1,
        S_BUS_CYCLE: 0,
        START: 0,
        POWER: 1,
        PANEL_LOCK: 0,
        ADDR_SELECT: 4,
        DATA_SELECT: 2,
      },
      outputs: {
        ADDRESS: 123,
        DATA: 456,
        PARITY_HIGH: 0,
        PARITY_LOW: 0,
        PAR_ERR: 0,
        ADRS_ERR: 0,
        RUN: 0,
        PAUSE: 0,
        MASTER: 1,
        MMR0_MODE: 0,
        DATA_SPACE: 0,
        ADDRESSING_16: 1,
        ADDRESSING_18: 0,
        ADDRESSING_22: 0,
        ADDR_SELECT_FEEDBACK: 16,
        DATA_SELECT_FEEDBACK: 4,
      },
    },
  };
}
test("observer never invents available data or gains controls; validates complete banks", () => {
  const a = new ObservedPanelAdapter(() => {});
  try {
    assert(!a.available);
    assert(!a.fresh);
    a.accept(observedFixture());
    assert.equal(a.snapshot().data, 456);
    assert.equal(
      a.dispatch({ type: "pulse", control: "start" } as never).accepted,
      false,
    );
    const bad = observedFixture();
    delete bad.frame!.outputs.DATA;
    assert.throws(() => a.accept(bad));
    assert.equal(a.snapshot().data, 456);
    const stale = observedFixture();
    stale.fresh = false;
    stale.ageMs = 1000;
    a.accept(stale);
    assert(!a.fresh);
    assert.equal(a.snapshot().address, 123);
  } finally {
    a.close();
  }
});

test("queued old snapshots and future clock skew fail closed even if server says fresh", () => {
  const a = new ObservedPanelAdapter(() => {});
  try {
    for (const offset of [-2000, 2000]) {
      const s = observedFixture(); s.frame!.capturedUnixMs += offset;
      a.accept(s); assert(!a.fresh); assert(a.available);
    }
    a.accept(observedFixture()); assert(a.fresh);
  } finally { a.close(); }
});

test("observed simultaneous physical momentaries retain all input positions", () => {
 const a=new ObservedPanelAdapter(()=>{});
 try { const s=observedFixture();s.frame!.inputs.CONT=1;s.frame!.inputs.START=1;a.accept(s);assert.equal(a.snapshot().controls?.CONT,1);assert.equal(a.snapshot().controls?.START,1); } finally { a.close(); }
});
