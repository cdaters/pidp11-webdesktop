import { VT220Profile } from "./vt220.ts";
import { TeletypePaper } from "./teletype.ts";
import { decKey } from "./terminal-protocol.ts";

export type TerminalPersonality = "vt100" | "vt52" | "vt220" | "asr33" | "tek4010";

/** A connection owns its personality parser. VT52 is translated into bounded ANSI
 * operations for the existing renderer, never interpreted as incoming ANSI.
 * DEC EK-VT5X-OP-001, pp.16–23: no wrap; out-of-range row preserves the row.
 * Graphics/copier commands are outside this initial text subset. */
export class TerminalProfile {
  readonly personality: TerminalPersonality;
  private state: "text" | "escape" | "row" | "column" = "text";
  private row = 0;
  private column = 0;
  private addressedRow = 0;
  private alternateKeypad = false;
  private vt220 = new VT220Profile();
  readonly paper = new TeletypePaper();

  constructor(personality: TerminalPersonality) { this.personality = personality; }

  /** Initial renderer configuration; a new profile is required on reconnect. */
  get initial(): string { return (this.personality === "vt52" || this.personality === "asr33") ? "\x1b[?7l" : ""; }

  key(code: string, keypad = false, cursor = false): string | undefined {
    if (this.personality === "vt220") return this.vt220.key(code) ?? decKey(code, keypad, cursor);
    if (this.personality === "asr33" && /^(Arrow|F[0-9]|Home|End|Page|Insert)/.test(code)) return "";
    if (code === "Delete") return "\x7f";
    if (this.personality === "vt100" || this.personality === "asr33") return decKey(code, keypad, cursor);
    const arrows: Record<string, string> = { ArrowUp: "A", ArrowDown: "B", ArrowRight: "C", ArrowLeft: "D" };
    if (arrows[code]) return `\x1b${arrows[code]}`;
    // The VT52 has three function keys, unlike the VT100's four PF keys.
    if (/^F[1-3]$/.test(code)) return `\x1b${String.fromCharCode(79 + Number(code[1]))}`;
    if (/^(F([4-9]|1[0-9]|20)|Home|End|Insert|PageUp|PageDown)$/.test(code)) return "";
    if (/^Numpad[0-9]$/.test(code) || code === "NumpadDecimal" || code === "NumpadEnter") {
      return decKey(code, this.alternateKeypad)?.replace("\x1bO", "\x1b?");
    }
    return undefined;
  }

  /** Replies must pass through the same keyboard lease gate as human input.
   * No pending input is retained: parser storage is constant; chunks are <=64KiB. */
  feed(bytes: Uint8Array): { display: string | Uint8Array; replies: string[] } {
    if (bytes.length > 65536) throw Error("Terminal chunk exceeds 64 KiB");
    if (this.personality === "vt100") return { display: bytes, replies: [] };
    if (this.personality === "vt220") return this.vt220.feed(bytes);
    if (this.personality === "asr33") return { display: this.paper.feed(bytes), replies: [] };
    let display = "";
    const replies: string[] = [];
    const position = () => `\x1b[${this.row + 1};${this.column + 1}H`;
    for (const byte of bytes) {
      if (byte > 127) throw Error("VT52 profile requires ASCII7");
      const char = String.fromCharCode(byte);
      // Fill characters do not terminate an escape; repeated ESC restarts it.
      if (byte === 0 || byte === 127) continue;
      if (byte === 27) { this.state = "escape"; continue; }
      if (byte < 32) {
        if (byte === 13) { this.column = 0; display += "\r"; }
        else if (byte === 10) { this.row = Math.min(23, this.row + 1); display += "\n"; }
        else if (byte === 8) { this.column = Math.max(0, this.column - 1); display += "\b"; }
        else if (byte === 9) {
          this.column = this.column >= 72 ? Math.min(79, this.column + 1) : (Math.floor(this.column / 8) + 1) * 8;
          display += position();
        } else if (byte === 7) display += "\x07";
        continue;
      }
      if (this.state === "row") { this.addressedRow = byte - 32; this.state = "column"; continue; }
      if (this.state === "column") {
        if (this.addressedRow < 24) this.row = this.addressedRow;
        this.column = Math.min(79, byte - 32);
        display += position();
        this.state = "text";
        continue;
      }
      if (this.state === "escape") {
        this.state = "text";
        switch (char) {
          case "A": this.row = Math.max(0, this.row - 1); display += position(); break;
          case "B": this.row = Math.min(23, this.row + 1); display += position(); break;
          case "C": this.column = Math.min(79, this.column + 1); display += position(); break;
          case "D": this.column = Math.max(0, this.column - 1); display += position(); break;
          case "H": this.row = this.column = 0; display += position(); break;
          case "I": this.row = Math.max(0, this.row - 1); display += "\x1bM"; break;
          case "J": display += "\x1b[J"; break;
          case "K": display += "\x1b[K"; break;
          case "Y": this.state = "row"; break;
          case "Z": replies.push("\x1b/K"); break;
          case "=": this.alternateKeypad = true; break;
          case ">": this.alternateKeypad = false; break;
        }
        continue;
      }
      display += char;
      this.column = Math.min(79, this.column + 1);
    }
    return { display, replies };
  }
}
