interface ReaderMedia {
  id: string;
  name: string;
  format: string;
  provenance: string;
  sha256: string;
  bytes: number;
  verified: boolean;
  read_only: boolean;
  generation: string;
  message: string;
}
function catalog(value: unknown): ReaderMedia[] {
  if (!Array.isArray(value) || value.length > 4) throw Error("Invalid reader catalog");
  return value.map((item: unknown) => {
    if (!item || typeof item !== "object") throw Error("Invalid reader entry");
    const v = item as Record<string, unknown>;
    for (const name of ["id", "name", "format", "provenance", "sha256", "generation", "message"])
      if (typeof v[name] !== "string" || (v[name] as string).length > 240)
        throw Error("Invalid reader identity");
    if (!Number.isSafeInteger(v.bytes) || Number(v.bytes) < 0 || Number(v.bytes) > 65536 ||
      typeof v.verified !== "boolean" || v.read_only !== true || !/^[a-f0-9]{64}$/.test(String(v.sha256)))
      throw Error("Invalid bounded read-only media entry");
    return v as unknown as ReaderMedia;
  });
}

/** Explicit read-only catalog retrieval. The view owns cancellation and never
 * supplies a path, mounts media or treats a catalog entry as current attachment. */
export function mountReaderCatalog(host: HTMLElement): () => void {
  const details = document.createElement("details");
  details.innerHTML = `<summary>Approved reader media</summary><p>Read-only working copies prepared by the operator. To change tape, give the operator its name and checksum. Browser mounting is unavailable; the operator must verify the reader is safe and confirm the actual attachment.</p><button>Refresh reader catalog</button><p role="status" data-catalog-status>Not loaded. Refresh explicitly after signing in.</p><ul></ul>`;
  host.append(details);
  const button = details.querySelector("button")!;
  const status = details.querySelector<HTMLElement>("[data-catalog-status]")!;
  const list = details.querySelector("ul")!;
  let disposed = false;
  let pending: AbortController | undefined;
  button.onclick = async () => {
    pending?.abort();
    const request = new AbortController();
    pending = request;
    list.replaceChildren();
    status.textContent = "Checking approved working copies…";
    try {
      const response = await fetch("/api/v1/device-media", { signal: request.signal });
      if (!response.ok) throw Error("Reader catalog unavailable or sign-in required.");
      const rows = catalog(await response.json());
      if (disposed || pending !== request) return;
      for (const row of rows) {
        const item = document.createElement("li");
        item.textContent = `${row.name} (${row.id}) · ${row.bytes} bytes · ${row.format} · ${row.verified ? "Verified read-only copy" : "Unavailable or changed — do not use"}. Source: ${row.provenance}. SHA-256 ${row.sha256}. ${row.generation ? "Observation generation " + row.generation : "No approved observation"}. ${row.message}`;
        list.append(item);
      }
      status.textContent = rows.length ? "Catalog snapshot only; this does not prove the tape is attached." : "No reader media configured by the operator.";
    } catch (error) {
      if (!disposed && pending === request) status.textContent = (error as Error).message;
    }
  };
  return () => {
    disposed = true;
    pending?.abort();
    details.remove();
  };
}
