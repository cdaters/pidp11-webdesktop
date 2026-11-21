import { test } from "node:test";
import assert from "node:assert/strict";
import { WindowStore, clampRect, readPreferences } from "../src/windows.ts";
import { VirtualDevices, MockTerminalSession } from "../src/devices.ts";
test("window lifecycle preserves geometry across maximize and maintains stacking", () => {
  const s = new WindowStore(),
    r = { x: 20, y: 30, width: 600, height: 400 };
  s.open("panel", "Panel", r);
  s.open("disks", "Disks", r);
  s.focus("panel");
  assert.equal(s.windows.at(-1)?.id, "panel");
  s.maximize("panel", 1200, 800);
  assert.equal(s.windows.at(-1)?.width, 1200);
  s.maximize("panel", 1200, 800);
  assert.equal(s.windows.at(-1)?.x, 20);
  s.minimize("panel");
  assert(s.windows.at(-1)?.minimized);
  s.open("panel", "Panel", r);
  assert(!s.windows.at(-1)?.minimized);
  s.close("panel");
  assert.equal(s.windows.length, 1);
});
test("layout preferences accept only bounded known geometry, never ownership or secrets", () => {
  const rows = readPreferences(
    '[{"id":"panel","x":1,"y":2,"width":900,"height":400,"owner":"secret"},{"id":"shell","x":0,"y":0,"width":1,"height":1}]',
  );
  assert.equal(rows.size, 1);
  const s = new WindowStore();
  s.open("panel", "Panel", rows.get("panel")!);
  assert(!JSON.stringify(s.preferences()).includes("secret"));
  assert.equal(readPreferences("{").size, 0);
  assert.deepEqual(
    clampRect({ x: 1000, y: -1, width: 700, height: 600 }, 400, 500),
    { x: 0, y: 0, width: 400, height: 500 },
  );
});
test("media compatibility, stopped-only mutation and bounded paper/spool prototypes", () => {
  const d = new VirtualDevices();
  assert.throws(() => d.mount("RL0", "unix-demo"));
  d.mount("RL0", "rsx-demo");
  d.boot("RSX-11M+");
  assert.throws(() => d.eject("RL0"));
  assert.throws(() => d.protect("RL0"));
  d.stop();
  d.eject("RL0");
  d.queue("test", "hello");
  assert.equal(d.spool(), "");
  d.print();
  assert(d.spool().includes("hello"));
  d.clear();
  assert.equal(d.jobs.length, 0);
  d.loadPaper(new Uint8Array([1, 2]));
  assert.equal(d.paper.length, 2);
  assert.throws(() => d.loadPaper(new Uint8Array(8193)));
});
test("terminal input ownership and histories are independent of each other and panel", () => {
  const a = new MockTerminalSession("DZ0"),
    b = new MockTerminalSession("DZ1");
  assert.match(a.command("DIR"), /READ ONLY/);
  a.inputOwner = true;
  assert.match(a.command("DIR"), /synthetic/);
  assert.equal(b.history.length, 0);
  assert.equal(b.inputOwner, false);
  assert.match(a.command("halt"), /never reach the panel/);
});

test("guest and equipment windows restore geometry without restoring sessions", () => {
  const ids = ["guest", "guest-2", "guest-3", "guest-4", "companion", "device-observer"];
  const rows = readPreferences(JSON.stringify(ids.map(id => ({id, x:20, y:30, width:600, height:400, token:"secret", owner:true}))));
  assert.equal(rows.size, ids.length);
  assert(!JSON.stringify([...rows]).includes("secret"));
  assert.equal(readPreferences('[{"id":"guest-5","x":0,"y":0,"width":600,"height":400}]').size, 0);
});
