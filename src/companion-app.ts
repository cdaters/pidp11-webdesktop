import {
  GuideFixture,
  validateCompanionRequest,
  type CompanionMessage,
  type CompanionProvider,
} from "./companion.ts";

/** Chat-only prototype. Closing/clearing cancels pending work and discards text.
 * No automatic terminal readback, provider discovery, credential field or tool calls. */
export function mountCompanion(
  host: HTMLElement,
  provider: CompanionProvider = new GuideFixture(),
): () => void {
  host.classList.add("companion-app");
  host.innerHTML = `<div class="app-heading"><h2>AI Companion</h2><span class="source-tag">PROTOTYPE · OFFLINE FIXTURE</span></div>
    <p data-provider></p><p>Ask about UNIX V7 directories, ed, keyboard ownership or plotting. No guest commands can be sent here.</p>
    <div class="companion-chat" role="log" aria-label="Companion conversation"></div>
    <form><label>Your question<textarea aria-label="Companion question" maxlength="4096" rows="2" required></textarea></label>
    <details><summary>Deliberately share selected terminal text</summary><p>Copy only the text you want to share, then paste it here. Nothing is read from a terminal automatically.</p><textarea aria-label="Shared terminal excerpt" maxlength="4096" rows="3"></textarea></details>
    <button>Send to offline fixture</button><button type="button" data-clear>Clear chat</button></form><p role="status" data-status></p>`;
  host.querySelector("[data-provider]")!.textContent = provider.name;
  const log = host.querySelector<HTMLElement>(".companion-chat")!;
  const question = host.querySelector<HTMLTextAreaElement>(
    '[aria-label="Companion question"]',
  )!;
  const shared = host.querySelector<HTMLTextAreaElement>(
    '[aria-label="Shared terminal excerpt"]',
  )!;
  const form = host.querySelector("form")!;
  const button = form.querySelector("button")!;
  const status = host.querySelector<HTMLElement>("[data-status]")!;
  let messages: CompanionMessage[] = [],
    pending: AbortController | undefined;
  let disposed = false;
  const append = (role: string, content: string) => {
    const entry = document.createElement("p");
    const label = document.createElement("strong");
    label.textContent = `${role}: `;
    entry.append(label, document.createTextNode(content));
    log.append(entry);
    log.scrollTop = log.scrollHeight;
  };
  const clear = () => {
    pending?.abort();
    pending = undefined;
    messages = [];
    log.replaceChildren();
    shared.value = "";
    question.value = "";
    button.disabled = false;
    status.textContent = "Chat cleared; nothing retained.";
  };
  form.onsubmit = async (event) => {
    event.preventDefault();
    if (pending || disposed) return;
    const text = question.value.trim();
    if (!text) return;
    if (messages.length >= 20) {
      status.textContent = "Clear this bounded conversation before continuing.";
      return;
    }
    const controller = new AbortController();
    pending = controller;
    button.disabled = true;
    const next: CompanionMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    try {
      const answer = await provider.reply(
        { messages: next, sharedText: shared.value },
        controller.signal,
      );
      if (disposed || pending !== controller) return;
      if (answer.length > 4096)
        throw Error("Provider response exceeded the display limit");
      const completed: CompanionMessage[] = [
        ...next,
        { role: "assistant", content: answer },
      ];
      validateCompanionRequest({ messages: completed, sharedText: "" });
      messages = completed;
      append("You", text);
      append("Offline guide", answer);
      question.value = "";
      shared.value = "";
      status.textContent =
        "Local fixture response · no model contacted or guest action taken.";
    } catch (error) {
      if (pending === controller && !disposed)
        status.textContent = (error as Error).message;
    } finally {
      if (pending === controller) {
        pending = undefined;
        button.disabled = false;
      }
    }
  };
  host.querySelector<HTMLButtonElement>("[data-clear]")!.onclick = clear;
  return () => {
    disposed = true;
    pending?.abort();
    messages = [];
  };
}
