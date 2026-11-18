import { test } from "node:test";
import assert from "node:assert/strict";
import { paginateSpool, diagnosticPrinterSample, shortPrinterSample } from "../src/printer.ts";
import { VirtualDevices } from "../src/devices.ts";

test("paper preserves spaces, blank lines, tab stops and CRLF without modifying data", () => {
  const raw = "  ONE\tTWO\n\n\tTHREE\r\nFOUR\rFIVE";
  const p = paginateSpool(raw);
  assert.equal(p.rows.get(0), "  ONE   TWO");
  assert.equal(p.rows.get(1), undefined);
  assert.equal(p.rows.get(2), "        THREE");
  assert.equal(p.rows.get(3), "FOUR");
  assert.equal(p.rows.get(4), "FIVE");
  assert.equal(p.maxColumns, 13);
});
test("66-row pagination and explicit form feeds retain blank page advances", () => {
  const p = paginateSpool("A\f\fB\nC");
  assert.equal(p.pageCount, 3);
  assert.deepEqual([...p.rows], [[0,"A"],[132,"B"],[133,"C"]]);
  const boundary = paginateSpool("\n".repeat(66) + "LAST");
  assert.equal(boundary.pageCount, 2); assert.equal(boundary.rows.get(66), "LAST");
  assert.equal(paginateSpool("").pageCount, 1);
  assert.equal(paginateSpool("\f").pageCount, 2);
  assert.equal(paginateSpool("X".repeat(200)).maxColumns, 200);
});
test("queue lifecycle, exact download spool and limits survive presentation", () => {
  const d = new VirtualDevices();
  d.queue("one", shortPrinterSample); d.queue("two", "\tA\r\n\fB\n");
  assert.equal(d.spool(), ""); d.print();
  const expected = `--- one ---\n${shortPrinterSample}\n\f\n--- two ---\n\tA\r\n\fB\n`;
  assert.equal(d.spool(), expected); paginateSpool(d.spool()); assert.equal(d.spool(), expected);
  d.print(); assert.equal(d.spool(), expected);
  d.clear(); assert.equal(d.spool(), ""); assert.equal(d.jobs.length, 0);
  assert.throws(() => d.queue("oversize", "x".repeat(16385)));
  for(let i=0;i<32;i++) d.queue("limit", "x".repeat(16384));
  assert.throws(() => d.queue("full", "")); d.print();
  const p=paginateSpool(d.spool()); assert.equal(p.pageCount,32); assert.equal(d.jobs.length,32);
});
test("worst-case form feeds remain sparse; sample stays within existing job limit", () => {
  const p=paginateSpool("\f".repeat(32*16384));
  assert.equal(p.rows.size,0); assert.equal(p.pageCount,524289);
  const sample=diagnosticPrinterSample(); assert(sample.length<=16384);
  assert(paginateSpool(sample).pageCount>=3);
});
