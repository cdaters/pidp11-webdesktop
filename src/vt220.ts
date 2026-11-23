/** Initial VT220 control adapter (DEC EK-VT220-RM, chapter 4).
 * Display operations use xterm, but identity and editing keys are VT220-specific.
 * This service deliberately retains seven-bit keyboard/reply transport. C1 input
 * is normalized before xterm's UTF-8 decoder; unsupported 8-bit replies fail visibly.
 * Storage is bounded to one 128-character sequence per connection. */
export class VT220Profile {
  private pending = "";

  key(code: string): string | undefined {
    const editing: Record<string, string> = {
      Home: "1",
      Insert: "2",
      Delete: "3",
      End: "4",
      PageUp: "5",
      PageDown: "6",
      F6: "17",
      F7: "18",
      F8: "19",
      F9: "20",
      F10: "21",
      F11: "23",
      F12: "24",
      F13: "25",
      F14: "26",
      F15: "28", // HELP
      F16: "29", // DO
      F17: "31",
      F18: "32",
      F19: "33",
      F20: "34",
    };
    return editing[code] ? `\x1b[${editing[code]}~` : undefined;
  }

  feed(bytes: Uint8Array): { display: string; replies: string[] } {
    let display = "";
    const replies: string[] = [];
    for (const byte of bytes) {
      if (byte >= 160)
        throw Error("VT220 supplemental character sets are not yet supported");
      const text =
        byte >= 128
          ? "\x1b" + String.fromCharCode(byte - 64)
          : String.fromCharCode(byte);
      for (const char of text) {
        if (char === "\x18" || char === "\x1a") {
          this.pending = "";
          continue;
        }
        if (char === "\x1b") {
          this.pending = char;
          continue;
        }
        if (!this.pending) {
          display += char;
          continue;
        }
        if (char < " " && char !== "\x00") {
          display += char;
          continue;
        }
        if (char === "\x00" || char === "\x7f") continue;
        this.pending += char;
        if (this.pending.length > 128)
          throw Error("VT220 control sequence limit exceeded");
        if (
          this.pending === "\x1b[" ||
          this.pending === "\x1b " ||
          /^[\x1b][()*+]$/.test(this.pending)
        )
          continue;
        const csi = this.pending.startsWith("\x1b[");
        if (csi && !/[@-~]/.test(char)) continue;
        const sequence = this.pending;
        this.pending = "";
        if (sequence === "\x1bZ" || /^\x1b\[(0)?c$/.test(sequence)) replies.push("\x1b[?62c");
        else if (/^\x1b\[>(0)?c$/.test(sequence)) replies.push("\x1b[>1;0;0c");
        else if (sequence === "\x1b G" || /^\x1b\[62;(0|2)"p$/.test(sequence)) {
          throw Error(
            "VT220 8-bit replies require an 8-bit guest transport; select seven-bit controls",
          );
        } else if (sequence === "\x1b F") {
          /* Seven-bit replies already selected. */
        } else if (sequence === '\x1b[62;1"p') display += "\x1b[!p";
        else if (/^\x1b\[.*"p$/.test(sequence))
          throw Error("Unsupported VT220 compatibility level");
        else if (/^\x1b[P\]_^]$/.test(sequence))
          throw Error("VT220 device strings are outside this subset");
        else display += sequence;
      }
    }
    return { display, replies };
  }
}
