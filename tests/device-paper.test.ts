import { test } from "node:test";
import assert from "node:assert/strict";
import { paginateSpool } from "../src/printer.ts";
test("observed printer CR returns carriage, LF advances and partial rows survive", () => {
  const spool = "ABC\rZ\nQ\fLAST";
  const page = paginateSpool(spool, true);
  assert.equal(page.rows.get(0), "ZBC");
  assert.equal(page.rows.get(1), "Q");
  assert.equal(page.rows.get(66), "LAST");
  assert.equal(paginateSpool("ABC\rZ").rows.get(1), "Z"); // Preserve accepted simulated semantics.
});
