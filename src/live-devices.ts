import { mountReaderCatalog } from "./reader-catalog.ts";
import { PaperViewer } from "./printer.ts";
import type { PeripheralKind } from "./equipment-workspace.ts";
import { mountPeripheralDetails } from "./peripheral-details.ts";

interface Activity {
  owner?: string;
  job?: string;
  phase?: string;
  device?: string;
  label?: string;
  produced_bytes?: number;
  id: string;
  kind: "lp11" | "pc11-punch";
  generation: string;
  simulator_generation: string;
  guest_generation: string;
  state: "detached" | "observing" | "completed" | "disconnected" | "faulted";
  message: string;
  sequence: number;
  start_offset: number;
  next_offset: number;
  total_bytes: number;
  lost: boolean;
  data: string | null;
  sha256: string;
  reader_length: number;
  reader_bytes: number;
  reader_eof: boolean;
  reader_sha256: string;
}
function activity(value: unknown): Activity {
  if (!value || typeof value !== "object")
    throw Error("Invalid peripheral observation");
  const v = value as Record<string, unknown>;
  for (const key of [
    "id",
    "generation",
    "simulator_generation",
    "guest_generation",
    "message",
    "sha256",
    "reader_sha256",
  ])
    if (typeof v[key] !== "string" || v[key].length > 240)
      throw Error("Invalid peripheral identity");
  if (
    !["lp11", "pc11-punch"].includes(String(v.kind)) ||
    !["detached", "observing", "completed", "disconnected", "faulted"].includes(
      String(v.state),
    )
  )
    throw Error("Unsupported peripheral state");
  for (const key of [
    "sequence",
    "start_offset",
    "next_offset",
    "total_bytes",
    "reader_length",
    "reader_bytes",
  ])
    if (!Number.isSafeInteger(v[key]) || Number(v[key]) < 0)
      throw Error("Invalid peripheral counter");
  if (
    Number(v.total_bytes) > 1048576 ||
    Number(v.reader_length) > 65536 ||
    Number(v.reader_bytes) > Number(v.reader_length) ||
    typeof v.lost !== "boolean" ||
    typeof v.reader_eof !== "boolean"
  )
    throw Error("Peripheral bounds exceeded");
  if (v.data !== null && (typeof v.data !== "string" || v.data.length > 10924))
    throw Error("Invalid peripheral chunk");
  for (const key of ["owner", "job", "phase", "device", "label"])
    if (v[key] !== undefined && (typeof v[key] !== "string" || (v[key] as string).length > 160)) throw Error("Invalid equipment session");
  if (v.phase !== undefined && !["observing", "guest-returned", "drained", "closed", "completed", "disconnected", "faulted", "detached"].includes(String(v.phase))) throw Error("Invalid session phase");
  if (v.produced_bytes !== undefined && (!Number.isSafeInteger(v.produced_bytes) || Number(v.produced_bytes) < 0 || Number(v.produced_bytes) > 1048576)) throw Error("Invalid device length");
  return v as unknown as Activity;
}
async function digest(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
function save(bytes: Uint8Array<ArrayBuffer>, name: string, type = "application/octet-stream") {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** One explicitly selected generation, one outstanding poll and a 64-KiB tail.
 * Network failure stops observation; reconnect is a deliberate new selection.
 * No browser request renews producer authority or modifies a device/file. */
export function mountLiveDevices(host: HTMLElement, kind?: PeripheralKind): () => void {
  host.classList.add("printer-app");
  host.innerHTML = `<div class="app-heading"><h2>Peripheral activity</h2><span class="source-tag">OBSERVATION · READ-ONLY</span></div><p>Approved simulator output, as bytes become visible in its local spool. Buffered device output may arrive in bursts. This observer does not operate the simulator.</p><div class="terminal-toolbar"><button data-another-observer>Open another observer</button><button data-inventory>Refresh devices</button><select aria-label="Live peripheral"></select><button data-follow disabled>Observe selected generation</button><button data-stop>Stop observing</button><button data-save disabled>Save completed output</button><button data-reader disabled>Save read-only reader image</button><label>Paper <select aria-label="Live printer columns"><option>80</option><option>132</option></select></label></div><p data-activity-status role="status">Detached · sign in through Guest terminal, then refresh.</p><p data-activity-identity></p><p data-activity-count></p><div class="paper-position"></div><div class="paper-viewport" tabindex="0" role="region" aria-label="Live printer paper"></div><pre data-punch-bytes hidden></pre>`;
  const $ = <T extends Element>(query: string) => host.querySelector<T>(query)!;
  const select = $<HTMLSelectElement>('[aria-label="Live peripheral"]');
  const follow = $<HTMLButtonElement>("[data-follow]");
  const download = $<HTMLButtonElement>("[data-save]");
  const reader = $<HTMLButtonElement>("[data-reader]");
  reader.hidden = kind === "lp11";
  const status = $<HTMLElement>("[data-activity-status]");
  const viewport = $<HTMLElement>(".paper-viewport");
  const punch = $<HTMLElement>("[data-punch-bytes]");
  const paper = new PaperViewer(
    viewport,
    $<HTMLElement>(".paper-position"),
    true,
  );
  const describe = mountPeripheralDetails(host);
  const disposeCatalog = kind === "pc11-punch" ? mountReaderCatalog(host) : () => {};
  const session = document.createElement("p");
  session.dataset.equipmentSession = "";
  $("[data-activity-count]").after(session);
  const partial = document.createElement("button");
  partial.textContent = "Save incomplete bytes";
  partial.dataset.savePartial = "";
  const text = document.createElement("button");
  text.textContent = "Save retained text";
  text.dataset.saveText = "";
  const top = document.createElement("button");
  top.textContent = "Top of retained paper";
  top.onclick = () => paper.jump(false);
  const latest = document.createElement("button");
  latest.textContent = "Latest output";
  latest.onclick = () => paper.jump(true);
  $(".terminal-toolbar").append(partial, text, top, latest);
  partial.disabled = text.disabled = true;
  let completed = false;
  let inventory: Activity[] = [],
    selected: Activity | undefined;
  let retained = new Uint8Array(0),
    cursor = 0,
    sequence = 0,
    first = 0;
  let pending: AbortController | undefined,
    timer = 0,
    disposed = false;
  $<HTMLButtonElement>("[data-another-observer]").onclick = () =>
    window.dispatchEvent(new Event("pidp11-new-device-observer"));
  const stop = () => {
    clearTimeout(timer);
    pending?.abort();
    pending = undefined;
    if (selected?.job) session.textContent = `Cached job ${selected.job}; no active observation. Refresh and select a generation explicitly to resume.`;
  };
  const reset = () => {
    stop();
    selected = undefined;
    session.textContent = "";
    retained = new Uint8Array(0);
    cursor = sequence = first = 0;
    download.disabled = reader.disabled = true;
    download.textContent = "Save completed output";
    partial.disabled = text.disabled = true;
    completed = false;
    describe();
    paper.update("");
    punch.textContent = "";
    $("[data-activity-identity]").textContent = "";
    $("[data-activity-count]").textContent = "";
  };
  select.onchange = () => {
    reset();
    follow.disabled = !select.value;
  };
  $<HTMLButtonElement>("[data-stop]").onclick = () => {
    stop();
    status.textContent =
      "Observation stopped · displayed bytes are cached; producer may continue independently.";
  };
  $<HTMLSelectElement>('[aria-label="Live printer columns"]').onchange = (
    event,
  ) => paper.setColumns(Number((event.target as HTMLSelectElement).value));
  $<HTMLButtonElement>("[data-inventory]").onclick = async () => {
    reset();
    select.replaceChildren();
    follow.disabled = true;
    const request = new AbortController();
    pending = request;
    try {
      const response = await fetch("/api/v1/device-streams", {
        signal: request.signal,
      });
      if (!response.ok)
        throw Error("Peripheral service unavailable or sign-in required");
      const rows: unknown = await response.json();
      if (!Array.isArray(rows) || rows.length > 4)
        throw Error("Invalid device inventory");
      if (disposed || pending !== request) return;
      inventory = rows.map(activity).filter((row) => row.generation && (!kind || row.kind === kind));
      select.replaceChildren(
        new Option("Select an approved observation", ""),
        ...inventory.map(
          (row) => new Option(`${row.job ?? row.id} · ${row.device ?? row.kind} · ${row.state}`, row.id),
        ),
      );
      status.textContent = inventory.length
        ? "Choose a generation explicitly. Refresh does not follow a new producer."
        : "Detached · no producer observation approved.";
    } catch (error) {
      if (!disposed && pending === request)
        status.textContent = (error as Error).message;
    }
  };
  const poll = async () => {
    if (!selected || disposed) return;
    const target = selected,
      request = new AbortController();
    pending = request;
    try {
      const response = await fetch(
        `/api/v1/device-streams/${encodeURIComponent(target.id)}/${encodeURIComponent(target.generation)}?after=${cursor}`,
        { signal: request.signal },
      );
      if (!response.ok)
        throw Error(
          "Observation retired or unavailable; refresh and review explicitly.",
        );
      const next = activity(await response.json());
      if (disposed || pending !== request) return;
      if (
        next.generation !== target.generation ||
        next.owner !== target.owner || next.job !== target.job || next.device !== target.device ||
        next.label !== target.label ||
        next.id !== target.id || next.kind !== target.kind ||
        next.simulator_generation !== target.simulator_generation ||
        next.guest_generation !== target.guest_generation ||
        next.reader_sha256 !== target.reader_sha256 ||
        next.reader_length !== target.reader_length ||
        next.reader_bytes < target.reader_bytes ||
        (target.reader_eof && !next.reader_eof) ||
        next.sequence < sequence
      )
        throw Error("Peripheral identity or order changed");
      const stages = ["observing", "guest-returned", "drained", "closed"];
      if (target.phase && (
        !next.phase ||
        (next.state === "observing" && stages.indexOf(next.phase) < stages.indexOf(target.phase)) ||
        (next.state === "completed" && next.phase !== "completed")
      )) throw Error("Equipment session stage changed unexpectedly");
      if (next.lost || next.start_offset !== cursor)
        throw Error(
          "Output loss detected: this observer fell behind. Refresh to review the retained tail explicitly.",
        );
      const chunk = Uint8Array.from(atob(next.data ?? ""), (c) =>
        c.charCodeAt(0),
      );
      if (
        chunk.length > 8192 ||
        (next.kind === "lp11" && chunk.some((byte) => byte > 127)) ||
        next.next_offset !== cursor + chunk.length ||
        next.next_offset > next.total_bytes
      )
        throw Error("Invalid peripheral byte ordering");
      sequence = next.sequence;
      cursor = next.next_offset;
      selected = next;
      if (chunk.length) {
        const combined = new Uint8Array(retained.length + chunk.length);
        combined.set(retained);
        combined.set(chunk, retained.length);
        retained = combined.slice(-65536);
        first = cursor - retained.length;
        partial.disabled = false;
        text.disabled = next.kind !== "lp11";
        if (next.kind === "lp11")
          paper.update(new TextDecoder().decode(retained));
        else
          punch.textContent = Array.from(retained.slice(-512), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(" ");
      }
      $("[data-activity-count]").textContent =
        `${cursor} / ${next.total_bytes} host-visible bytes · retained from ${first}${first ? " · earlier bytes omitted; paper origin is approximate" : ""}${next.reader_sha256 ? ` · reported reader ${next.reader_bytes}/${next.reader_length}${next.reader_eof ? " · end-of-tape reported" : ""}` : ""}`;
      status.textContent = `${next.state.toUpperCase()} · ${next.message}`;
      const phases: Record<string, string> = {
        observing: "Observing host-visible output; completion not established",
        "guest-returned": "Guest utility returned; device drain and flush still require verification",
        drained: "Device drain attested; host-file close still required",
        closed: "Host-file close attested; final artifact verification pending",
        completed: "Artifact verified complete", disconnected: "Approval ended; retained output may be incomplete",
        faulted: "Session failed; inspect retained evidence", detached: "No active session",
      };
      session.textContent = next.job ? `${next.label} · device ${next.device} · job ${next.job}. ${phases[next.phase ?? "observing"]}${next.produced_bytes ? ` · independently reported device length ${next.produced_bytes}` : ""}` : "Legacy observation; no equipment-session stages supplied.";
      reader.disabled = !next.reader_sha256;
      if (next.state === "completed" && cursor === next.total_bytes) {
        if (!first && (await digest(retained)) !== next.sha256)
          throw Error("Completed output checksum mismatch");
        if (disposed || pending !== request) return;
        download.disabled = false;
        completed = true;
        partial.disabled = true;
        text.disabled = next.kind !== "lp11";
        download.textContent = first
          ? "Save retained tail (partial)"
          : "Save completed output";
      }
      if (
        next.state === "observing" ||
        (cursor < next.total_bytes && next.state === "completed")
      )
        timer = window.setTimeout(() => void poll(), 200);
    } catch (error) {
      if (!disposed && pending === request) {
        stop();
        download.disabled = true;
        completed = false;
        partial.disabled = !retained.length;
        status.textContent =
          (error as Error).message +
          " · cached bytes are not current device state.";
      }
    }
  };
  follow.onclick = () => {
    const target = inventory.find((row) => row.id === select.value);
    if (!target) return;
    reset();
    selected = target;
    describe(target);
    cursor = first = target.start_offset;
    viewport.hidden = target.kind !== "lp11";
    $<HTMLElement>(".paper-position").hidden = target.kind !== "lp11";
    $<HTMLSelectElement>('[aria-label="Live printer columns"]').parentElement!.hidden = target.kind !== "lp11";
    punch.hidden = target.kind !== "pc11-punch";
    text.hidden = top.hidden = latest.hidden = target.kind !== "lp11";
    $("[data-activity-identity]").textContent =
      `${target.id} · simulator ${target.simulator_generation} · guest ${target.guest_generation} · observation ${target.generation}`;
    void poll();
  };
  download.onclick = () => {
    if (selected && !download.disabled)
      save(retained, `${selected.id}${first ? "-partial" : "-completed"}.bin`);
  };
  // An interrupted or still-running job is useful evidence, but never a
  // completed artifact. Include its generation and exact retained byte range.
  const retainedName = () => `${selected!.id}-${selected!.generation}-${first}-${cursor}-${completed ? (first ? "partial" : "completed") : "incomplete"}`;
  partial.onclick = () => {
    if (selected && !partial.disabled) save(retained, retainedName() + ".bin");
  };
  text.onclick = () => {
    if (selected?.kind === "lp11" && !text.disabled)
      save(retained, retainedName() + ".txt", "text/plain;charset=us-ascii");
  };
  reader.onclick = async () => {
    if (!selected || reader.disabled) return;
    const target = selected;
    // Stop the polling request before the optional reader download. It never
    // resumes automatically; this avoids multiple unbounded requests per window.
    stop();
    const request = new AbortController();
    pending = request;
    try {
      const response = await fetch(
        `/api/v1/device-streams/${encodeURIComponent(target.id)}/${encodeURIComponent(target.generation)}/reader`,
        { signal: request.signal },
      );
      if (!response.ok) throw Error("Reader image retired");
      const wire = await response.json();
      if (
        typeof wire.data !== "string" ||
        wire.data.length > 87384 ||
        wire.generation !== target.generation
      )
        throw Error("Invalid reader snapshot");
      const bytes = Uint8Array.from(atob(wire.data), (c) => c.charCodeAt(0));
      if (
        bytes.length !== target.reader_length ||
        (await digest(bytes)) !== target.reader_sha256
      )
        throw Error("Reader checksum mismatch");
      if (disposed || pending !== request) return;
      save(bytes, `${target.id}-readonly-reader.bin`);
      status.textContent =
        "Verified reader snapshot saved. Observation paused; resume explicitly.";
    } catch (error) {
      if (!disposed && pending === request)
        status.textContent = (error as Error).message;
    }
  };
  return () => {
    disposed = true;
    disposeCatalog();
    stop();
    paper.dispose();
    retained = new Uint8Array(0);
  };
}
