/** Communications metadata is an operator assertion. This module owns no socket,
 * keyboard lease or guest lifecycle and never turns labels into connection targets. */
export interface SerialProfile {
  simulator: string;
  guest: string;
  controller: "DC11";
  unit: 0;
  line: number;
  guest_device: string;
  application: string;
  peer: string;
  framing: "ascii7-raw-socket";
}
export interface SerialState {
  received: number;
  written: number;
  capped: boolean;
  pending: number;
  sample_unix_ms: number;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const label = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 80 && /^[\x20-\x7e]+$/.test(value) && value.trim() === value;

/** Validate public metadata without treating it as proof of the configured device. */
export function serialProfile(value: unknown): SerialProfile | undefined {
  if (!object(value) || value.controller !== "DC11" || value.unit !== 0 ||
      !Number.isInteger(value.line) || Number(value.line) < 0 || Number(value.line) > 15 ||
      value.guest_device !== `/dev/tty${String(value.line).padStart(2, "0")}` ||
      value.framing !== "ascii7-raw-socket" || typeof value.simulator !== "string" ||
      !/^[a-zA-Z0-9_-]{16,64}$/.test(value.simulator) ||
      !label(value.guest) || !label(value.application) || !label(value.peer)) return undefined;
  return value as unknown as SerialProfile;
}

/** Counts describe the bridge socket only; they are not guest application receipts. */
export function serialState(value: unknown): SerialState | undefined {
  if (!object(value) || typeof value.capped !== "boolean" ||
      !["received", "written", "pending", "sample_unix_ms"].every(
        key => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0) ||
      Number(value.pending) > 65536) return undefined;
  return value as unknown as SerialState;
}

/** Last-known facts remain visible after disconnect, with present state unknown.
 * Freshness uses elapsed browser time since receipt, not synchronized host clocks. */
export function serialText(profile: SerialProfile, state: SerialState | undefined,
                           connected: boolean, owner: boolean, elapsedMS: number): string {
  const fresh = connected && state !== undefined && Number.isFinite(elapsedMS) && elapsedMS >= 0 && elapsedMS <= 3000;
  return [
    `${profile.controller} unit ${profile.unit}, line ${profile.line} · ${profile.guest_device}`,
    `Guest ${profile.guest} · application ${profile.application} (operator-attested)`,
    `Simulator ${profile.simulator} (operator-attested) · peer ${profile.peer}`,
    connected ? (owner ? "Supervised interaction · this window owns input" : "Observation · no input ownership") : "Disconnected · no input authority",
    fresh ? "Transport sample received within 3 seconds" : "Current transport state unknown · retained sample only",
    state ? `${state.capped ? "At least " : ""}${state.received} bytes from guest socket · ${state.written} bytes written to guest socket · ${state.pending} unacknowledged output bytes` : "No transport counts received",
    "ASCII7 over a raw socket; guest newline, echo and flow-control transformations can apply.",
    "Socket counts do not prove guest receipt. Carrier, DTR/DSR/CTS/RTS and physical baud are not observed.",
  ].join("\n");
}
