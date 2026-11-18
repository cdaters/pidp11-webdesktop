import { PaperViewer, shortPrinterSample, diagnosticPrinterSample } from "./printer.ts";
import type { VirtualDevices } from "./devices.ts";

/** Bind the printer window to shared VirtualDevices. act routes state changes
 * through desktop refresh; download receives original spool text. The caller must
 * dispose the viewer when removing this window. No guest printer is attached. */
export class PrinterApp {
  private viewer: PaperViewer;
  private jobs: HTMLElement;
  constructor(el: HTMLElement, devices: VirtualDevices, act: (fn: () => void) => void,
    download: (name: string, data: string) => void) {
    el.classList.add("printer-app");
    el.innerHTML = `<div class="app-heading"><div><h2>Line printer / LP0</h2><p>Local text spool · 32 jobs maximum · no guest connected</p></div><span class="source-tag">SIMULATION</span></div>
      <div class="printer-controls"><label>Sample <select data-sample-kind aria-label="Sample listing"><option value="short">Hello listing</option><option value="diagnostic">Diagnostic listing</option></select></label><button data-sample>Add sample job</button><button data-print>Print queue</button><button data-spool>Download spool</button><button data-clear>Clear queue</button></div>
      <div class="paper-toolbar"><label>Paper <select data-columns aria-label="Paper columns"><option value="80">80 columns</option><option value="132">132 columns</option></select></label><span class="paper-position" role="status" aria-live="off"></span><button data-top>Top</button><button data-bottom>Latest output</button></div>
      <div class="paper-viewport" tabindex="0" role="region" aria-label="Printer listing, scroll vertically or horizontally" aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown Home End"></div>
      <div class="paper-caption">66 lines per page · tabs every 8 columns · download preserves original text</div>
      <details class="printer-jobs"><summary>Queue <span data-job-count></span></summary><ul class="job-list"></ul></details>`;
    this.jobs = el.querySelector(".job-list")!;
    this.viewer = new PaperViewer(el.querySelector(".paper-viewport")!, el.querySelector(".paper-position")!);
    el.querySelector<HTMLSelectElement>("[data-columns]")!.onchange = e => this.viewer.setColumns(Number((e.target as HTMLSelectElement).value));
    el.querySelector<HTMLButtonElement>("[data-top]")!.onclick = () => this.viewer.jump(false);
    el.querySelector<HTMLButtonElement>("[data-bottom]")!.onclick = () => this.viewer.jump(true);
    el.querySelector<HTMLButtonElement>("[data-sample]")!.onclick = () => act(() => {
      const dense = el.querySelector<HTMLSelectElement>("[data-sample-kind]")!.value === "diagnostic";
      devices.queue(dense ? "MEMORY.MAC demonstration" : "HELLO.MAC listing", dense ? diagnosticPrinterSample() : shortPrinterSample);
    });
    el.querySelector<HTMLButtonElement>("[data-print]")!.onclick = () => act(() => devices.print());
    el.querySelector<HTMLButtonElement>("[data-clear]")!.onclick = () => act(() => devices.clear());
    el.querySelector<HTMLButtonElement>("[data-spool]")!.onclick = () => download("pidp11-demo-spool.txt", devices.spool());
  }
  update(devices: VirtualDevices) {
    this.viewer.update(devices.spool());
    this.jobs.replaceChildren(...devices.jobs.map(job => {
      const item = document.createElement("li"); item.textContent = `#${job.id} ${job.name} — ${job.state}`; return item;
    }));
    this.jobs.closest("details")!.querySelector("[data-job-count]")!.textContent = `(${devices.jobs.filter(j => j.state === "queued").length} queued / ${devices.jobs.length} total)`;
  }
  dispose() { this.viewer.dispose(); }
}
