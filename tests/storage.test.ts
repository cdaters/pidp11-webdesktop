import test from "node:test";
import assert from "node:assert/strict";
import { validateStorage } from "../src/storage-workspace.ts";
export const rpFixture = () => ({ id: "rp-disk", device: "RP0", controller: "RH70", unit: 0, simulator: "original-lab", guest: "v7-attested", capture: "capture-one", captured_at: new Date().toISOString(), family: "RP06", configured: true, attachment: "attached", media: "Disposable V7 RP06", provenance: "Verified immutable base; disposable working copy", sha256: "a".repeat(64), size: 174423040, format: "SIMH disk", capacity: 174423040, geometry: "815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors", write_protection: "guest-writable", guest_access: "observed", guest_evidence: "Original console ls / completed", activity: "unavailable", position: -1, position_meaning: "unavailable", ready: "observed-ready", filemark: "unavailable", end_of_medium: "unavailable", registers: "DS[0]: 010700; ER1[0]: 000000", source: "Independent idle-console capture", generation: "a".repeat(32) + "-" + "b".repeat(32), freshness: "observed", mode: "captured-snapshot" });
test("RP06 keeps evidence separate from activity", () => {
 const row = rpFixture(); assert.equal(validateStorage(row).activity, "unavailable");
 for (const change of [{controller:"RH11"}, {unit:1}, {device:"RP1"}, {family:"RP04"}, {capacity:1}, {geometry:"unknown"}, {size:268435457}, {position:0}, {activity:"reading"}, {provenance:"x".repeat(513)}, {unexpected:"field"}]) assert.throws(() => validateStorage({...row,...change}));
});
