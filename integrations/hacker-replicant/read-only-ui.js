// Optional independent companion UI. No console or Web Desktop session access.
(async () => {
  const response = await fetch("/api/readonly");
  if (!response.ok) return;
  const settings = await response.json();
  document
    .querySelectorAll("iframe, .rp-nav-link")
    .forEach((node) => node.remove());
  document.querySelector(".rp-nav-brand")?.removeAttribute("href");
  for (const id of ["tools-toggle", "backend-toggle"]) {
    const control = document.getElementById(id);
    control.checked = false;
    control.disabled = true;
  }
  document.getElementById("toggle-label").textContent =
    "Machine control unavailable";
  document.getElementById("action-hint").textContent = "Read-only mode";
  document.querySelector(".hp-lights").textContent =
    "Selected excerpt · no live console";
  document.querySelector("#backend-label + .toggle-hint").textContent =
    "Owner-configured local model";
  const style = document.createElement("style");
  style.textContent =
    ".hp-screen-inner button {display:inline-block;margin:8px 8px 8px 0;padding:8px 12px;border:1px solid #938670;border-radius:4px;background:#d9ccae;color:#24221e;font:inherit;cursor:pointer} .hp-screen-inner label {display:block} .hp-screen-inner details {margin:12px 0} .hp-screen-inner a {color:#dac89b} .hp-screen-inner textarea {background:#f3eddc;color:#24221e;padding:10px;font-family:monospace}";
  document.head.append(style);
  const host = document.querySelector(".hp-screen-inner");
  host.style.cssText = "display:block;overflow:auto;padding:16px;color:#dce9df";
  host.textContent = `Destination: ${location.origin} → local model ${settings.model}. Machine state unknown. This companion cannot read a console. Paste only text you explicitly choose to share.`;
  const text = document.createElement("textarea");
  text.maxLength = 4000;
  text.setAttribute("aria-label", "Selected excerpt");
  text.style.cssText = "width:100%;min-height:130px;margin:12px 0";
  const share = document.createElement("button");
  share.textContent = "Approve selected excerpt for 30 seconds";
  const revoke = document.createElement("button");
  revoke.textContent = "Revoke shared excerpt";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  const include = document.createElement("input");
  include.type = "checkbox";
  include.id = "include-selection";
  const label = document.createElement("label");
  label.append(include, " Include this approved excerpt in my next question");
  let expiry;
  let pending = false;
  function forgetHistory() {
    include.checked = false;
    delete include.dataset.selectionId;
    window.dispatchEvent(new Event("pidp11-revoke"));
  }
  async function change(body) {
    if (pending) return;
    pending = true;
    share.disabled = revoke.disabled = true;
    clearTimeout(expiry);
    forgetHistory();
    try {
      const reply = await fetch("/api/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
      });
      const data = await reply.json();
      if (!reply.ok) throw Error(data.error || "Sharing failed");
      status.textContent = data.shared
        ? "Approved for at most 30 seconds. Machine state remains unknown."
        : "Selection revoked. Future questions start with empty history. Previously delivered text cannot be recalled.";
      if (data.shared) {
        if (!/^[a-f0-9]{32}$/.test(data.selectionId || ""))
          throw Error("Exact selection receipt unavailable");
        include.dataset.selectionId = data.selectionId;
        expiry = setTimeout(() => {
          forgetHistory();
          status.textContent = "Approval expired; share again deliberately.";
        }, 30000);
      } else {
        text.value = "";
      }
    } catch (error) {
      status.textContent =
        error.message +
        ". Selection unavailable in this page; approval may persist server-side until expiry.";
    } finally {
      pending = false;
      share.disabled = revoke.disabled = false;
    }
  }
  share.onclick = () => change({ text: text.value, consent: true });
  revoke.onclick = () => change({ revoke: true });
  window.addEventListener("pagehide", () => clearTimeout(expiry), {
    once: true,
  });
  host.append(text, share, revoke, label, status);

  // Inspect sources without invoking a model. Build all content as text nodes.
  const references = document.createElement("button");
  references.textContent = "Find sources for my question";
  const notes = document.createElement("div");
  notes.setAttribute("aria-label", "Reference passages");
  references.onclick = async () => {
    references.disabled = true;
    notes.textContent = "Looking up sources…";
    try {
      const question = document.getElementById("chat-input").value;
      const reply = await fetch(
        "/api/references?q=" + encodeURIComponent(question),
        { signal: AbortSignal.timeout(6000) },
      );
      if (!reply.ok) throw Error("Sources unavailable");
      const data = await reply.json();
      notes.textContent = "";
      for (const note of data.notes || []) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `[ref:${note.id}] ${note.title}`;
        const passage = document.createElement("p");
        passage.textContent = note.text;
        const source = document.createElement("a");
        const url = new URL(note.source);
        if (url.protocol === "https:") source.href = url.href;
        source.textContent = `${note.edition} · ${note.section}`;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        details.append(summary, passage, source);
        notes.append(details);
      }
      if (!notes.childElementCount)
        notes.textContent =
          "No matching verified note. Specify the system and release.";
    } catch (error) {
      notes.textContent = error.message;
    } finally {
      references.disabled = false;
    }
  };
  host.append(references, notes);
})();
