/** Byte/key helpers and offline protocol fixtures; this module opens no connection.
 * decKey is shared by mock and genuine xterm views. TerminalChannel and TelnetNVT
 * are fixture models, not the M5.0 raw DC11 transport or xterm's VT100 parser. */
export type Encoding = "ascii7" | "latin1-controls" | "utf8";
export class TerminalDecoder {
  private utf8 = new TextDecoder("utf-8", { fatal: true });
  encoding: Encoding;
  constructor(encoding: Encoding = "ascii7") { this.encoding = encoding; }
  decode(bytes: Uint8Array, final = false): string {
    if (this.encoding === "utf8") return this.utf8.decode(bytes, { stream: !final });
    if (this.encoding === "ascii7" && bytes.some((b) => b > 127)) throw Error("Non-ASCII byte in 7-bit profile");
    return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  }
}
/** Encode DEC keypad/cursor modes reported by xterm; undefined leaves other keys
 * to xterm. SS3 (ESC O) and CSI (ESC [) are intentionally different sequences. */
export function decKey(code: string, applicationKeypad: boolean, applicationCursor = false): string | undefined {
  const arrows: Record<string, string> = { ArrowUp: "A", ArrowDown: "B", ArrowRight: "C", ArrowLeft: "D" };
  if (arrows[code]) return `\x1b${applicationCursor ? "O" : "["}${arrows[code]}`;
  if (/^F[1-4]$/.test(code)) return `\x1bO${String.fromCharCode(79 + Number(code[1]))}`;
  const keys: Record<string, [string, string]> = { NumpadEnter: ["\r", "M"], NumpadSubtract: ["-", "m"], NumpadComma: [",", "l"], NumpadDecimal: [".", "n"] };
  for (let n = 0; n < 10; n++) keys[`Numpad${n}`] = [String(n), String.fromCharCode(112 + n)];
  const key = keys[code];
  return key ? applicationKeypad ? `\x1bO${key[1]}` : key[0] : undefined;
}
/** The mock is a line editor, not a terminal transport. Consume whole escape
 * sequences, including split CSI/SS3/OSC, rather than printing their tails. */
export class MockInputFilter {
  private mode: "text" | "esc" | "csi" | "ss3" | "osc" | "osc-esc" = "text";
  reset() { this.mode = "text"; }
  feed(data: string) {
    let text = "";
    for (const c of data) {
      if (this.mode === "text") { if (c === "\x1b") this.mode = "esc"; else text += c; }
      else if (this.mode === "esc") this.mode = c === "[" ? "csi" : c === "O" ? "ss3" : c === "]" ? "osc" : "text";
      else if (this.mode === "csi") { if (c >= "@" && c <= "~") this.mode = "text"; }
      else if (this.mode === "ss3") this.mode = "text";
      else if (this.mode === "osc") { if (c === "\x07") this.mode = "text"; else if (c === "\x1b") this.mode = "osc-esc"; }
      else this.mode = c === "\\" ? "text" : "osc";
    }
    return text;
  }
}
/** Bounded offline session queue. Reconnect discards bytes and keyboard ownership.
 * XON/XOFF is opt-in; binary protocols must leave software flow control disabled. */
export class TerminalChannel {
  connected = false;
  owner = false;
  paused = false;
  private pending: number[] = [];
  readonly limit = 65536;
  connect() { this.disconnect(); this.connected = true; }
  disconnect() { this.connected = false; this.owner = false; this.paused = false; this.pending = []; }
  acquire() { if (!this.connected) throw Error("Disconnected"); this.owner = true; }
  release() { this.owner = false; this.pending = []; }
  send(bytes: Uint8Array) {
    if (!this.connected || !this.owner) return false;
    if (this.pending.length + bytes.length > this.limit) { this.disconnect(); throw Error("Terminal input backlog exceeded"); }
    this.pending.push(...bytes); return true;
  }
  flow(byte: number) { if (byte === 19) this.paused = true; if (byte === 17) this.paused = false; }
  drain(max = 4096) { return Uint8Array.from(this.paused ? [] : this.pending.splice(0, Math.min(4096, Math.max(0, max)))); }
  get queued() { return this.pending.length; }
}
/** Conservative offline Telnet NVT parser: rejects all optional negotiation.
 * No BINARY/NAWS/TTYPE claims. IAC escape survives; subnegotiation is bounded
 * without retaining its payload. Unsupported directions cannot negotiate loops. */
export class TelnetNVT {
  private state: "data" | "iac" | "option" | "sb" | "sb-iac" = "data";
  private verb = 0;
  private subBytes = 0;
  private cr = false;
  private rejected = new Set<number>();
  feed(bytes: Uint8Array) {
    const data: number[] = [], reply: number[] = [];
    const payload = (b: number) => { if (this.cr && b === 0) { this.cr = false; return; } this.cr = b === 13; data.push(b); };
    for (const b of bytes) {
      if (this.state === "data") { if (b === 255) this.state = "iac"; else payload(b); }
      else if (this.state === "iac") {
        if (b === 255) { payload(b); this.state = "data"; }
        else if (b >= 251 && b <= 254) { this.verb = b; this.state = "option"; }
        else if (b === 250) { this.subBytes = 0; this.state = "sb"; }
        else this.state = "data";
      } else if (this.state === "option") {
        const key = this.verb * 256 + b;
        if ((this.verb === 251 || this.verb === 253) && !this.rejected.has(key)) {
          reply.push(255, this.verb === 251 ? 254 : 252, b); this.rejected.add(key);
        }
        if (this.verb === 252) this.rejected.delete(251 * 256 + b);
        if (this.verb === 254) this.rejected.delete(253 * 256 + b);
        this.state = "data";
      } else {
        if (++this.subBytes > 1024) throw Error("Telnet subnegotiation too long");
        if (this.state === "sb-iac") this.state = b === 240 ? "data" : "sb";
        else if (b === 255) this.state = "sb-iac";
      }
    }
    return { data: Uint8Array.from(data), reply: Uint8Array.from(reply) };
  }
  end() { if (this.state !== "data") throw Error("Truncated Telnet command"); }
  static encode(bytes: Uint8Array) {
    const out: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]; out.push(b);
      if (b === 255) out.push(255);
      if (b === 13 && bytes[i + 1] !== 10) out.push(0);
    }
    return Uint8Array.from(out);
  }
}
