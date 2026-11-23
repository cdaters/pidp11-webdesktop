import { renderEquipmentDescription } from "./equipment.ts";

interface PeripheralIdentity {
  id: string;
  kind: "lp11" | "pc11-punch";
  generation: string;
  simulator_generation: string;
  guest_generation: string;
}

/** Describes evidence and authority, without discovering or attaching equipment. */
export function mountPeripheralDetails(host: HTMLElement): (identity?: PeripheralIdentity) => void {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Equipment and source details";
  const description = document.createElement("dl");
  description.className = "diagnostic-grid";
  details.append(summary, description);
  host.append(details);
  const update = (identity?: PeripheralIdentity) => renderEquipmentDescription(description, {
    identity: identity?.id ?? "No observation selected",
    role: identity ? (identity.kind === "lp11" ? "LP11 line printer" : "PC11 punch; separately reported reader and immutable input snapshot") : "LP11 / PC11 output",
    protocol: "Original emulator device bytes through the authenticated, bounded observation service",
    environments: "Explicitly approved simulator and guest; no physical panel required",
    provider: identity ? `Simulator ${identity.simulator_generation}; guest ${identity.guest_generation} (operator-attested)` : "Unknown until explicitly selected",
    direction: "output",
    attachment: "Observation only; SIMH and its operator own device attachment",
    authority: "observation",
    generation: identity?.generation ?? "None",
    failure: "Stops on uncertainty; cached bytes are not current device state; no automatic reconnect",
    operations: "Inspect output and save retained bytes; reader progress and EOF are separate producer reports",
    limitations: "No media selection, mount, emulator control or automatic guest identification. Completion requires an independent producer assertion after flush/close.",
  });
  update();
  return update;
}
