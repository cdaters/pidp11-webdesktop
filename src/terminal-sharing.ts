/** Explicit user selection only. One bounded pending excerpt, no screen polling,
 * provider call, persistence or automatic capture of another terminal. */
export interface SharedExcerpt {
  source: string;
  text: string;
}
let pending: SharedExcerpt | undefined;
const listeners = new Set<() => void>();
export function shareSelection(source: string, text: string) {
  if (!text || text.length > 4000 || source.length > 160)
    throw Error("Select between 1 and 4,000 characters to share.");
  pending = { source, text };
  for (const listener of listeners) listener();
}
export function takeSelection(): SharedExcerpt | undefined {
  const result = pending;
  pending = undefined;
  return result;
}
export function onSelection(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
