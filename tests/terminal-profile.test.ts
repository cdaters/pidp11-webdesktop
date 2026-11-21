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
test("VT220 identity, editing keys, C1 input and bounded sequences differ from VT100", () => {
  const text = "\x1b[0c\x1b[>c\x1b F\x1b[62;1\"p\x9b2J\x1b(0q";
  for (let split = 0; split <= text.length; split++) {
    const p = new TerminalProfile("vt220");
    const a = p.feed(bytes(text.slice(0,split))), b = p.feed(bytes(text.slice(split)));
    assert.equal(String(a.display) + b.display, "\x1b[!p\x1b[2J\x1b(0q");
    assert.deepEqual([...a.replies,...b.replies], ["\x1b[?62c","\x1b[>1;0;0c"]);
  }
  const p = new TerminalProfile("vt220");
  assert.equal(p.key("Delete"), "\x1b[3~");
  assert.equal(p.key("Home"), "\x1b[1~");
  assert.equal(p.key("F6"), "\x1b[17~");
  assert.throws(()=>p.feed(bytes("\x1b G")), /8-bit/);
  assert.throws(()=>new TerminalProfile("vt220").feed(bytes("\x1b["+"1".repeat(128))), /limit/);
  assert.throws(()=>new TerminalProfile("vt220").feed(bytes("\x1bPsecret")), /strings/);
  assert.equal(new TerminalProfile("vt220").feed(bytes("\x1b[12\x18OK")).display,"OK");
});
test("Teletype paper keeps CR/LF distinct, overprints, bounds history and never executes escapes", () => {
  const p = new TerminalProfile("asr33");
  assert.equal(p.feed(bytes("abc\rZ\nq\x07\x1b[2J")).display,"ABC\rZ\nQ[2J");
  assert.equal(p.paper.text,"ZBC\n Q[2J");
  assert.equal(p.paper.bells,1);
  assert.equal(p.key("ArrowUp"), "");
  p.feed(bytes("\r"+"x".repeat(1000)));
  assert.equal(p.paper.lines.at(-1)?.length,72);
  p.feed(bytes("\n".repeat(1000)));
  assert.equal(p.paper.lines.length,512);
  assert.ok(p.paper.discardedLines>0);
  assert.equal(new TerminalProfile("asr33").paper.text,"");
});
