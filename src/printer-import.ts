/** Explicit local text import. Preserves ASCII controls (including FF) byte for
 * byte; no path is sent to a backend and no device/media attachment is implied. */
export function decodePrinterSpool(bytes: Uint8Array): string {
  if (!bytes.length || bytes.length > 16384)
    throw Error("Choose a nonempty text spool of at most 16 KiB.");
  if (bytes.some((byte) => byte > 127))
    throw Error("This printer import accepts ASCII7 text, not binary media.");
  return String.fromCharCode(...bytes);
}
