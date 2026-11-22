import { test } from "node:test";
import assert from "node:assert/strict";
import cases from "../internal/companion/retrieval-cases.json" with { type: "json" };
import { retrieveReferences } from "../src/companion-references.ts";
for (const example of cases)
  test(`Offline retrieval: ${example.query} (${example.system})`, () => {
    const got = retrieveReferences(example.query, example.system);
    assert.equal(got.status, example.status);
    assert.deepEqual(
      got.notes.map((note) => note.id),
      example.ids,
    );
  });
