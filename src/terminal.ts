import { MockInputFilter, decKey } from "./terminal-protocol.ts";
import { MockTerminalSession } from "./devices.ts";
import type { Terminal } from "@xterm/xterm";
/** Mount the local command fixture, not a guest shell. The caller owns session;
 * the returned cleanup releases its keyboard and disposes xterm/resize resources. */
export async function mountTerminal(
  host: HTMLElement,
  session: MockTerminalSession,
) {
  const [{ Terminal }, { FitAddon }] = await Promise.all([
    import("@xterm/xterm"),
    import("@xterm/addon-fit"),
    import("@xterm/xterm/css/xterm.css"),
  ]);
  if (!host.isConnected) return () => {};
  const terminal: Terminal = new Terminal({
    documentOverride: terminalDocument(),
    cols: 80,
    rows: 24,
    scrollback: 300,
    fontFamily: "Menlo, Consolas, monospace",
    fontSize: 13,
    lineHeight: 1.15,
    cursorBlink: false,
    allowProposedApi: false,
    disableStdin: false,
    theme: {
      background: "#101d1b",
      foreground: "#c4d8bc",
      cursor: "#e1ddb3",
      selectionBackground: "#526957",
    },
    screenReaderMode: true,
    convertEol: false,
  });
  const fit = new FitAddon();
  terminal.loadAddon(fit);
  terminal.open(host);
  fit.fit();
  let queuedOutput = 0;
  const write = (text: string) => {
    if (queuedOutput + text.length > 65536) return false;
    queuedOutput += text.length;
    terminal.write(text, () => { queuedOutput -= text.length; });
    return true;
  };
  const writeln = (text: string) => write(text + "\r\n");
  let line = "";
  const filter = new MockInputFilter();
  let inputEpoch = session.inputEpoch;
  terminal.attachCustomKeyEventHandler((e) => {
    if (e.type !== "keydown" || e.altKey || e.ctrlKey || e.metaKey) return true;
    const encoded = decKey(e.code, terminal.modes.applicationKeypadMode, terminal.modes.applicationCursorKeysMode);
    if (encoded === undefined) return true;
    e.preventDefault();
    terminal.input(encoded, true);
    return false;
  });
  writeln("\x1b[1mPiDP-11  /  " + session.id + "\x1b[0m");
  writeln("LOCAL TERMINAL FIXTURE · NO GUEST OS");
  writeln("Acquire keyboard above, then type HELP.\r\n");
  write("DEMO> ");
  const input = terminal.onData((data) => {
    if (inputEpoch !== session.inputEpoch) {
      if (line) write("\r\n[Unfinished input discarded after keyboard handoff]\r\nDEMO> ");
      line = ""; filter.reset(); inputEpoch = session.inputEpoch;
    }
    if (!session.inputOwner) return;
    if (data.length > 4096) { line = ""; filter.reset(); writeln("\r\nPaste rejected: fixture input limit is 4 KiB."); write("DEMO> "); return; }
    // xterm emits whole escape sequences; only the mock line editor filters them.
    for (const ch of filter.feed(data)) {
      if (ch === "\r") {
        write("\r\n");
        const out = session.command(line);
        if (out) writeln(out);
        line = "";
        write("DEMO> ");
      } else if ((ch === "\x7f" || ch === "\b")) {
        if (line) {
          line = line.slice(0, -1);
          write("\b \b");
        }
      } else if (ch === "\x03") {
        line = "";
        write("^C\r\nDEMO> ");
      } else if (ch >= " " && ch <= "~" && line.length < 256) {
        line += ch;
        write(ch);
      }
    }
  });
  let pending = 0;
  const resize = new ResizeObserver(() => {
    cancelAnimationFrame(pending);
    pending = requestAnimationFrame(() => {
      if (host.offsetWidth && host.offsetHeight) fit.fit();
    });
  });
  resize.observe(host);
  return () => {
    cancelAnimationFrame(pending);
    resize.disconnect();
    input.dispose();
    terminal.dispose();
    session.inputOwner = false;
  };
}

/** Scoped document facade: only xterm-created style elements receive the server
 * nonce. No global DOM monkey-patch, no policy changes, no guest-derived CSS. */
export function terminalDocument(): Document {
  const nonce = document.querySelector<HTMLMetaElement>(
    'meta[name="terminal-style-nonce"]',
  )?.content;
  if (!nonce) throw Error("Missing terminal style nonce");
  return new Proxy(document, {
    get(target, key) {
      if (key === "createElement")
        return (tag: string, options?: ElementCreationOptions) => {
          const el = target.createElement(tag, options);
          if (tag.toLowerCase() === "style") el.setAttribute("nonce", nonce);
          return el;
        };
      const value = Reflect.get(target, key, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}
