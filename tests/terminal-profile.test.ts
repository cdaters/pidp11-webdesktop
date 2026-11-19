import { test } from "node:test";
import assert from "node:assert/strict";
import { TerminalProfile } from "../src/terminal-profile.ts";
const bytes = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0));
test("VT52 positions across every split and leaves invalid row unchanged", () => {
  const input = "\x1bY%*X\x1bY~z!";
  const expected = "\x1b[6;11HX\x1b[6;80H!";
  for (let split = 0; split <= input.length; split++) {
    const p = new TerminalProfile("vt52");
    assert.equal(String(p.feed(bytes(input.slice(0, split))).display) + p.feed(bytes(input.slice(split))).display, expected);
  }
});
test("VT52 text, erase, reverse scroll, fills, ESC restart and no wrapping", () => {
  const p = new TerminalProfile("vt52");
  assert.equal(p.initial, "\x1b[?7l");
  p.feed(bytes("x".repeat(80)));
  assert.equal(p.feed(bytes("\t\r\t\x1b\x00\x7f\x1bH\x1bI\x1bJ\x1bK")).display, "\x1b[1;80H\r\x1b[1;9H\x1b[1;1H\x1bM\x1b[J\x1b[K");
  assert.deepEqual(p.feed(bytes("\x1bZ")).replies, ["\x1b/K"]);
  assert.throws(() => p.feed(new Uint8Array([128])));
  assert.throws(() => p.feed(new Uint8Array(65537)));
});
test("VT52 keys differ from VT100; new profile resets partial sequences and modes", () => {
  let p = new TerminalProfile("vt52");
  assert.equal(p.key("ArrowUp"), "\x1bA");
  assert.equal(p.key("F3"), "\x1bR");
  assert.equal(p.key("F4"), "");
  p.feed(bytes("\x1b="));
  assert.equal(p.key("Numpad0"), "\x1b?p");
  assert.equal(p.key("NumpadEnter"), "\x1b?M");
  p.feed(bytes("\x1bY"));
  p = new TerminalProfile("vt52");
  assert.equal(p.feed(bytes("A")).display, "A");
  assert.equal(p.key("Numpad0"), "0");
  const vt100 = new TerminalProfile("vt100");
  assert.equal(vt100.key("ArrowUp", true, true), "\x1bOA");
  assert.equal(vt100.key("Delete"), "\x7f");
  const raw = bytes("\x1b[2J");
  assert.equal(vt100.feed(raw).display, raw);
});
