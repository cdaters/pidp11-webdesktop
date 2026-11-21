import { decodePrinterSpool } from "./printer-import.ts";
import {
  PaperViewer,
  shortPrinterSample,
  diagnosticPrinterSample,
} from "./printer.ts";
import type { VirtualDevices } from "./devices.ts";

/** Bind the printer window to shared VirtualDevices. act routes state changes
 * through desktop refresh; download receives original spool text. The caller must
 * dispose the viewer when removing this window. No guest printer is attached. */
export class PrinterApp {
  private viewer: PaperViewer;
  private jobs: HTMLElement;
  private importGeneration = 0;
  private disposed = false;
  constructor(
    el: HTMLElement,
    devices: VirtualDevices,
    act: (fn: () => void) => void,
    download: (name: string, data: string) => void,
  ) {
    el.classList.add("printer-app");
    el.innerHTML = `<div class="app-heading"><div><h2>Line printer / LP0</h2><p>Local text spool · 32 jobs maximum · no guest connected</p></div><span class="source-tag">SIMULATION</span></div>
      <div class="printer-controls"><label>Sample <select data-sample-kind aria-label="Sample listing"><option value="short">Hello listing</option><option value="diagnostic">Diagnostic listing</option></select></label><button data-sample>Add sample job</button><button data-print>Print queue</button><button data-spool>Download spool</button><button data-clear>Clear queue</button></div>
      <label class="file-label">Import local text spool (16 KiB maximum)<input type="file" aria-label="Import printer text spool" data-import-spool></label><p data-import-status role="status">Imported files are local snapshots, not a live guest printer connection.</p>
      <div class="paper-toolbar"><label>Paper <select data-columns aria-label="Paper columns"><option value="80">80 columns</option><option value="132">132 columns</option></select></label><span class="paper-position" role="status" aria-live="off"></span><button data-top>Top</button><button data-bottom>Latest output</button></div>
      <div class="paper-viewport" tabindex="0" role="region" aria-label="Printer listing, scroll vertically or horizontally" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown Home End"></div>
      <div class="paper-caption">66 lines per page · tabs every 8 columns · download preserves original text</div>
      <details class="printer-jobs"><summary>Queue <span data-job-count></span></summary><ul class="job-list"></ul></details>`;
    this.jobs = el.querySelector(".job-list")!;
    this.viewer = new PaperViewer(
      el.querySelector(".paper-viewport")!,
      el.querySelector(".paper-position")!,
    );
    el.querySelector<HTMLSelectElement>("[data-columns]")!.onchange = (e) =>
      this.viewer.setColumns(Number((e.target as HTMLSelectElement).value));
    el.querySelector<HTMLButtonElement>("[data-top]")!.onclick = () =>
      this.viewer.jump(false);
    el.querySelector<HTMLButtonElement>("[data-bottom]")!.onclick = () =>
      this.viewer.jump(true);
    el.querySelector<HTMLButtonElement>("[data-sample]")!.onclick = () =>
      act(() => {
        const dense =
          el.querySelector<HTMLSelectElement>("[data-sample-kind]")!.value ===
          "diagnostic";
        devices.queue(
          dense ? "MEMORY.MAC demonstration" : "HELLO.MAC listing",
          dense ? diagnosticPrinterSample() : shortPrinterSample,
        );
      });
    el.querySelector<HTMLButtonElement>("[data-print]")!.onclick = () =>
      act(() => devices.print());
    el.querySelector<HTMLButtonElement>("[data-clear]")!.onclick = () => {
      this.importGeneration++;
      act(() => devices.clear());
    };
    el.querySelector<HTMLButtonElement>("[data-spool]")!.onclick = () =>
      download("pidp11-demo-spool.txt", devices.spool());
    const fileInput = el.querySelector<HTMLInputElement>(
      "[data-import-spool]",
    )!;
    const importStatus = el.querySelector<HTMLElement>("[data-import-status]")!;
    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      const generation = ++this.importGeneration;
      fileInput.value = "";
      if (!file) return;
      if (file.size > 16384 || !file.size) {
        importStatus.textContent =
          "Choose a nonempty text spool of at most 16 KiB.";
        return;
      }
      importStatus.textContent = "Reading local snapshot…";
      try {
        const text = decodePrinterSpool(
          new Uint8Array(await file.arrayBuffer()),
        );
        if (this.disposed || generation !== this.importGeneration) return;
        let queued = false;
        act(() => {
          devices.queue(`Imported text: ${file.name}`, text);
          queued = true;
        });
        importStatus.textContent = queued
          ? "Local snapshot queued; use Print queue. No guest attached."
          : "Snapshot not queued; check the printer queue limit.";
      } catch (error) {
        if (!this.disposed && generation === this.importGeneration)
          importStatus.textContent = (error as Error).message;
      }
    };
  }
  update(devices: VirtualDevices) {
    this.viewer.update(devices.spool());
    this.jobs.replaceChildren(
      ...devices.jobs.map((job) => {
        const item = document.createElement("li");
        item.textContent = `#${job.id} ${job.name} — ${job.state}`;
        return item;
      }),
    );
    this.jobs
      .closest("details")!
      .querySelector("[data-job-count]")!.textContent =
      `(${devices.jobs.filter((j) => j.state === "queued").length} queued / ${devices.jobs.length} total)`;
  }
  dispose() {
    this.disposed = true;
    this.importGeneration++;
    this.viewer.dispose();
  }
}
