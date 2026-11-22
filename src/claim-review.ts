import references from "../internal/companion/references.json" with { type: "json" };

const labels = {
  supported: "Recognized fact matches the supplied note",
  contradicted: "Contradicts the supplied note",
  unverified: "Not verified by the limited checker",
  "calculation-required": "Use the exact calculator for this value",
  "unobserved-machine-state":
    "No live machine observation verifies this statement",
  "version-dependent": "Version or command context needs verification",
} as const;

export interface ClaimReview {
  text: string;
  scope?: "recognized-fragment";
  status: keyof typeof labels;
  reference?: string;
  supported_explanation?: string;
}

/** Validate the service annotation before rendering; never interpret model HTML. */
export function parseClaimReview(value: unknown): ClaimReview[] {
  if (!Array.isArray(value) || value.length > 32)
    throw Error("Invalid bounded claim review");
  let bytes = 0;
  return value.map((item: unknown) => {
    if (
      !item ||
      typeof item !== "object" ||
      !("text" in item) ||
      typeof item.text !== "string" ||
      !("status" in item) ||
      typeof item.status !== "string" ||
      !Object.hasOwn(labels, item.status)
    ) {
      throw Error("Invalid claim review");
    }
    bytes += new TextEncoder().encode(item.text).length;
    if (bytes > 8192) throw Error("Claim review too large");
    const reference = "reference" in item ? item.reference : undefined;
    const explanation =
      "supported_explanation" in item ? item.supported_explanation : undefined;
    if (
      reference !== undefined &&
      (typeof reference !== "string" ||
        !references.some((note) => note.id === reference))
    ) {
      throw Error("Unknown claim source");
    }
    if (
      explanation !== undefined &&
      (typeof explanation !== "string" || explanation.length > 512)
    ) {
      throw Error("Invalid supported explanation");
    }
    const scope = "scope" in item ? item.scope : undefined;
    if (scope !== undefined && scope !== "recognized-fragment")
      throw Error("Invalid claim scope");
    return {
      scope: scope as "recognized-fragment" | undefined,
      text: item.text,
      status: item.status as ClaimReview["status"],
      reference: reference as string | undefined,
      supported_explanation: explanation as string | undefined,
    };
  });
}

/** Present narrow rule matches alongside the original answer and its passages. */
export function renderClaimReview(
  host: HTMLElement,
  claims: ClaimReview[],
): void {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Claim review · limited checks, not certification";
  details.append(summary);
  details.open = claims.some(
    (claim) =>
      claim.status === "contradicted" ||
      claim.status === "calculation-required",
  );
  for (const claim of claims) {
    const row = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent =
      (claim.scope ? "Only this fragment: " : "") + labels[claim.status] + ": ";
    row.append(label, document.createTextNode(claim.text));
    if (claim.supported_explanation) {
      const support = document.createElement("span");
      support.textContent = ` Narrow supported explanation: ${claim.supported_explanation} [ref:${claim.reference}]`;
      row.append(support);
    }
    details.append(row);
  }
  host.append(details);
}
