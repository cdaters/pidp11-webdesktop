import { PaperViewer } from "./printer.ts";
import type { PeripheralKind } from "./equipment-workspace.ts";

interface JobRecord {
  id: string;
  slot: string;
  kind: PeripheralKind;
  device: string;
  label: string;
  job: string;
  generation: string;
  simulator_generation: string;
  guest_generation: string;
  started_at: string;
  ended_at: string;
  completed_at?: string;
  state: "completed" | "incomplete" | "interrupted" | "expired";
  start_offset: number;
  observed_bytes: number;
  completed_bytes: number;
  sha256: string;
  full_sha256?: string;
  provenance: string;
  recovered: boolean;
  data?: string;
}
function validate(value: unknown): JobRecord {
  if (!value || typeof value !== "object") throw Error("Invalid retained job");
  const row = value as Record<string, unknown>;
  for (const key of ["id", "slot", "kind", "device", "label", "job", "generation", "simulator_generation", "guest_generation", "started_at", "ended_at", "state", "sha256", "provenance"])
    if (typeof row[key] !== "string" || String(row[key]).length > 160) throw Error("Invalid job identity");
  if (!["lp11", "pc11-punch"].includes(String(row.kind)) || !["completed", "incomplete", "interrupted", "expired"].includes(String(row.state)) ||
    !/^[a-f0-9]{64}$/.test(String(row.id)) || !/^[a-f0-9]{64}$/.test(String(row.sha256)) || typeof row.recovered !== "boolean") throw Error("Invalid job state");
  for (const key of ["start_offset", "observed_bytes", "completed_bytes"])
    if (!Number.isSafeInteger(row[key]) || Number(row[key]) < 0 || Number(row[key]) > 1048576) throw Error("Invalid job length");
  if (Number(row.observed_bytes) < Number(row.start_offset) || Number(row.observed_bytes) - Number(row.start_offset) > 65536) throw Error("Retained range exceeds bounds");
  if (!Number.isFinite(Date.parse(String(row.started_at))) || !Number.isFinite(Date.parse(String(row.ended_at)))) throw Error("Invalid job time");
  if (row.state === "completed") {
    if (row.completed_at !== row.ended_at || row.completed_bytes !== row.observed_bytes || !/^[a-f0-9]{64}$/.test(String(row.full_sha256))) throw Error("Unverified completion metadata");
  } else if (row.completed_at || row.full_sha256 || row.completed_bytes !== 0) throw Error("Incomplete job claims completion");
  if (row.data !== undefined && (typeof row.data !== "string" || row.data.length > 87384)) throw Error("Oversized retained bytes");
  return row as unknown as JobRecord;
}

/** Eight immutable retained jobs, selected explicitly. Owns request cancellation,
 * rendering and local downloads; never restores producer or keyboard authority. */
export function mountEquipmentHistory(host: HTMLElement, kind: PeripheralKind): () => void {
  host.classList.add("printer-app", "equipment-history");
  host.innerHTML = `<div class="app-heading"><h2>${kind === "lp11" ? "Printer job history" : "Paper-tape job history"}</h2><span class="source-tag">RETAINED DATA · READ ONLY</span></div><p>Up to eight recent jobs across equipment. New records replace the oldest in memory. Save important output; service restart clears this list unless the operator explicitly recovers a saved record. Viewing history never reconnects a device.</p><div class="terminal-toolbar"><button data-history-refresh>Refresh job history</button><select aria-label="Retained equipment job"><option value="">Choose a retained job</option></select><button data-history-view disabled>View job</button><button data-history-save disabled>Save retained bytes</button><button data-history-text disabled>Save text</button></div><p role="status" data-history-status>Not loaded. Sign in, then refresh explicitly.</p><p data-history-summary></p><details><summary>Job details and provenance</summary><pre data-history-details></pre></details><div class="paper-position"></div><div class="paper-viewport" tabindex="0" role="region" aria-label="Retained printer paper"></div><pre data-history-punch hidden></pre>`;
  const query = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  const select = query<HTMLSelectElement>("select");
  const view = query<HTMLButtonElement>("[data-history-view]");
  const save = query<HTMLButtonElement>("[data-history-save]");
  const text = query<HTMLButtonElement>("[data-history-text]");
  const status = query<HTMLElement>("[data-history-status]");
  const summary = query<HTMLElement>("[data-history-summary]");
  const details = query<HTMLElement>("[data-history-details]");
  const viewport = query<HTMLElement>(".paper-viewport");
  const position = query<HTMLElement>(".paper-position");
  const punch = query<HTMLElement>("[data-history-punch]");
  const paper = new PaperViewer(viewport, position, true);
  const top = document.createElement("button");
  top.textContent = "Top of job";
  top.onclick = () => paper.jump(false);
  const latest = document.createElement("button");
  latest.textContent = "Latest output";
  latest.onclick = () => paper.jump(true);
  query<HTMLElement>(".terminal-toolbar").append(top, latest);
  top.hidden = latest.hidden = kind !== "lp11";
  text.hidden = kind !== "lp11";
  viewport.hidden = position.hidden = kind !== "lp11";
  let rows: JobRecord[] = [];
  let selected: JobRecord | undefined;
  let bytes: Uint8Array<ArrayBuffer> | undefined;
  let pending: AbortController | undefined;
  let disposed = false;
  const reset = () => {
    pending?.abort();
    pending = undefined; // Invalidate even a fetch that already reached asynchronous hashing.
    selected = undefined;
    bytes = undefined;
    save.disabled = text.disabled = true;
    summary.textContent = details.textContent = punch.textContent = "";
    paper.update("");
  };
  const begin = () => {
    reset();
    pending = new AbortController();
    return pending;
  };
  query<HTMLButtonElement>("[data-history-refresh]").onclick = async () => {
    const request = begin();
    view.disabled = true;
    select.replaceChildren(new Option("Choose a retained job", ""));
    try {
      const response = await fetch("/api/v1/equipment-history", { signal: request.signal });
      if (!response.ok) throw Error("History unavailable or sign-in required.");
      const data: unknown = await response.json();
      if (!Array.isArray(data) || data.length > 8) throw Error("History exceeds eight-job bound");
      const next = data.map(validate).filter(row => row.kind === kind);
      if (disposed || pending !== request) return;
      rows = next;
      for (const row of rows) select.append(new Option(`${row.job} · ${row.device} · ${row.state} · ${new Date(row.ended_at).toLocaleString()}`, row.id));
      status.textContent = rows.length ? "Choose a retained job. No device is connected by this view." : "No retained jobs for this equipment.";
    } catch (error) {
      if (!disposed && pending === request) status.textContent = (error as Error).message;
    }
  };
  select.onchange = () => {
    reset();
    view.disabled = !select.value;
  };
  view.onclick = async () => {
    const target = rows.find(row => row.id === select.value);
    if (!target) return;
    const request = begin();
    try {
      const response = await fetch(`/api/v1/equipment-history/${encodeURIComponent(target.id)}`, { signal: request.signal });
      if (!response.ok) throw Error("Job unavailable or evicted. Refresh explicitly; no replacement was followed.");
      const record = validate(await response.json());
      for (const key of Object.keys(target) as (keyof JobRecord)[])
        if (key !== "data" && record[key] !== target[key]) throw Error("Retained job identity changed");
      const decoded = Uint8Array.from(atob(record.data ?? ""), char => char.charCodeAt(0));
      if (decoded.length !== record.observed_bytes - record.start_offset || (kind === "lp11" && decoded.some(byte => byte > 127))) throw Error("Retained data length or format mismatch");
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", decoded)), byte => byte.toString(16).padStart(2, "0")).join("");
      if (digest !== record.sha256 || (record.state === "completed" && record.start_offset === 0 && digest !== record.full_sha256)) throw Error("Retained data checksum mismatch");
      if (disposed || pending !== request) return;
      selected = record;
      bytes = decoded;
      const full = record.state === "completed" && record.start_offset === 0;
      save.disabled = false;
      text.disabled = kind !== "lp11";
      save.textContent = full ? "Save completed bytes" : "Save retained incomplete bytes";
      summary.textContent = `${record.job} · ${record.device} · ${record.guest_generation} (operator-attested). ${record.state.toUpperCase()} · ${record.observed_bytes} observed bytes${record.state === "completed" ? ` / ${record.completed_bytes} completed` : "; no completion established"}.`;
      details.textContent = `Source: ${record.label}\n${record.provenance}\nStarted: ${record.started_at}\nEnded: ${record.ended_at}\nCompleted: ${record.completed_at ?? "Not established"}\nRetained range: ${record.start_offset}–${record.observed_bytes}\nSHA-256 (retained range): ${record.sha256}\nFull completed hash: ${record.full_sha256 ?? "Unavailable"}\nSession: ${record.generation}\nArtifact: ${record.id}\nSimulator: ${record.simulator_generation}\n${record.recovered ? "Explicitly recovered data; no authority restored" : "Retained from this service instance"}`;
      status.textContent = "Retained data · checksum verified · no live observation or device authority.";
      if (kind === "lp11") paper.update(new TextDecoder().decode(decoded));
      else {
        punch.hidden = false;
        punch.textContent = Array.from(decoded.slice(0, 512), byte => byte.toString(16).padStart(2, "0")).join(" ") + (decoded.length > 512 ? "\nDisplay limited; download contains retained bytes." : "");
      }
    } catch (error) {
      if (!disposed && pending === request) status.textContent = (error as Error).message;
    }
  };
  const download = (asText: boolean) => {
    if (!bytes || !selected) return;
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([bytes], { type: asText ? "text/plain;charset=us-ascii" : "application/octet-stream" }));
    link.href = url;
    link.download = `${selected.job}-${selected.id}-${selected.state}-${selected.start_offset}-${selected.observed_bytes}.${asText ? "txt" : "bin"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  save.onclick = () => download(false);
  text.onclick = () => download(true);
  return () => {
    disposed = true;
    reset();
    paper.dispose();
  };
}
