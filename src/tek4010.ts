/** Initial 4010 fixture parser, based on Tektronix 070-1225-00, §3.
 * This is a terminal byte stream, not the DEC VT11 memory-mapped display device.
 * Only full four-byte addresses are accepted; compressed addresses fail closed.
 * The caller owns the parser and renderer. Storage persists until explicit erase. */
export type TekMark = { kind: "line"; x1: number; y1: number; x2: number; y2: number }
  | { kind: "text"; x: number; y: number; value: string };
export class Tek4010 {
  readonly marks: TekMark[] = [];
  private mode: "alpha" | "graph" = "alpha";
  private escape = false;
  private coordinate: number[] = [];
  private move = true;
  private x = 0;
  private y = 767;
  private failed = false;
  readonly limit = 4096;

  reset() {
    this.marks.length = 0;
    this.coordinate = [];
    this.mode = "alpha";
    this.escape = false;
    this.move = true;
    this.x = 0;
    this.y = 767;
    this.failed = false;
  }
  private add(mark: TekMark) {
    if (this.marks.length >= this.limit) throw Error("4010 display limit reached; erase/reset required");
    this.marks.push(mark);
  }
  feed(bytes: Uint8Array) {
    if (this.failed) throw Error("4010 parser stopped; reset required");
    try {
      if (bytes.length > 65536) throw Error("4010 chunk exceeds 64 KiB");
      for (const byte of bytes) {
        if (byte > 127) throw Error("4010 requires seven-bit data");
        if (this.escape) {
          this.escape = false;
          if (byte === 12) this.reset();
          else throw Error("Unsupported 4010 escape command");
          continue;
        }
        if (byte === 27) { this.escape = true; this.coordinate = []; continue; }
        if (byte === 29) { this.mode = "graph"; this.move = true; this.coordinate = []; continue; }
        if (byte === 31) { this.mode = "alpha"; this.coordinate = []; continue; }
        if (byte === 0) continue;
        if (this.mode === "graph") {
          const tag = byte & 96;
          const expected = [32, 96, 32, 64][this.coordinate.length];
          if (tag !== expected) throw Error("Initial 4010 subset requires full High-Y, Low-Y, High-X, Low-X addresses");
          this.coordinate.push(byte & 31);
          if (this.coordinate.length === 4) {
            const [hy, ly, hx, lx] = this.coordinate;
            const x = hx * 32 + lx, y = hy * 32 + ly;
            if (!this.move) this.add({ kind: "line", x1: this.x, y1: this.y, x2: x, y2: y });
            this.x = x; this.y = y; this.move = false; this.coordinate = [];
          }
        } else if (byte === 13) this.x = 0;
        else if (byte === 10) this.y = Math.max(0, this.y - 22);
        else if (byte === 8) this.x = Math.max(0, this.x - 14);
        else if (byte >= 32 && byte <= 95) {
          this.add({ kind: "text", x: this.x, y: this.y, value: String.fromCharCode(byte) });
          this.x += 14;
          if (this.x > 1023) { this.x = 0; this.y = Math.max(0, this.y - 22); }
        } else throw Error("Unsupported 4010 alpha character/control");
      }
    } catch (error) { this.failed = true; throw error; }
  }
}
/** Deterministic fixture, not output from a guest application. Full addresses only. */
export function tekFixture(): Uint8Array {
  const bytes = [27, 12, ...Array.from("4010 VECTOR FIXTURE - NO GUEST", c => c.charCodeAt(0)), 29];
  for (const [x, y] of [[100,100], [900,100], [500,650], [100,100], [900,100], [900,650]]) {
    bytes.push(32 + (y >> 5), 96 + (y & 31), 32 + (x >> 5), 64 + (x & 31));
  }
  return Uint8Array.from(bytes);
}
