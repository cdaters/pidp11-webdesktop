import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePDPValue, describePDPValue } from "../src/pdp11-values.ts";
test("Exact words, prefixes, leading zeroes and signed boundaries", () => {
  const word = describePDPValue("177776", 8, 16);
  assert.equal(word.unsigned, "65534");
  assert.equal(word.hex, "FFFE");
  assert.equal(word.signed16, "-2");
  assert.equal(parsePDPValue("017", 10, 16), 17n);
  assert.equal(parsePDPValue("0o017", 8, 16), 15n);
  assert.equal(describePDPValue("177777", 8, 16).signed16, "-1");
  for (const [input, expected] of [
    ["-32768", 32768n],
    ["32767", 32767n],
    ["-1", 65535n],
  ] as const)
    assert.equal(parsePDPValue(input, 10, 16, true), expected);
  assert.equal(parsePDPValue("17777777", 8, 22), 4194303n);
  assert.equal(parsePDPValue("377", 8, 8), 255n);
  assert.deepEqual(describePDPValue("100001", 8, 16, false, "1").bits, [0, 15]);
  assert.equal(
    describePDPValue("100001", 8, 16, false, "1").maskedOctal,
    "000001",
  );
});
test("Reject invalid digits, signs, fractional input, overflow and ambiguous prefixes", () => {
  for (const value of [
    "178000",
    "-1",
    "+1",
    "1.5",
    "0xFF",
    "",
    "200000",
    "1e3",
  ])
    assert.throws(() => parsePDPValue(value, 8, 16));
  assert.throws(() => parsePDPValue("32768", 10, 16, true));
  assert.throws(() => parsePDPValue("-32769", 10, 16, true));
  assert.throws(() => parsePDPValue("20000000", 8, 22));
  assert.throws(() => parsePDPValue("400", 8, 8));
  assert.throws(() => describePDPValue("1", 8, 16, false, "8"));
});
