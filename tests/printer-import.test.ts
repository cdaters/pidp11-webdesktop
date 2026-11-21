import { test } from "node:test";
import assert from "node:assert/strict";
import { decodePrinterSpool } from "../src/printer-import.ts";
test("local printer snapshot preserves ASCII control bytes and refuses binary/oversized input", () => {
  const source = "V7 listing\r\n\tcolumn\fpage 2\b!";
  assert.equal(
    decodePrinterSpool(Uint8Array.from(source, (c) => c.charCodeAt(0))),
    source,
  );
  for (const value of [
    new Uint8Array(),
    new Uint8Array(16385),
    new Uint8Array([128]),
  ])
    assert.throws(() => decodePrinterSpool(value));
  assert.equal(
    decodePrinterSpool(new Uint8Array(16384).fill(65)).length,
    16384,
  );
});
