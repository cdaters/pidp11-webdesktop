import { test } from "node:test";
import assert from "node:assert/strict";
import { Tek4010, tekFixture } from "../src/tek4010.ts";
test("4010 manual coordinate example, split addresses and dark initial vector", () => {
  const p = new Tek4010();
  // Manual figure 3-2: (0,31) = SP RUBOUT SP @. DEL is data in graph mode.
  p.feed(Uint8Array.from([29,32,127,32,64,56,108,63,95]));
  assert.deepEqual(p.marks, [{kind:"line",x1:0,y1:31,x2:1023,y2:780}]);
  const full = new Tek4010(); full.feed(tekFixture());
  for (let split = 0; split <= tekFixture().length; split++) {
    const partial = new Tek4010(), bytes = tekFixture();
    partial.feed(bytes.slice(0,split)); partial.feed(bytes.slice(split));
    assert.deepEqual(partial.marks, full.marks);
  }
});
test("4010 erase, text/graph transition, explicit unsupported input and storage bounds", () => {
  const p = new Tek4010(); p.feed(tekFixture());
  assert.equal(p.marks.filter(x=>x.kind==='line').length, 5);
  p.feed(Uint8Array.from([31,65])); assert.equal(p.marks.at(-1)?.kind,"text");
  p.feed(Uint8Array.from([27,12])); assert.equal(p.marks.length,0);
  for (const bytes of [[29,64],[128],[27,26]]) {
    assert.throws(()=>p.feed(Uint8Array.from(bytes)));
    assert.throws(()=>p.feed(Uint8Array.from([65])));
    p.reset();
  }
  p.feed(new Uint8Array(4096).fill(65));
  assert.throws(()=>p.feed(Uint8Array.from([65])));
  assert.equal(p.marks.length,4096);
  p.reset(); assert.throws(()=>p.feed(new Uint8Array(65537)));
});
