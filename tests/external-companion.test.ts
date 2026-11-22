import test from "node:test";
import assert from "node:assert/strict";
import { companionOrigin } from "../src/external-companion.ts";
test("external navigation cannot carry credentials or desktop session links", () => {
  assert.throws(() => companionOrigin("https://127.0.0.1:8510/", "127.0.0.1"));
  assert.equal(
    companionOrigin("https://127.0.0.1:8510/"),
    "https://127.0.0.1:8510",
  );
  for (const url of [
    "http://localhost/",
    "javascript:alert(1)",
    "https://user:secret@example.test/",
    "https://example.test/?token=x",
    "https://example.test/#session",
    "https://example.test/api",
  ])
    assert.throws(() => companionOrigin(url));
});
