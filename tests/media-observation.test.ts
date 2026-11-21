import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMediaObservation } from "../src/media-observation.ts";
test("read-only observation fences media identity, progress, reset and stale guest data", () => {
  const base = {
    device: "ptr",
    kind: "pc11-reader",
    simulatorGeneration: "sim1",
    guestGeneration: "baremetal1",
    sequence: 1,
    state: "available",
    media: "paper-tape",
    access: "read-only",
    position: 0,
    length: 24,
    capturedAt: 100,
  };
  const first = validateMediaObservation(base);
  const last = validateMediaObservation(
    { ...base, sequence: 2, position: 24, state: "end-of-tape" },
    first,
  );
  assert.equal(last.position, 24);
  for (const bad of [
    { ...base, guestGeneration: "other" },
    { ...base, position: 25 },
    { ...base, kind: "shell" },
    { ...base, media: "disk" },
    { ...base, path: "/private/disk" },
    base,
  ])
    assert.throws(() => validateMediaObservation(bad, first));
  assert.equal(
    validateMediaObservation({ ...base, sequence: 3, position: 0 }, last)
      .position,
    0,
  );
});
