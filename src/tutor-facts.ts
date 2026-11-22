import facts from "../internal/companion/facts.json" with { type: "json" };
import references from "../internal/companion/references.json" with { type: "json" };

/** Explicit fact identifiers avoid guessing the scope of an architecture question. */
export function factAnswer(
  question: string,
): { text: string; reference: string } | null {
  if (!/^\/fact(?:\s|$)/i.test(question)) return null;
  if (question.length > 128) throw Error("Fact request is too long");
  const parts = question.trim().split(/\s+/);
  const fact =
    parts.length === 2 ? facts.find((item) => item.id === parts[1]) : undefined;
  if (!fact)
    throw Error(
      "Choose a source fact from the list, or use /fact followed by its identifier.",
    );
  return { text: fact.text, reference: fact.reference };
}

/** Choosing a fact prepares a local request; it sends nothing to a model. */
export function mountFactPicker(
  host: HTMLElement,
  question: HTMLTextAreaElement,
): void {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Source facts · no model required";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Verified fact topic");
  for (const fact of facts) select.append(new Option(fact.title, fact.id));
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Prepare fact question";
  button.onclick = () => {
    question.value = `/fact ${select.value}`;
    question.focus();
  };
  details.append(summary, select, button);
  host.append(details);
}

export function renderFactSource(host: HTMLElement, id: string): void {
  const reference = references.find((item) => item.id === id);
  if (!reference) throw Error("Source missing from installed catalog");
  const link = document.createElement("a");
  link.textContent = `${reference.title} · ${reference.edition} · ${reference.section}`;
  link.href = reference.source;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  host.append(link);
}
