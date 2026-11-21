/** Bounded experimental Tektronix serial parser, based on Tektronix 070-1225-00, §3.
 * This is a terminal byte stream, not the DEC VT11 memory-mapped display device.
 * Full first addresses initialize retained coordinates; later addresses may omit unchanged parts.
 * The caller owns the parser and renderer. Storage persists until explicit erase. */
export type TekMark =
  | {
      kind: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      style?: string;
    }
  | { kind: "text"; x: number; y: number; value: string };
export class Tek4010 {
  readonly marks: TekMark[] = [];
  private mode: "alpha" | "graph" | "incremental" = "alpha";
  private escape = false;
  private coordinate: number[] = [];
  private move = true;
  private x = 0;
  private y = 767;
  private failed = false;
  private initialized = false;
  gin = false;
  private fineCoordinates = false;
  private penDown = false;
  private lineStyle = "";
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
    this.initialized = false;
    this.gin = false;
    this.fineCoordinates = false;
    this.penDown = false;
    this.lineStyle = "";
  }
  private add(mark: TekMark) {
    if (this.marks.length >= this.limit)
      throw Error("4010 display limit reached; erase/reset required");
    this.marks.push(mark);
  }
  /** Five seven-bit GIN bytes. The caller must check the current keyboard lease.
   * Coordinates are ten-bit terminal units; mouse mapping is a browser approximation. */
  ginReply(x: number, y: number, key = " "): string {
    if (
      !this.gin ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !/^[ -~]$/.test(key)
    )
      throw Error("No valid GIN request");
    x = Math.max(0, Math.min(1023, Math.round(x)));
    y = Math.max(0, Math.min(780, Math.round(y)));
    this.gin = false;
    return (
      key +
      String.fromCharCode(
        32 + (x >> 5),
        32 + (x & 31),
        32 + (y >> 5),
        32 + (y & 31),
      )
    );
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
          else if (byte === 26) {
            this.gin = true;
            this.mode = "alpha";
          } else if (byte >= 96 && byte <= 100)
            this.lineStyle = ["", "1 3", "5 3 1 3", "5 3", "10 4"][byte - 96];
          else throw Error("Unsupported 4010 escape command");
          continue;
        }
        if (byte === 27) {
          this.escape = true;
          this.coordinate = [];
          continue;
        }
        if (byte === 29) {
          this.mode = "graph";
          this.move = true;
          this.coordinate = [];
          continue;
        }
        if (byte === 30) {
          this.mode = "incremental";
          this.coordinate = [];
          continue;
        }
        if (byte === 13) {
          this.mode = "alpha";
          this.x = 0;
          this.coordinate = [];
          continue;
        }
        if (byte === 7) continue;
        if (byte === 31) {
          this.mode = "alpha";
          this.coordinate = [];
          continue;
        }
        if (byte === 0) continue;
        if (this.mode === "incremental") {
          if (byte === 32) this.penDown = false;
          else if (byte === 80) this.penDown = true;
          else if ([65, 66, 68, 69, 70, 72, 73, 74].includes(byte)) {
            const step = this.fineCoordinates ? 0.25 : 1;
            const x = Math.max(
              0,
              Math.min(1023, this.x + (byte & 1 ? step : byte & 2 ? -step : 0)),
            );
            const y = Math.max(
              0,
              Math.min(1023, this.y + (byte & 4 ? step : byte & 8 ? -step : 0)),
            );
            if (this.penDown)
              this.add({ kind: "line", x1: this.x, y1: this.y, x2: x, y2: y });
            this.x = x;
            this.y = y;
          } else throw Error("Unsupported incremental plot code");
        } else if (this.mode === "graph") {
          const tag = byte & 96;
          if (tag === 64) {
            // Low-X terminates an address. Low-Y separates High-Y from High-X;
            // retained fields supply omitted values (4010 manual, section 3).
            let hy = this.y >> 5,
              ly = this.y & 31,
              hx = this.x >> 5;
            let sawY = false,
              highY = false,
              highX = false;
            const parts = [...this.coordinate];
            const extraIndex = parts.findIndex(
              (part, i) => (part & 96) === 96 && (parts[i + 1] & 96) === 96,
            );
            // The V7 t4014 driver includes an extra low-bit byte. Display at
            // 4010 resolution by dropping those two subpixel bits, explicitly.
            if (extraIndex >= 0) {
              parts.splice(extraIndex, 1);
              this.fineCoordinates = true;
            }
            for (const part of parts) {
              if ((part & 96) === 96) {
                if (sawY)
                  throw Error("4014 extended addressing is not supported");
                ly = part & 31;
                sawY = true;
              } else if (!sawY) {
                if (highY) throw Error("Invalid 4010 High-Y sequence");
                hy = part & 31;
                highY = true;
              } else {
                if (highX) throw Error("Invalid 4010 High-X sequence");
                hx = part & 31;
                highX = true;
              }
            }
            if (!this.initialized && !(highY && sawY && highX))
              throw Error("First 4010 address must be complete");
            const x = hx * 32 + (byte & 31),
              y = hy * 32 + ly;
            if (!this.move)
              this.add({
                kind: "line",
                x1: this.x,
                y1: this.y,
                x2: x,
                y2: y,
                ...(this.lineStyle ? { style: this.lineStyle } : {}),
              });
            this.x = x;
            this.y = y;
            this.move = false;
            this.coordinate = [];
            this.initialized = true;
          } else if ((tag === 32 || tag === 96) && this.coordinate.length < 4)
            this.coordinate.push(byte);
          else throw Error("Invalid or oversized 4010 coordinate");
        } else if (byte === 13) this.x = 0;
        else if (byte === 10) this.y = Math.max(0, this.y - 22);
        else if (byte === 8) this.x = Math.max(0, this.x - 14);
        else if (byte === 7 || byte === 127) continue;
        else if (byte >= 32 && byte <= 126) {
          this.add({
            kind: "text",
            x: this.x,
            y: this.y,
            value: String.fromCharCode(byte),
          });
          this.x += 14;
          if (this.x > 1023) {
            this.x = 0;
            this.y = Math.max(0, this.y - 22);
          }
        } else throw Error("Unsupported 4010 alpha character/control");
      }
    } catch (error) {
      this.failed = true;
      throw error;
    }
  }
}
/** Deterministic fixture, not output from a guest application. Full addresses only. */
export function tekFixture(): Uint8Array {
  const bytes = [
    27,
    12,
    ...Array.from("4010 VECTOR FIXTURE - NO GUEST", (c) => c.charCodeAt(0)),
    29,
  ];
  for (const [x, y] of [
    [100, 100],
    [900, 100],
    [500, 650],
    [100, 100],
    [900, 100],
    [900, 650],
  ]) {
    bytes.push(32 + (y >> 5), 96 + (y & 31), 32 + (x >> 5), 64 + (x & 31));
  }
  return Uint8Array.from(bytes);
}
