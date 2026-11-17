import { test } from "node:test";
import assert from "node:assert/strict";
import xterm from "@xterm/xterm";
import { decKey, MockInputFilter, TerminalChannel, TerminalDecoder, TelnetNVT } from "../src/terminal-protocol.ts";
const { Terminal } = xterm;
const vectors: [string, string, string[]][] = [
  ["G0", "\x1b(0lqk\r\nx x\r\nmqj\x1b(B", ["┌─┐", "│ │", "└─┘"]],
  ["G1", "\x1b)0\x0elqk\x0fABC", ["┌─┐ABC"]],
  ["CUP", "\x1b[3;4HX\x1b[2A\x1b[2CY", ["      Y", "", "   X"]],
  ["defaults", "\x1b[4;6HX\x1b[H!\x1b[0;0H?", ["?", "", "", "     X"]],
  ["margins", "\x1b[1;1HA\x1b[2;1HB\x1b[3;1HC\x1b[4;1HD\x1b[5;1HE\x1b[2;4r\x1b[4;1H\nZ", ["A", "C", "D", "Z", "E"]],
  ["origin", "\x1b[2;4r\x1b[?6h\x1b[1;1HX\x1b[3;2HY", ["", "X", "", " Y"]],
  ["wrap", "1234567890X", ["1234567890", "X"]],
  ["no wrap", "\x1b[?7l1234567890X", ["123456789X"]],
  ["CR LF", "ABC\nD\rE", ["ABC", "E  D"]],
  ["BS", "ABC\bZ", ["ABZ"]],
  ["DEL", "ABC\x7fZ", ["ABCZ"]],
  ["save restore", "\x1b[2;3H\x1b7\x1b[4;5HX\x1b8Y", ["", "  Y", "", "    X"]],
  ["insert", "ABCDE\x1b[1;3H\x1b[2@XY", ["ABXYCDE"]],
  ["delete", "ABCDE\x1b[1;2H\x1b[2P", ["ADE"]],
  ["protection", '\x1b[1"qA\x1b[0"qB\x1b[1;1H\x1b[?2K', ["A"]],
  ["reverse index", "A\r\nB\x1b[H\x1bMZ", ["Z", "A", "B"]],
];
for (const [id, input, expected] of vectors) test(`xterm6 ${id}: every split preserves parser state`, async () => {
  for (let split = 0; split <= input.length; split++) {
    const t = new Terminal({ cols: 10, rows: 5, scrollback: 10, logLevel: "off" });
    try {
      for (const part of [input.slice(0, split), input.slice(split)]) if (part) await new Promise<void>((r) => t.write(part, r));
      for (let i = 0; i < 5; i++) assert.equal(t.buffer.active.getLine(i)?.translateToString(true), expected[i] ?? "", `${id} split ${split} row ${i}`);
    } finally { t.dispose(); }
  }
});
test("profile limits: VT52 unavailable, C1 only explicit legacy decoding, streaming UTF8", async () => {
  const t = new Terminal({ cols: 10, rows: 5, logLevel: "off" });
  await new Promise<void>((r) => t.write('\x1b[?2l\x1bY\x22\x24X', r));
  assert.equal(t.buffer.active.getLine(0)?.translateToString(true), '"$X'); t.dispose();
  assert.throws(() => new TerminalDecoder().decode(Uint8Array.of(155)));
  assert.equal(new TerminalDecoder("latin1-controls").decode(Uint8Array.of(155,50,74)), "\u009b2J");
  const d = new TerminalDecoder("utf8"); assert.equal(d.decode(Uint8Array.of(0xe2)), ""); assert.equal(d.decode(Uint8Array.of(0x94,0x8c), true), "┌");
});
test("keypad / PF / cursor bytes and split mock escape filtering", () => {
  assert.equal(decKey("F1", false), "\x1bOP");
  assert.equal(decKey("ArrowUp", true, true), "\x1bOA");
  assert.equal(decKey("ArrowLeft", false), "\x1b[D");
  for (let i=0;i<10;i++) { assert.equal(decKey(`Numpad${i}`, false), String(i)); assert.equal(decKey(`Numpad${i}`, true), `\x1bO${String.fromCharCode(112+i)}`); }
  assert.equal(decKey("NumpadEnter", true), "\x1bOM"); assert.equal(decKey("Digit1", true), undefined);
  const f = new MockInputFilter(); assert.equal(f.feed("H\x1b["), "H"); assert.equal(f.feed("AE\x1bOPLP\r"), "ELP\r");
  assert.equal(f.feed("\x1b]secret\x07OK"), "OK");
});
test("bounded keyboard queue, flow control, ownership and reconnect never replay", () => {
  const c = new TerminalChannel(); assert(!c.send(Uint8Array.of(65))); c.connect(); c.acquire(); c.flow(19);
  assert(c.send(Uint8Array.of(65))); assert.equal(c.drain().length,0); c.flow(17); assert.deepEqual([...c.drain()],[65]);
  c.send(Uint8Array.of(66)); c.release(); assert.equal(c.queued,0); c.acquire(); c.send(Uint8Array.of(67)); c.connect(); assert(!c.owner); assert.equal(c.queued,0);
  c.acquire(); assert.throws(() => c.send(new Uint8Array(65537))); assert(!c.connected);
});
test("Telnet NVT every split, escaped IAC, option rejection, bounded partial commands", () => {
  const wire = Uint8Array.from([65,13,0,66,255,255,255,253,99,255,251,31,13,10]);
  for(let split=0;split<=wire.length;split++) {
    const t = new TelnetNVT(), a=t.feed(wire.slice(0,split)), b=t.feed(wire.slice(split)); t.end();
    assert.deepEqual([...a.data,...b.data],[65,13,66,255,13,10]); assert.deepEqual([...a.reply,...b.reply],[255,252,99,255,254,31]);
    assert.equal(t.feed(Uint8Array.from([255,253,99])).reply.length,0);
  }
  const t = new TelnetNVT(); t.feed(Uint8Array.of(255)); assert.throws(()=>t.end());
  const sb = new TelnetNVT(); assert.throws(()=>sb.feed(Uint8Array.from([255,250,...new Array(1025).fill(1)])));
  assert.deepEqual([...TelnetNVT.encode(Uint8Array.of(13,10,13,65,255))],[13,10,13,0,65,255,255]);
});
