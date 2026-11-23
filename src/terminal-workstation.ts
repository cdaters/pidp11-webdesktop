import type { Terminal, IDisposable } from "@xterm/xterm";
import type { TerminalPersonality } from "./terminal-profile.ts";
import { TerminalBell } from "./terminal-audio.ts";
import { readTerminalPreferences, terminalPreferenceKey } from "./terminal-preferences.ts";

/** Local workstation controls. Owns presentation, search and optional audio only;
 * callbacks supplied by the transport retain all input/lease decisions. Rebind on
 * reconnect; dispose when its containing window closes. No transcript persistence. */
export function mountTerminalWorkstation(host: HTMLElement, getPersonality: () => TerminalPersonality,
  focus: () => void, sendKey: (code: string) => void) {
  const panel = document.createElement("details");
  panel.className = "terminal-workstation";
  panel.innerHTML = `<summary>Workstation · display, sound, search and keys</summary>
    <div class="terminal-toolbar"><label>Phosphor <select aria-label="Terminal phosphor"><option value="green">Green</option><option value="amber">Amber</option><option value="white">White</option></select></label>
    <label>Brightness <select aria-label="Terminal brightness"><option value="80">Soft</option><option value="100">Normal</option><option value="120">Bright</option></select></label>
    <label>Cursor <select aria-label="Terminal cursor"><option value="block">Block</option><option value="underline">Underline</option><option value="bar">Bar</option></select></label>
    <label><input type="checkbox" data-scanlines> Scanlines</label><label><input type="checkbox" data-glow> Soft glow</label>
    <button type="button" data-defaults>Readable defaults</button></div>
    <div class="terminal-toolbar"><button type="button" data-enable-sound>Enable bell in this window</button>
    <label><input type="checkbox" data-terminal-mute checked> Mute this terminal</label><label><input type="checkbox" data-global-mute checked> Mute all terminals</label>
    <label>Volume <input aria-label="Terminal bell volume" type="range" min="0" max="30" value="15"></label><span data-bell-count>0 BEL events</span></div>
    <p class="terminal-help">Optional synthetic buzzer, not a recording. Only received BEL sounds; this window must have focus. Sound starts muted, never plays in the background, and requires Enable. No keyboard click.</p>
    <div class="terminal-toolbar"><label>Find text <input type="search" maxlength="80" aria-label="Find terminal text"></label><button type="button" data-find-previous>Previous match</button><button type="button" data-find-next>Next match</button><button type="button" data-bottom>Latest output</button></div>
    <div class="terminal-toolbar"><button type="button" data-copy>Copy selection</button><button type="button" data-select-all>Select retained text</button><button type="button" data-focus>Focus terminal</button>
    <button type="button" data-terminal-key="Escape">Esc</button><button type="button" data-terminal-key="LineFeed">Line feed</button>
    <button type="button" data-terminal-key="F1">PF1</button><button type="button" data-terminal-key="F2">PF2</button><button type="button" data-terminal-key="F3">PF3</button><button type="button" data-terminal-key="F4">PF4</button></div>
    <p class="terminal-help">Ctrl-C sends interrupt when you own the keyboard; Command-C or Ctrl-Shift-C copies. Paste always opens review. Ctrl-J sends line feed, Return sends carriage return. Browser/system shortcuts stay local. Use the window’s maximize/fullscreen controls for more space. Search is literal and case-insensitive, limited to retained text (300 scrollback lines; paper 512). Visual preferences apply to new windows; connections and authority are never saved.</p>
    <details><summary>DEC keypad and VT220 editing keys</summary><div class="terminal-toolbar">${["7", "8", "9", "4", "5", "6", "1", "2", "3", "0", "Decimal", "Enter"].map(key => `<button type="button" data-terminal-key="Numpad${key}">Keypad ${key}</button>`).join("")}</div><div class="terminal-toolbar">${[["Home","Find"],["Insert","Insert Here"],["Delete","Remove"],["End","Select"],["PageUp","Prev Screen"],["PageDown","Next Screen"],["F15","Help"],["F16","Do"]].map(([code,label]) => `<button type="button" data-vt220-key data-terminal-key="${code}">VT220 ${label}</button>`).join("")}</div></details>
    <div data-workstation-status role="status"></div>`;
  host.querySelector(".guest-screen")!.after(panel);
  const query = <T extends HTMLElement>(selector: string) => panel.querySelector<T>(selector)!;
  const status = query<HTMLElement>("[data-workstation-status]");
  const size = host.querySelector<HTMLSelectElement>('[aria-label="Guest terminal text size"]')!;
  let preferences = readTerminalPreferences(null);
  try { preferences = readTerminalPreferences(localStorage.getItem(terminalPreferenceKey)); } catch { /* Storage optional. */ }
  let term: Terminal;
  let subscriptions: IDisposable[] = [];
  let bells = 0;
  let lastQuery = "";
  let lastMatch = -1;
  let disposed = false;
  const bell = new TerminalBell(() => { query<HTMLInputElement>("[data-global-mute]").checked = bell.globalMuted; });
  query<HTMLInputElement>("[data-global-mute]").checked = bell.globalMuted;
  const apply = () => {
    if (!term) return;
    const paper = getPersonality() === "asr33";
    const colors = { green: "#b5dfad", amber: "#ffcf87", white: "#e5e8e5" };
    const color = colors[preferences.phosphor];
    term.options.theme = { background: paper ? "#f5f0df" : "#101d1b", foreground: paper ? "#29271e" : color,
      cursor: paper ? "#493a29" : color, selectionBackground: "#526957" };
    term.options.fontSize = preferences.fontSize;
    term.options.cursorStyle = preferences.cursor;
    term.options.cursorBlink = false;
    term.options.minimumContrastRatio = 4.5;
    host.dataset.terminalBrightness = String(preferences.brightness);
    host.classList.toggle("terminal-scanlines", preferences.scanlines && !paper);
    host.classList.toggle("terminal-glow", preferences.glow && !paper);
    size.value = String(preferences.fontSize);
    query<HTMLSelectElement>('[aria-label="Terminal phosphor"]').value = preferences.phosphor;
    query<HTMLSelectElement>('[aria-label="Terminal brightness"]').value = String(preferences.brightness);
    query<HTMLSelectElement>('[aria-label="Terminal cursor"]').value = preferences.cursor;
    query<HTMLInputElement>("[data-scanlines]").checked = preferences.scanlines;
    query<HTMLInputElement>("[data-glow]").checked = preferences.glow;
  };
  const save = () => {
    apply();
    try { localStorage.setItem(terminalPreferenceKey, JSON.stringify(preferences)); }
    catch { status.textContent = "Display changed for this window; browser storage unavailable."; }
  };
  query<HTMLSelectElement>('[aria-label="Terminal phosphor"]').onchange = event => { preferences = readTerminalPreferences(JSON.stringify({ ...preferences, phosphor: (event.target as HTMLSelectElement).value })); save(); };
  query<HTMLSelectElement>('[aria-label="Terminal brightness"]').onchange = event => { preferences.brightness = Number((event.target as HTMLSelectElement).value); save(); };
  query<HTMLSelectElement>('[aria-label="Terminal cursor"]').onchange = event => { preferences = readTerminalPreferences(JSON.stringify({ ...preferences, cursor: (event.target as HTMLSelectElement).value })); save(); };
  query<HTMLInputElement>("[data-scanlines]").onchange = event => { preferences.scanlines = (event.target as HTMLInputElement).checked; save(); };
  query<HTMLInputElement>("[data-glow]").onchange = event => { preferences.glow = (event.target as HTMLInputElement).checked; save(); };
  size.onchange = () => { preferences.fontSize = Number(size.value); save(); };
  query<HTMLButtonElement>("[data-defaults]").onclick = () => { preferences = readTerminalPreferences(null); save(); };
  query<HTMLButtonElement>("[data-enable-sound]").onclick = async () => {
    const enabled = await bell.enableFromGesture();
    if (disposed) return;
    query<HTMLInputElement>("[data-terminal-mute]").checked = !enabled;
    if (enabled) bell.setGlobalMute(false);
    status.textContent = enabled ? "Bell enabled; focus the terminal to hear future BEL output. Nothing sent." : "Audio unavailable; terminal operation continues silently.";
    focus();
  };
  query<HTMLInputElement>("[data-terminal-mute]").onchange = event => { bell.muted = (event.target as HTMLInputElement).checked; };
  query<HTMLInputElement>("[data-global-mute]").onchange = event => { bell.setGlobalMute((event.target as HTMLInputElement).checked); };
  query<HTMLInputElement>('[aria-label="Terminal bell volume"]').oninput = event => { bell.volume = Number((event.target as HTMLInputElement).value) / 100; };
  const copy = async () => {
    const selection = term.getSelection();
    if (!selection) { status.textContent = "Select terminal text first."; return; }
    try { await navigator.clipboard.writeText(selection); if (!disposed) status.textContent = "Selection copied; nothing sent to the guest."; }
    catch { if (!disposed) status.textContent = "Clipboard unavailable. Keep the selection and use your browser’s Copy command or Save display."; }
  };
  query<HTMLButtonElement>("[data-copy]").onclick = () => { void copy(); };
  query<HTMLButtonElement>("[data-select-all]").onclick = () => term.selectAll();
  query<HTMLButtonElement>("[data-focus]").onclick = focus;
  query<HTMLButtonElement>("[data-bottom]").onclick = () => { term.clearSelection(); term.scrollToBottom(); focus(); };
  for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-terminal-key]")) button.onclick = () => { sendKey(button.dataset.terminalKey!); focus(); };
  const findBox = query<HTMLInputElement>('[aria-label="Find terminal text"]');
  const find = (direction: number) => {
    const needle = findBox.value.slice(0, 80).toLowerCase();
    if (!needle) { status.textContent = "Enter text to find in this window’s retained output."; return; }
    const matches: { row: number; column: number }[] = [];
    const buffer = term.buffer.active;
    // Fixed geometry and scrollback bound this scan; no regex or transcript copy.
    for (let row = 0; row < buffer.length; row++) {
      const line = buffer.getLine(row)?.translateToString(false).toLowerCase() ?? "";
      for (let column = line.indexOf(needle); column >= 0; column = line.indexOf(needle, column + 1)) matches.push({ row, column });
    }
    if (!matches.length) { term.clearSelection(); status.textContent = "No match in retained text."; return; }
    if (needle !== lastQuery) { lastMatch = direction > 0 ? -1 : 0; lastQuery = needle; }
    lastMatch = (lastMatch + direction + matches.length) % matches.length;
    const match = matches[lastMatch];
    term.select(match.column, match.row, needle.length);
    term.scrollToLine(match.row);
    status.textContent = `Match ${lastMatch + 1} of ${matches.length} in retained text.`;
  };
  query<HTMLButtonElement>("[data-find-next]").onclick = () => find(1);
  query<HTMLButtonElement>("[data-find-previous]").onclick = () => find(-1);
  findBox.onkeydown = event => { if (event.key === "Enter") { event.preventDefault(); find(event.shiftKey ? -1 : 1); } };
  return {
    bind(terminal: Terminal): void {
      for (const subscription of subscriptions) subscription.dispose();
      term = terminal;
      bells = 0; lastQuery = ""; lastMatch = -1;
      query<HTMLElement>("[data-bell-count]").textContent = "0 BEL events";
      subscriptions = [term.onBell(() => {
        bells++;
        query<HTMLElement>("[data-bell-count]").textContent = `${bells} BEL events`;
        bell.ring(document.hasFocus() && host.contains(document.activeElement));
      })];
      apply();
    },
    authority(enabled: boolean): void {
      for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-terminal-key]")) button.disabled = !enabled || (button.hasAttribute("data-vt220-key") && getPersonality() !== "vt220");
    },
    shortcut(event: KeyboardEvent): void {
      if (event.code === "KeyC") void copy();
      if (event.code === "KeyF") { panel.open = true; findBox.focus(); }
      // Native paste is intercepted in the guest screen's capture listener.
    },
    dispose(): void { disposed = true; for (const subscription of subscriptions) subscription.dispose(); bell.dispose(); panel.remove(); },
  };
}
