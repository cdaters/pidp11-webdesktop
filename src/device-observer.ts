import { PaperViewer } from "./printer.ts";
import type { PeripheralKind } from "./equipment-workspace.ts";
import { mountPeripheralDetails } from "./peripheral-details.ts";

interface Device {
  id: string;
  kind: "lp11" | "pc11-punch";
  generation: string;
  simulator_generation: string;
  guest_generation: string;
  state: "offline" | "completed";
  sha256: string;
  bytes: number;
  data?: string;
}
function validate(value: unknown): Device {
  if (!value || typeof value !== "object")
    throw Error("Invalid device observation");
  const v = value as Record<string, unknown>;
  if (
    typeof v.id !== "string" ||
    !["lp11", "pc11-punch"].includes(String(v.kind)) ||
    !["offline", "completed"].includes(String(v.state)) ||
    typeof v.bytes !== "number" ||
    v.bytes < 0 ||
    v.bytes > 65536
  )
    throw Error("Invalid bounded device observation");
  for (const key of [
    "generation",
    "simulator_generation",
    "guest_generation",
    "sha256",
  ])
    if (typeof v[key] !== "string" || String(v[key]).length > 200)
      throw Error("Invalid device identity");
  return v as unknown as Device;
}

/** Completed SIMH exports only. Selection never silently follows a new generation.
 * One request at a time, no reconnect loop, file paths, media writes or controls. */
export function mountDeviceObserver(host: HTMLElement, kind?: PeripheralKind): () => void {
  host.classList.add("printer-app");
  host.innerHTML = `<div class="app-heading"><h2>Guest device output</h2><span class="source-tag">OBSERVATION · COMPLETED EXPORTS</span></div><p>Operator-approved LP11 and PC11 output. These are completed spool snapshots, not a live device attachment.</p><div class="terminal-toolbar"><button data-refresh-devices>Refresh observations</button><select aria-label="Observed device"></select><button data-view-device disabled>View selected generation</button><button data-download-device disabled>Save exact device bytes</button><label>Paper <select aria-label="Observed printer columns"><option>80</option><option>132</option></select></label></div><p data-device-status role="status">Sign in through Guest terminal, then refresh. No automatic attachment.</p><p data-device-identity></p><div class="paper-position"></div><div class="paper-viewport" tabindex="0" role="region" aria-label="Observed printer paper"></div><pre data-punch hidden></pre>`;
  const select = host.querySelector<HTMLSelectElement>(
    '[aria-label="Observed device"]',
  )!;
  const status = host.querySelector<HTMLElement>("[data-device-status]")!;
  const view = host.querySelector<HTMLButtonElement>("[data-view-device]")!;
  const download = host.querySelector<HTMLButtonElement>(
    "[data-download-device]",
  )!;
  const viewport = host.querySelector<HTMLElement>(".paper-viewport")!;
  const punch = host.querySelector<HTMLElement>("[data-punch]")!;
  const paper = new PaperViewer(
    viewport,
    host.querySelector<HTMLElement>(".paper-position")!,
    true,
  );
  const describe = mountPeripheralDetails(host);
  const textDownload = document.createElement("button");
  textDownload.textContent = "Save completed text";
  textDownload.disabled = true;
  host.querySelector(".terminal-toolbar")!.append(textDownload);
  let selected: Device | undefined;
  let rows: Device[] = [],
    bytes: Uint8Array | undefined,
    disposed = false,
    pending: AbortController | undefined;
  const begin = () => {
    pending?.abort();
    pending = new AbortController();
    return pending;
  };
  const reset = () => {
    bytes = undefined;
    download.disabled = true;
    textDownload.disabled = true;
    selected = undefined;
    describe();
    paper.update("");
    punch.textContent = "";
    host.querySelector("[data-device-identity]")!.textContent = "";
  };
  select.onchange = () => {
    pending?.abort();
    reset();
    view.disabled = !select.value;
  };
  host.querySelector<HTMLSelectElement>(
    '[aria-label="Observed printer columns"]',
  )!.onchange = (event) =>
    paper.setColumns(Number((event.target as HTMLSelectElement).value));
  host.querySelector<HTMLButtonElement>("[data-refresh-devices]")!.onclick =
    async () => {
      const request = begin();
      reset();
      view.disabled = true;
      try {
        const response = await fetch("/api/v1/devices", {
          signal: request.signal,
        });
        if (!response.ok)
          throw Error("Device service unavailable or sign-in required");
        const data: unknown = await response.json();
        if (!Array.isArray(data) || data.length > 4)
          throw Error("Invalid device inventory");
        if (disposed || pending !== request) return;
        rows = data.map(validate).filter((row) => row.state === "completed" && (!kind || row.kind === kind));
        select.replaceChildren(
          new Option("Choose a completed export", ""),
          ...rows.map(
            (row) =>
              new Option(
                `${row.id} · ${row.kind} · ${row.bytes} bytes`,
                row.id,
              ),
          ),
        );
        status.textContent = rows.length
          ? "Select an observation explicitly; refreshing never follows a replacement guest."
          : "No completed device exports approved.";
      } catch (error) {
        if (!disposed && pending === request)
          status.textContent = (error as Error).message;
      }
    };
  select.addEventListener("change", () => {
    view.disabled = !select.value;
  });
  view.onclick = async () => {
    const target = rows.find((row) => row.id === select.value);
    if (!target) return;
    const request = begin();
    reset();
    try {
      const response = await fetch(
        `/api/v1/devices/${encodeURIComponent(target.id)}/${encodeURIComponent(target.generation)}`,
        { signal: request.signal },
      );
      if (!response.ok)
        throw Error(
          "Observation retired or unavailable. Refresh and review a new generation explicitly.",
        );
      const data = validate(await response.json());
      if (
        data.generation !== target.generation ||
        data.id !== target.id || data.kind !== target.kind ||
        data.simulator_generation !== target.simulator_generation ||
        data.guest_generation !== target.guest_generation ||
        typeof data.data !== "string" ||
        data.data.length > 87384
      )
        throw Error("Device generation or payload mismatch");
      const decoded = Uint8Array.from(atob(data.data), (char) =>
        char.charCodeAt(0),
      );
      if (decoded.length !== data.bytes) throw Error("Device size mismatch");
      if (data.kind === "lp11" && decoded.some((byte) => byte > 127))
        throw Error("LP11 requires ASCII7 bytes");
      const digest = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", decoded)),
        (n) => n.toString(16).padStart(2, "0"),
      ).join("");
      if (digest !== data.sha256) throw Error("Device checksum mismatch");
      if (disposed || pending !== request) return;
      bytes = decoded;
      selected = data;
      textDownload.disabled = data.kind !== "lp11";
      describe(data);
      download.disabled = false;
      host.querySelector("[data-device-identity]")!.textContent =
        `${data.kind} · simulator ${data.simulator_generation} · guest ${data.guest_generation} · completed observation`;
      viewport.hidden = data.kind !== "lp11";
      punch.hidden = data.kind !== "pc11-punch";
      if (data.kind === "lp11") paper.update(new TextDecoder().decode(bytes));
      else
        punch.textContent =
          Array.from(bytes.slice(0, 512), (b) =>
            b.toString(16).padStart(2, "0"),
          ).join(" ") +
          (bytes.length > 512
            ? "\nDisplay truncated; download contains all bytes."
            : "");
      status.textContent =
        "Completed emulated-device export · checksum verified · read-only cached snapshot. Guest may have changed since capture.";
    } catch (error) {
      if (!disposed && pending === request)
        status.textContent = (error as Error).message;
    }
  };
  const save = (text: boolean) => {
    if (!bytes || !selected || (text && selected.kind !== "lp11")) return;
    const url = URL.createObjectURL(
      new Blob([bytes as Uint8Array<ArrayBuffer>], { type: text ? "text/plain;charset=us-ascii" : "application/octet-stream" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${selected.id}-${selected.generation}-completed.${text ? "txt" : "bin"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  download.onclick = () => save(false);
  textDownload.onclick = () => save(true);
  return () => {
    disposed = true;
    pending?.abort();
    paper.dispose();
    bytes = undefined;
  };
}
