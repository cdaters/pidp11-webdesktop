/** Bounded paper record for an ASR-33-inspired presentation, not device timing.
 * CR returns the carriage, LF advances paper without returning it, BS backs up.
 * Overstrike keeps the latest glyph; ink accumulation/mechanical timing are not modeled.
 * Only the terminal view owns this record; it never sends or stores guest input. */
export class TeletypePaper {
  readonly lines: string[] = [""];
  column = 0;
  bells = 0;
  discardedLines = 0;
  readonly maxLines = 512;

  feed(bytes: Uint8Array): string {
    if (bytes.length > 65536) throw Error("Teletype chunk exceeds 64 KiB");
    let display = "";
    for (const byte of bytes) {
      if (byte > 127) throw Error("Teletype requires ASCII7");
      if (byte === 7) {
        this.bells++;
        continue;
      }
      if (byte === 13) {
        this.column = 0;
        display += "\r";
      } else if (byte === 10) {
        this.lines.push("");
        display += "\n";
        if (this.lines.length > this.maxLines) {
          this.lines.shift();
          this.discardedLines++;
        }
      } else if (byte === 8) {
        this.column = Math.max(0, this.column - 1);
        display += "\b";
      } else if (byte >= 32 && byte < 127) {
        const glyph = String.fromCharCode(byte).toUpperCase();
        const line = this.lines[this.lines.length - 1].padEnd(this.column, " ");
        this.lines[this.lines.length - 1] =
          line.slice(0, this.column) + glyph + line.slice(this.column + 1);
        this.column = Math.min(71, this.column + 1);
        display += glyph;
      }
    }
    return display;
  }
  get text(): string {
    return this.lines.join("\n");
  }
}
