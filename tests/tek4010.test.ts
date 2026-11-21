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
  for (const bytes of [[29,64],[128],[27,113]]) {
    assert.throws(()=>p.feed(Uint8Array.from(bytes)));
    assert.throws(()=>p.feed(Uint8Array.from([65])));
    p.reset();
  }
  p.feed(new Uint8Array(4096).fill(65));
  assert.throws(()=>p.feed(Uint8Array.from([65])));
  assert.equal(p.marks.length,4096);
  p.reset(); assert.throws(()=>p.feed(new Uint8Array(65537)));
});

test("4010 compressed fields retain coordinates across every byte boundary", () => {
  const data=Uint8Array.from([29,33,98,34,67,68,99,69,100,35,70,34,101,36,71]);
  const full=new Tek4010(); full.feed(data);
  assert.deepEqual(full.marks.at(-1), {kind:"line",x1:102,y1:36,x2:135,y2:69});
  for(let split=0;split<=data.length;split++){
    const p=new Tek4010();p.feed(data.slice(0,split));p.feed(data.slice(split));assert.deepEqual(p.marks,full.marks);
  }
});
test("4010 GIN is explicit, bounded and cleared by reset", () => {
  const p=new Tek4010();p.feed(Uint8Array.from([27,26]));assert.equal(p.gin,true);
  assert.equal(p.ginReply(1023,780,"A"),"A"+String.fromCharCode(63,63,56,44));
  assert.throws(()=>p.ginReply(0,0));p.feed(Uint8Array.from([27,26]));p.reset();assert.equal(p.gin,false);
});
test("V7 4014 extra bits downsample to ten-bit coordinates, with incremental label movement", () => {
  const p=new Tek4010();
  p.feed(Uint8Array.from([29,33,96,98,34,67,68,30,32,65,68,31,65]));
  assert.deepEqual(p.marks[0],{kind:"line",x1:67,y1:34,x2:68,y2:34});
  assert.deepEqual(p.marks[1],{kind:"text",x:68.25,y:34.25,value:"A"});
  p.feed(Uint8Array.from([27,97,29,33,98,34,67,68]));
  assert.equal(p.marks.at(-1)?.kind,"line");
  assert.equal((p.marks.at(-1) as {style:string}).style,"1 3");
});
