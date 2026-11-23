import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultTerminalPreferences, readTerminalPreferences } from "../src/terminal-preferences.ts";
import { localTerminalShortcut, terminalKey } from "../src/terminal-keyboard.ts";
import { TerminalProfile } from "../src/terminal-profile.ts";
const event = (code: string, changes = {}) => ({ code, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...changes });
test("stored presentation rejects malformed/unknown fields and cannot restore authority", () => {
  assert.deepEqual(readTerminalPreferences("not JSON"), defaultTerminalPreferences);
  assert.deepEqual(readTerminalPreferences(JSON.stringify({ ...defaultTerminalPreferences, owner: true, token: "secret", generation: "other", connect: true })), defaultTerminalPreferences);
  assert.deepEqual(readTerminalPreferences('{"phosphor":"red","fontSize":999,"brightness":-1,"glow":"true"}'), defaultTerminalPreferences);
  assert.equal(readTerminalPreferences('{"phosphor":"amber","fontSize":20,"cursor":"bar"}').fontSize,20);
});
test("DEC keypad modifiers and local shortcuts do not produce modern ANSI keys", () => {
  const vt52 = new TerminalProfile("vt52");
  vt52.feed(Uint8Array.from([27,61]));
  assert.equal(terminalKey(event("Numpad2",{ctrlKey:true,shiftKey:true}),vt52,127,false,false),"\x1b?r");
  assert.equal(terminalKey(event("F5"),vt52,127,false,false),"");
  assert.equal(terminalKey(event("PageUp"),vt52,127,false,false),"");
  assert.equal(terminalKey(event("Backspace"),vt52,35,false,false),"#");
  assert.equal(terminalKey(event("ArrowUp",{shiftKey:true}),vt52,127,false,false),"");
  assert.equal(localTerminalShortcut(event("KeyC",{ctrlKey:true})),false);
  assert.equal(localTerminalShortcut(event("KeyC",{ctrlKey:true,shiftKey:true})),true);
  assert.equal(localTerminalShortcut(event("KeyL",{metaKey:true})),true);
});
test("VT220 DECID across chunks and HELP/DO use DEC sequences", () => {
  const p = new TerminalProfile("vt220");
  p.feed(Uint8Array.of(27));
  assert.deepEqual(p.feed(Uint8Array.of(90)).replies,["\x1b[?62c"]);
  assert.equal(p.key("F15"),"\x1b[28~");
  assert.equal(p.key("F16"),"\x1b[29~");
  assert.equal(p.key("F20"),"\x1b[34~");
});
