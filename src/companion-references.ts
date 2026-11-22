import references from "../internal/companion/references.json" with { type: "json" };
export type ReferenceNote = (typeof references)[number];
export interface Retrieval {
  status: string;
  notes: ReferenceNote[];
}

/** Offline counterpart of the bounded Go keyword search; parity uses shared
 * cases. It searches curated keywords only, never terminal or chat history. */
export function retrieveReferences(query: string, system = ""): Retrieval {
  const empty = { status: "no-match", notes: [] as ReferenceNote[] };
  if (new TextEncoder().encode(query).length > 4096 || system.length > 32)
    return empty;
  query = query.toLowerCase();
  if (
    !system &&
    query.includes("rsx") &&
    !query.includes("plus") &&
    !query.includes("11m") &&
    !query.includes("11m-")
  )
    return { ...empty, status: "ambiguous-version" };
  const terms = new Set(
    (query.match(/[a-z0-9][a-z0-9./-]*/g) || []).filter(
      (word) => word.length > 2,
    ),
  );
  for (const [alias, canonical] of Object.entries({
    "rt-11": "rt11",
    "rsx-11m": "rsx11m",
    "rsx-11m-plus": "rsx11mplus",
    rsx11mp: "rsx11mplus",
    "rsts/e": "rsts",
    "2.11bsd": "211bsd",
  })) {
    if (terms.has(alias)) terms.add(canonical);
  }
  const notes = references
    .filter((note) => !system || note.system === system)
    .map((note) => ({
      note,
      score: note.keywords.split(" ").filter((key) => terms.has(key)).length,
    }))
    .filter(
      ({ note, score }) =>
        score >= 2 ||
        (score === 1 &&
          (system !== "" || terms.has(note.system) || terms.has(note.id))),
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ note }) => note);
  return {
    status: notes.some((note) => note.coverage === "incomplete")
      ? "incomplete"
      : notes.length
        ? "focused-notes"
        : "no-match",
    notes,
  };
}

/** Catalog-owned links only; generated text is never parsed as HTML or a URL. */
export function renderReferences(host: HTMLElement, result: Retrieval): void {
  host.replaceChildren();
  const status = document.createElement("p");
  status.textContent = `Reference coverage: ${result.status}. Retrieved notes are context, not proof that every model claim is supported.`;
  host.append(status);
  for (const note of result.notes) {
    const details = document.createElement("details"),
      summary = document.createElement("summary"),
      text = document.createElement("p"),
      source = document.createElement("a");
    summary.textContent = `[ref:${note.id}] ${note.title} · ${note.system}`;
    text.textContent = note.text;
    source.textContent = `${note.organization} · ${note.edition} · ${note.document} · ${note.section}`;
    source.href = note.source;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    details.append(summary, text, source);
    host.append(details);
  }
}
