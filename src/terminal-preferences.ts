/** Presentation only. Never store a guest, token, transport, keyboard lease or input. */
export interface TerminalPreferences {
  phosphor: "green" | "amber" | "white";
  brightness: number;
  fontSize: number;
  cursor: "block" | "underline" | "bar";
  scanlines: boolean;
  glow: boolean;
}
export const terminalPreferenceKey = "pidp11.terminal.display.v1";
export const defaultTerminalPreferences: TerminalPreferences = {
  phosphor: "green", brightness: 100, fontSize: 13, cursor: "block", scanlines: false, glow: false,
};
/** Whitelist stored fields and values; unknown data cannot become terminal options. */
export function readTerminalPreferences(raw: string | null): TerminalPreferences {
  const result = { ...defaultTerminalPreferences };
  try {
    const value: unknown = JSON.parse(raw ?? "null");
    if (!value || typeof value !== "object") return result;
    const p = value as Record<string, unknown>;
    if (p.phosphor === "green" || p.phosphor === "amber" || p.phosphor === "white") result.phosphor = p.phosphor;
    if (p.cursor === "block" || p.cursor === "underline" || p.cursor === "bar") result.cursor = p.cursor;
    if ([11, 13, 16, 20].includes(p.fontSize as number)) result.fontSize = p.fontSize as number;
    if ([80, 100, 120].includes(p.brightness as number)) result.brightness = p.brightness as number;
    if (typeof p.scanlines === "boolean") result.scanlines = p.scanlines;
    if (typeof p.glow === "boolean") result.glow = p.glow;
  } catch { /* Unavailable or damaged preferences use readable defaults. */ }
  return result;
}
