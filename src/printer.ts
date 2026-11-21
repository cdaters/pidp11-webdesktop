/** Presentation only: original spool bytes remain owned by VirtualDevices. */
export const PAGE_LINES = 66;
export const TAB_COLUMNS = 8;
export const PAPER_LINE_HEIGHT = 18;
const MAX_SCROLL_HEIGHT = 8_000_000;
export interface PaperListing {
  rows: Map<number, string>;
  pageCount: number;
  lineCount: number;
  maxColumns: number;
}

/** CRLF and lone CR are display newlines; no impact-printer overstrike emulation.
 * FF always advances to the next page. Empty rows are implicit, not DOM nodes. */
export function paginateSpool(spool: string, deviceSemantics = false): PaperListing {
  const rows = new Map<number, string>();
  let row = 0, line = "", columns = 0, maxColumns = 0;
  const flush = () => {
    if (line) rows.set(row, line);
    maxColumns = Math.max(maxColumns, columns, line.length);
    line = ""; columns = 0;
  };
  for (let i = 0; i < spool.length; i++) {
    const c = spool[i]!;
    if (deviceSemantics && c === "\r") { columns = 0; }
    else if (deviceSemantics && c === "\b") { columns = Math.max(0, columns - 1); }
    else if (c === "\r" || c === "\n") {
      flush(); row++;
      if (c === "\r" && spool[i + 1] === "\n") i++;
    } else if (c === "\f") {
      flush(); row = (Math.floor(row / PAGE_LINES) + 1) * PAGE_LINES;
    } else if (c === "\t") {
      const n = TAB_COLUMNS - columns % TAB_COLUMNS;
      if (!deviceSemantics) line += " ".repeat(n);
      columns += n;
    } else {
      if (deviceSemantics) line = line.padEnd(columns, " ").slice(0, columns) + c + line.slice(columns + 1);
      else line += c;
      columns++;
    }
  }
  flush();
  return { rows, pageCount: Math.floor(row / PAGE_LINES) + 1, lineCount: row + 1, maxColumns };
}

export const shortPrinterSample = "\t.TITLE HELLO\n; SYNTHETIC LISTING — NO ASSEMBLER EXECUTED\nSTART:  MOV #MESSAGE,R1\n        HALT\nMESSAGE: .ASCIZ /HELLO, WORLD/\n\t.END START\n";
/** Original illustrative listing, not assembled code or output from a guest. */
export function diagnosticPrinterSample(): string {
  const lines = ["PiDP-11 / LP0     MEMORY EXERCISE                         DEMONSTRATION",
    "Original illustrative listing — no assembler or guest executed", "",
    " LINE  ADDRESS  WORD     LABEL     OPERATION             COMMENT", ""];
  for (let i = 0; i < 148; i++) {
    if (i === 70) lines.push("\fSECOND PASS — CONTINUED DIAGNOSTIC LISTING", "");
    lines.push(`${String(i + 1).padStart(5)}  ${(0o1000 + i * 2).toString(8).padStart(6, "0")}   ${["012700", "005020", "077002", "000240"][i % 4]}   ${i % 8 === 0 ? "TEST" + String(i).padStart(3, "0") + ":" : "        "}  ${["MOV #COUNT,R0", "CLR (R0)+", "SOB R0,LOOP", "NOP"][i % 4]!.padEnd(20)}; ${i % 4 === 0 ? "initialize test counter" : "illustrative cycle " + (i + 1)}`);
    if (i % 19 === 18) lines.push("");
  }
  lines.push("", "END OF DEMONSTRATION   000 ERRORS (SYNTHETIC)");
  return lines.join("\n");
}

/** Sparse rows plus a bounded scroll surface handle even form-feed-heavy jobs.
 * Only visible rows and a small overscan are mounted. No per-character nodes. */
/** Render only a bounded visible portion of a listing, never the full paper length.
 * Owns a resize observer and scheduled frame; the window owner must call dispose.
 * It may normalize display layout, but must never rewrite the downloadable spool. */
export class PaperViewer {
  private listing = paginateSpool("");
  private source = "";
  private deviceSemantics: boolean;
  private columns = 80;
  private following = true;
  private frame = 0;
  private resize: ResizeObserver;
  private strip: HTMLElement;
  private layer: HTMLElement;
  private scale = 1;
  private paintedRows = PAGE_LINES;
  readonly viewport: HTMLElement;
  private position: HTMLElement;
  constructor(viewport: HTMLElement, position: HTMLElement, deviceSemantics = false) {
    this.deviceSemantics = deviceSemantics;
    this.viewport = viewport; this.position = position;
    this.strip = document.createElement("div");
    this.strip.className = "printer-paper";
    this.strip.style.setProperty("--paper-line-height", `${PAPER_LINE_HEIGHT}px`);
    this.layer = document.createElement("div");
    this.layer.className = "paper-rows";
    this.strip.append(this.layer); viewport.append(this.strip);
    viewport.addEventListener("scroll", () => {
      this.following = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop < 36;
      this.schedule();
    });
    viewport.addEventListener("keydown", e => {
      if (e.target !== viewport || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-36, 0], ArrowRight: [36, 0],
        ArrowUp: [0, -PAPER_LINE_HEIGHT], ArrowDown: [0, PAPER_LINE_HEIGHT],
        PageUp: [0, -Math.max(PAPER_LINE_HEIGHT, viewport.clientHeight - PAPER_LINE_HEIGHT)],
        PageDown: [0, Math.max(PAPER_LINE_HEIGHT, viewport.clientHeight - PAPER_LINE_HEIGHT)],
      };
      if (e.key === "Home" || e.key === "End") { e.preventDefault(); this.jump(e.key === "End"); }
      else if (moves[e.key]) {
        e.preventDefault();
        const [left, top] = moves[e.key]!; viewport.scrollBy({ left, top, behavior: "instant" });
      }
    });
    this.resize = new ResizeObserver(() => this.layout());
    this.resize.observe(viewport);
    this.layout();
  }
  dispose() { this.resize.disconnect(); cancelAnimationFrame(this.frame); }
  setColumns(columns: number) { this.columns = columns; this.layout(); }
  update(spool: string) {
    if (spool === this.source) return;
    const wasEmpty = !this.source;
    const logicalTop = this.viewport.scrollTop * this.scale;
    this.source = spool; this.listing = paginateSpool(spool, this.deviceSemantics);
    // First output starts at its heading. Later appended output follows only
    // when already at the end; unrelated app refreshes never reset this view.
    this.layout();
    if (!spool || wasEmpty) {
      this.viewport.scrollTop = 0;
      this.following = !!spool && this.viewport.scrollHeight - this.viewport.clientHeight < 36;
    }
    else if (this.following) this.viewport.scrollTop = this.viewport.scrollHeight;
    else this.viewport.scrollTop = logicalTop / this.scale;
    this.draw();
  }
  jump(end: boolean) {
    this.following = end;
    this.viewport.scrollTo({ top: end ? this.viewport.scrollHeight : 0,
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches || this.scale > 1 ? "instant" : "smooth" });
  }
  private schedule() {
    if (!this.frame) this.frame = requestAnimationFrame(() => { this.frame = 0; this.draw(); });
  }
  private layout() {
    const oldTop = this.viewport.scrollTop * this.scale;
    // Leave a short paper tail after the ink, not a full blank final page:
    // Latest output must keep the last printed lines in view.
    const rows = this.source ? Math.min(this.listing.pageCount * PAGE_LINES, this.listing.lineCount + 6) : PAGE_LINES;
    this.paintedRows = Math.max(rows, Math.ceil(this.viewport.clientHeight / PAPER_LINE_HEIGHT));
    const height = this.paintedRows * PAPER_LINE_HEIGHT;
    const surface = Math.min(height, MAX_SCROLL_HEIGHT);
    this.scale = Math.max(1, (height - this.viewport.clientHeight) / Math.max(1, surface - this.viewport.clientHeight));
    this.strip.style.height = `${surface}px`;
    this.strip.style.width = `calc(${Math.max(this.columns, this.listing.maxColumns)}ch + 106px)`;
    this.viewport.scrollTop = oldTop / this.scale;
    this.draw();
  }
  private draw() {
    const top = this.viewport.scrollTop * this.scale;
    const start = Math.max(0, Math.floor(top / PAPER_LINE_HEIGHT) - 3);
    const end = Math.min(this.paintedRows,
      Math.ceil((top + this.viewport.clientHeight) / PAPER_LINE_HEIGHT) + 3);
    this.layer.style.top = `${this.viewport.scrollTop + start * PAPER_LINE_HEIGHT - top}px`;
    const fragment = document.createDocumentFragment();
    for (let row = start; row < end; row++) {
      const el = document.createElement("div");
      el.className = `paper-line${row % 2 ? " blue-row" : ""}${row && row % PAGE_LINES === 0 ? " perforation" : ""}`;
      el.dataset.row = String(row);
      const ink = document.createElement("span");
      ink.className = "paper-ink";
      ink.textContent = this.listing.rows.get(row) ?? "";
      el.append(ink); fragment.append(el);
    }
    this.layer.replaceChildren(fragment);
    const page = Math.min(this.listing.pageCount, Math.floor(top / (PAGE_LINES * PAPER_LINE_HEIGHT)) + 1);
    this.position.textContent = `${this.source ? "Page" : "LP0 ready · blank page"} ${page} / ${this.listing.pageCount}${this.following && this.source ? " · following" : ""}`;
  }
}
