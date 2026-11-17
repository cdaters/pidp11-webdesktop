import { MockTerminalSession } from "./devices.ts";
import type { Terminal } from "@xterm/xterm";
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
  let line = "";
  terminal.writeln("\x1b[1mPiDP-11  /  " + session.id + "\x1b[0m");
  terminal.writeln("LOCAL TERMINAL FIXTURE · NO GUEST OS");
  terminal.writeln("Acquire keyboard above, then type HELP.\r\n");
  terminal.write("DEMO> ");
  const input = terminal.onData((data) => {
    if (!session.inputOwner) return;
    for (const ch of data) {
      if (ch === "\r") {
        terminal.write("\r\n");
        const out = session.command(line);
        if (out) terminal.writeln(out);
        line = "";
        terminal.write("DEMO> ");
      } else if (ch === "\x7f") {
        if (line) {
          line = line.slice(0, -1);
          terminal.write("\b \b");
        }
      } else if (ch === "\x03") {
        line = "";
        terminal.write("^C\r\nDEMO> ");
      } else if (ch >= " " && ch <= "~" && line.length < 256) {
        line += ch;
        terminal.write(ch);
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
function terminalDocument(): Document {
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
