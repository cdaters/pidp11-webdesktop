import type { EquipmentView } from "./equipment-workspace.ts";

interface StorageView {
  id: string; device: string; controller: string; unit: number;
  simulator: string; guest: string; capture: string; captured_at: string;
  family: string; configured: boolean; attachment: string; media: string;
  provenance: string; sha256: string; size: number; format: string;
  capacity: number; geometry: string; write_protection: string;
  guest_access: string; guest_evidence: string; activity: string;
  position: number; position_meaning: string; ready: string; filemark: string;
  end_of_medium: string; registers: string; source: string;
  generation: string; freshness: string; mode: string;
}
/** Validate captured facts rather than trusting JSON types. No field means live I/O. */
export function validateStorage(value: unknown): StorageView {
  if (!value || typeof value !== "object") throw Error("Invalid storage snapshot");
  const row = value as Record<string, unknown>;
  const strings = ["id", "device", "controller", "simulator", "guest", "capture", "captured_at", "family", "attachment", "media", "provenance", "sha256", "format", "geometry", "write_protection", "guest_access", "guest_evidence", "activity", "position_meaning", "ready", "filemark", "end_of_medium", "registers", "source", "generation", "freshness", "mode"];
  const fields = new Set([...strings, "unit", "configured", "size", "capacity", "position"]);
  if (Object.keys(row).some(key => !fields.has(key))) throw Error("Unknown storage field");
  for (const key of strings) if (typeof row[key] !== "string" || !/^[\x20-\x7e]{1,512}$/.test(String(row[key]))) throw Error("Invalid bounded storage text");
  for (const key of ["unit", "size", "capacity", "position"]) if (!Number.isSafeInteger(row[key])) throw Error("Invalid storage counter");
  if (row.unit !== 0 || row.configured !== true || row.attachment !== "attached" || Number(row.size) <= 0 || Number(row.size) > 268435456 || Number(row.capacity) < 0 || Number(row.capacity) > 1099511627776) throw Error("Unsupported storage attachment");
  if (!/^[a-f0-9]{64}$/.test(String(row.sha256)) || !/^[a-f0-9]{32}-[a-f0-9]{32}$/.test(String(row.generation)) || !Number.isFinite(Date.parse(String(row.captured_at)))) throw Error("Invalid snapshot identity/time");
  if (row.activity !== "unavailable" || row.mode !== "captured-snapshot" || !["observed", "stale", "disconnected"].includes(String(row.freshness))) throw Error("Unqualified live activity claim");
  for (const [key, choices] of Object.entries({ write_protection: ["read-only", "guest-writable", "unknown"], guest_access: ["observed", "unavailable", "unknown"], ready: ["observed-ready", "observed-error", "unknown"], filemark: ["observed", "not-observed", "unavailable"], end_of_medium: ["observed", "not-observed", "unavailable"] }))
    if (!choices.includes(String(row[key]))) throw Error("Invalid storage status");
  if (row.device === "RL0") {
    if (row.controller !== "RL11" || row.family !== "RL02" || row.format !== "SIMH disk" || row.capacity !== 10485760 || row.position !== -1 || row.position_meaning !== "unavailable" || row.filemark !== "unavailable" || row.end_of_medium !== "unavailable") throw Error("Wrong disk identity");
  } else if (row.device === "RP0") {
    if (row.controller !== "RH70" || row.family !== "RP06" || row.format !== "SIMH disk" || row.capacity !== 174423040 || row.geometry !== "815 cylinders; 19 heads; 22 sectors per track; 512-byte sectors" || row.position !== -1 || row.position_meaning !== "unavailable" || row.filemark !== "unavailable" || row.end_of_medium !== "unavailable") throw Error("Wrong RP06 identity");
  } else if (row.device === "TM0") {
    if (row.controller !== "TM11" || row.family !== "TU10" || row.format !== "SIMH tape" || Number(row.position) < 0 || Number(row.position) > Number(row.size) || row.geometry !== "unavailable" || row.position_meaning !== "SIMH logical image byte offset; not host file cursor or physical tape length") throw Error("Wrong tape identity");
  } else throw Error("Unsupported storage device");
  return { ...row } as unknown as StorageView;
}

/** Owns explicit mode selection, bounded requests and one retained metadata copy.
 * Closing cancels requests/timer; saved preferences never reconnect equipment. */
export function mountStorageWorkspace(host: HTMLElement, tape: boolean, simulation: (content: HTMLElement) => EquipmentView): EquipmentView {
  host.classList.add("equipment-workspace");
  const modes = document.createElement("div"); modes.className = "terminal-toolbar";
  const labels = ["Local simulation", "Read-only observation", "Retained snapshot"];
  const buttons = labels.map(label => { const button = document.createElement("button"); button.textContent = label; modes.append(button); return button; });
  host.replaceChildren(modes);
  let content: HTMLElement | undefined, current: EquipmentView | undefined;
  let retained: StorageView | undefined;
  const change = (mode: number) => {
    current?.dispose(); content?.remove(); content = document.createElement("div"); content.className = "storage-observation"; host.append(content);
    buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(i === mode)));
    if (mode === 0) { current = simulation(content); current.update(); return; }
    const target = content;
    target.innerHTML = `<div class="app-heading"><h2>${tape ? "Magnetic tape" : "Disk drives"}</h2><span class="source-tag">${mode === 2 ? "RETAINED SNAPSHOT" : "READ-ONLY CAPTURE"}</span></div><p>Captured facts from an independently operated simulator. No live block-I/O or motion feed. Configuration, attachment and guest access require separate evidence.</p><div class="terminal-toolbar"><button data-storage-refresh>Refresh available captures</button><select aria-label="Storage capture"><option value="">Choose a capture</option></select><button data-storage-view disabled>View selected capture</button><button data-storage-stop>Stop viewing</button></div><p role="status" data-storage-status></p><dl class="diagnostic-grid" data-storage-facts></dl><details><summary>Evidence and technical details</summary><pre data-storage-details></pre></details>`;
    const query = <T extends HTMLElement>(selector: string) => target.querySelector<T>(selector)!;
    const status = query<HTMLElement>("[data-storage-status]");
    const facts = query<HTMLElement>("[data-storage-facts]");
    const details = query<HTMLElement>("[data-storage-details]");
    const select = query<HTMLSelectElement>("select");
    const view = query<HTMLButtonElement>("[data-storage-view]");
    let pending: AbortController | undefined, disposed = false, shown: StorageView | undefined;
    let rows: StorageView[] = [];
    const cancel = () => { pending?.abort(); pending = undefined; shown = undefined; facts.replaceChildren(); details.textContent = ""; };
    const freshness = () => {
      if (!shown) return;
      const age = Date.now() - Date.parse(shown.captured_at);
      if (shown.freshness === "observed" && (age < 0 || age > 30000)) shown.freshness = "stale";
      const ageText = age < 0 ? "Unknown; capture time is ahead of this clock" : `${Math.floor(age / 1000).toLocaleString()} seconds since capture; current state unknown`;
      const ageField = facts.querySelector<HTMLElement>("[data-storage-age]");
      if (ageField) ageField.textContent = ageText;
      status.textContent = mode === 2 ? "Retained snapshot · not connected · never live telemetry." : `${shown.freshness.toUpperCase()} capture · current device state unknown · no automatic updates.`;
    };
    const show = (record: StorageView) => {
      shown = { ...record };
      const values: Record<string, string> = {
        Equipment: `${record.family} · ${record.controller} · ${record.device} (unit ${record.unit})`,
        Guest: `${record.guest} (operator-attested)`,
        Configuration: "Observed in original simulator at capture",
        Attachment: `${record.attachment} at capture · ${record.media}`,
        Provenance: record.provenance,
        Geometry: record.geometry,
        "Guest access": `${record.guest_access} · ${record.guest_evidence}`,
        "Media bytes": `${record.size.toLocaleString()} · ${record.format}`,
        "Configured capacity": record.capacity ? `${record.capacity.toLocaleString()} bytes` : "Unavailable; no transport length inferred",
        "Write protection": `${record.write_protection} at capture`,
        "Device status": `${record.ready} at capture`,
        Activity: "Unavailable · no animated or inferred activity",
        "Tape position": tape ? `${record.position} · ${record.position_meaning}` : "Not applicable",
        "Filemark / end of medium": `${record.filemark} / ${record.end_of_medium} at capture`,
        Captured: new Date(record.captured_at).toLocaleString(),
        "Snapshot age": "Unknown",
      };
      for (const [key, value] of Object.entries(values)) { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = key; dd.textContent = value; if (key === "Snapshot age") dd.dataset.storageAge = ""; facts.append(dt, dd); }
      details.textContent = `Source: ${record.source}\nProvenance: ${record.provenance}\nSHA-256 at capture: ${record.sha256}\nGeometry: ${record.geometry}\nRegisters: ${record.registers}\nSimulator: ${record.simulator}\nEquipment generation: ${record.generation}\nCapture: ${record.capture}\nCaptured UTC: ${record.captured_at}\nMedia may change after capture. Hash is not filesystem-mount evidence.`;
      freshness();
    };
    if (mode === 2) { query<HTMLElement>(".terminal-toolbar").hidden = true; if (retained) show(retained); else status.textContent = "No retained snapshot in this window. Explicitly view a verified capture first."; }
    else {
      status.textContent = "Disconnected. Sign in, refresh and explicitly select a capture.";
      query<HTMLButtonElement>("[data-storage-refresh]").onclick = async () => {
        cancel(); const request = new AbortController(); pending = request; view.disabled = true; rows = []; select.replaceChildren(new Option("Choose a capture", ""));
        try {
          const response = await fetch("/api/v1/storage", { signal: request.signal }); if (!response.ok) throw Error("Storage unavailable or sign-in required");
          const data: unknown = await response.json(); if (!Array.isArray(data) || data.length > 4) throw Error("Storage inventory exceeds bounds");
          const next = data.map(validateStorage).filter(row => tape ? row.device === "TM0" : row.device === "RL0" || row.device === "RP0");
          if (disposed || pending !== request) return; rows = next;
          for (const row of rows) select.append(new Option(`${row.device} · ${row.media} · ${row.freshness}`, row.generation));
          status.textContent = rows.length ? "Select a capture; refreshing does not connect a device." : "No approved captures. Device state unavailable.";
        } catch (error) { if (!disposed && pending === request) status.textContent = (error as Error).message; }
      };
      select.onchange = () => { cancel(); view.disabled = !select.value; status.textContent = "Selection changed; view explicitly."; };
      view.onclick = async () => {
        const selected = rows.find(row => row.generation === select.value); if (!selected) return;
        cancel(); const request = new AbortController(); pending = request;
        try {
          const response = await fetch(`/api/v1/storage/${encodeURIComponent(selected.id)}/${encodeURIComponent(selected.generation)}`, { signal: request.signal }); if (!response.ok) throw Error("Retired or unavailable capture. No replacement followed.");
          const record = validateStorage(await response.json());
          for (const key of Object.keys(selected) as (keyof StorageView)[]) if (key !== "freshness" && record[key] !== selected[key]) throw Error("Storage identity changed");
          if (disposed || pending !== request) return; retained = { ...record }; show(record);
        } catch (error) { if (!disposed && pending === request) status.textContent = (error as Error).message; }
      };
      query<HTMLButtonElement>("[data-storage-stop]").onclick = () => { cancel(); status.textContent = "Disconnected viewer. Independent guest continues; retained snapshot is data only."; };
    }
    const timer = setInterval(freshness, 1000);
    current = { update() {}, dispose() { disposed = true; cancel(); clearInterval(timer); } };
  };
  buttons.forEach((button, index) => button.onclick = () => change(index)); change(0);
  return { update: () => current?.update(), dispose() { current?.dispose(); content?.remove(); retained = undefined; } };
}
