import type { TerminalProfile } from "./terminal-profile.ts";

/** Modern system shortcuts stay local. Ctrl-C remains the historical interrupt;
 * use the explicit Copy selection action or Command-C / Ctrl-Shift-C to copy. */
export function localTerminalShortcut(event: Pick<KeyboardEvent, "metaKey" | "ctrlKey" | "shiftKey" | "code">): boolean {
  return event.metaKey || (event.ctrlKey && event.shiftKey && ["KeyC", "KeyV", "KeyF"].includes(event.code));
}
/** DEC keypad keys ignore Shift/Control (VT52 operator manual p.15). For ordinary
 * keys xterm supplies control characters; Alt/Option remains a browser/OS choice. */
export function terminalKey(event: Pick<KeyboardEvent, "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey">,
  profile: TerminalProfile, erase: number, keypad: boolean, cursor: boolean): string | undefined {
  if (localTerminalShortcut(event) || event.altKey) return undefined;
  if (event.code.startsWith("Numpad")) return profile.key(event.code, keypad, cursor);
  if (event.ctrlKey) return undefined;
  if (event.code === "Backspace") return String.fromCharCode(erase);
  // Shift-arrow selection/navigation is local; do not manufacture modified DEC codes.
  if (event.shiftKey && event.code.startsWith("Arrow")) return "";
  return profile.key(event.code, keypad, cursor);
}
