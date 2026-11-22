import test from "node:test";
import assert from "node:assert/strict";
import { parseClaimReview } from "../src/claim-review.ts";

test("claim annotations are bounded data, not arbitrary model fields", () => {
  assert.equal(parseClaimReview([{ text: "A claim", status: "unverified" }]).length, 1);
  for (const value of [null, {}, [{ text: "x", status: "certified" }], [{ text: "x", status: "supported", reference: "invented" }], Array(33).fill({text:"x",status:"unverified"}), [{text:"x".repeat(8193),status:"unverified"}]]) {
    assert.throws(() => parseClaimReview(value));
  }
});

test("fragment annotations remain explicitly scoped and reject invented scopes", () => {
  const value = {text:"uses 16-bit virtual addresses", status:"supported", scope:"recognized-fragment", reference:"1170-addresses"};
  assert.equal(parseClaimReview([value])[0].scope, "recognized-fragment");
  assert.throws(() => parseClaimReview([{...value, scope:"whole-answer-certified"}]));
});
