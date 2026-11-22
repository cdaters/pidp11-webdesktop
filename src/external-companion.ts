/** An explicit HTTPS origin only: no credential/query/fragment transfer. */
export function companionOrigin(
  value: string,
  desktopHostname?: string,
): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    url.hostname === desktopHostname
  ) {
    throw Error(
      "Use the independent companion’s HTTPS origin, on a different hostname, without credentials or a session link.",
    );
  }
  return url.origin;
}

/** Separate window and authentication; never passes this desktop's session. */
export function mountExternalCompanion(host: HTMLElement): void {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Optional Hacker Replicant · separate sign-in";
  const description = document.createElement("p");
  description.textContent =
    "Open an independently configured read-only companion. This opens a separate window and shares no terminal text or desktop credentials.";
  const input = document.createElement("input");
  input.type = "url";
  input.setAttribute("aria-label", "Independent companion HTTPS address");
  input.placeholder = "https://companion.example.test";
  const open = document.createElement("button");
  open.type = "button";
  open.textContent = "Open independent companion";
  const message = document.createElement("p");
  message.setAttribute("role", "status");
  open.onclick = () => {
    try {
      window.open(
        companionOrigin(input.value, window.location.hostname),
        "_blank",
        "noopener,noreferrer",
      );
      message.textContent =
        "Independent sign-in required. No selection or desktop session was shared.";
    } catch (error) {
      message.textContent = (error as Error).message;
    }
  };
  details.append(summary, description, input, open, message);
  host.append(details);
}
