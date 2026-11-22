import test from "node:test";
import assert from "node:assert/strict";
import { factAnswer } from "../src/tutor-facts.ts";
import facts from "../internal/companion/facts.json" with { type: "json" };
import references from "../internal/companion/references.json" with { type: "json" };

test("source facts resolve explicit identities without interpreting ambiguous questions", () => {
  assert.equal(factAnswer("How large is the address space?"), null);
  assert.match(factAnswer("/fact virtual-address")!.text, /16-bit/);
  assert.match(factAnswer("/fact deferred-increment")!.text, /by two/);
  assert.match(factAnswer("/fact movb-register")!.text, /sign-extends/);
  assert.throws(() => factAnswer("/fact imaginary"));
  assert.throws(() => factAnswer("/fact registers execute something"));
  assert.equal(new Set(facts.map((f) => f.id)).size, facts.length);
  for (const fact of facts)
    assert.ok(references.some((n) => n.id === fact.reference));
});
