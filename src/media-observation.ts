/** Read-only observation contract for future collectors. No filenames, mount
 * requests or writable handles cross this boundary. This contract alone does
 * not connect the simulated equipment windows to real devices. */
export type MediaKind = "pc11-reader" | "pc11-punch" | "rk05" | "rl02" | "tm11";
export interface MediaObservation {
  device: string;
  kind: MediaKind;
  simulatorGeneration: string;
  guestGeneration: string;
  sequence: number;
  state:
    | "offline"
    | "available"
    | "busy"
    | "end-of-tape"
    | "disconnected"
    | "faulted";
  media: "paper-tape" | "disk" | "magnetic-tape";
  access: "read-only" | "guest-writable";
  position: number;
  length: number;
  capturedAt: number;
}

/** Validate a collector snapshot and refuse stale generation/sequence silently
 * becoming current. A caller must explicitly reset its fence for a new guest. */
export function validateMediaObservation(
  value: unknown,
  previous?: MediaObservation,
): MediaObservation {
  if (!value || typeof value !== "object")
    throw Error("Invalid media observation");
  const v = value as Record<string, unknown>;
  const fields = new Set([
    "device",
    "kind",
    "simulatorGeneration",
    "guestGeneration",
    "sequence",
    "state",
    "media",
    "access",
    "position",
    "length",
    "capturedAt",
  ]);
  if (Object.keys(v).some((key) => !fields.has(key)))
    throw Error("Unknown media field");
  for (const field of ["device", "simulatorGeneration", "guestGeneration"])
    if (
      typeof v[field] !== "string" ||
      !/^[\w.-]{1,80}$/.test(v[field] as string)
    )
      throw Error("Invalid media identity");
  if (
    !["pc11-reader", "pc11-punch", "rk05", "rl02", "tm11"].includes(
      String(v.kind),
    ) ||
    ![
      "offline",
      "available",
      "busy",
      "end-of-tape",
      "disconnected",
      "faulted",
    ].includes(String(v.state)) ||
    !["read-only", "guest-writable"].includes(String(v.access))
  )
    throw Error("Invalid device capability/state");
  const expected = String(v.kind).startsWith("pc11")
    ? "paper-tape"
    : v.kind === "tm11"
      ? "magnetic-tape"
      : "disk";
  if (v.media !== expected) throw Error("Media type does not match device");
  for (const field of ["sequence", "position", "length", "capturedAt"])
    if (!Number.isSafeInteger(v[field]) || Number(v[field]) < 0)
      throw Error("Invalid media counter");
  if (Number(v.position) > Number(v.length))
    throw Error("Position beyond medium");
  if (
    previous &&
    (v.device !== previous.device ||
      v.simulatorGeneration !== previous.simulatorGeneration ||
      v.guestGeneration !== previous.guestGeneration ||
      Number(v.sequence) <= previous.sequence)
  )
    throw Error("Retired or unordered media observation");
  return { ...v } as unknown as MediaObservation;
}
