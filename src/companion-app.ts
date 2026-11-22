import { mountPDPValues } from "./pdp11-values.ts";
import {
  retrieveReferences,
  renderReferences,
} from "./companion-references.ts";
import references from "../internal/companion/references.json" with { type: "json" };
import { ConfiguredCompanion, configuredCompanion } from "./companion-http.ts";
import { onSelection, takeSelection } from "./terminal-sharing.ts";
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
    <p data-provider></p><div class="terminal-toolbar"><button type="button" data-configured>Use configured provider</button><button type="button" data-offline>Use offline guide</button><select aria-label="Companion model" hidden></select><button type="button" data-discover hidden>Test connection / list models</button><button type="button" data-cancel>Cancel request</button></div><p>Ask about UNIX V7 directories, ed, keyboard ownership or plotting. Model replies are suggestions, not machine observations. No commands are sent from chat.</p>
    <div data-exact></div><details data-library><summary>Search historical references · offline</summary><label>Search <input aria-label="Reference search" maxlength="4096"></label><label>System <select aria-label="Reference system"><option value="">All systems</option></select></label><button type="button" data-search>Search references</button><div data-search-results></div></details><label><input type="checkbox" data-retrieve checked>Include up to two matching reference notes when I send a question</label><details data-tutor><summary>Historical computing reference desk</summary><label>Reference topic <select aria-label="Companion reference topic"></select></label><p data-reference-note></p><a data-reference-link target="_blank" rel="noopener noreferrer">Read the source record</a><button type="button" data-reference-question>Use this question</button><p>Curated reference notes are distinct from model explanations. Selecting a note sends nothing.</p></details><p data-sharing-scope role="status"></p><div class="companion-chat" role="log" aria-label="Companion conversation"></div>
    <form><label>Your question<textarea aria-label="Companion question" maxlength="4096" rows="2" required></textarea></label>
    <details><summary>Deliberately share selected terminal text</summary><p>Copy only the text you want to share, then paste it here. Nothing is read from a terminal automatically.</p><label>Source terminal <input aria-label="Shared terminal source" maxlength="160" value="Manually pasted excerpt"></label><textarea aria-label="Shared terminal excerpt" maxlength="4096" rows="3"></textarea></details>
    <button>Send to offline fixture</button><button type="button" data-clear>Clear chat</button></form><p role="status" data-status></p>`;
  host.querySelector("[data-provider]")!.textContent = provider.name;
  mountPDPValues(host.querySelector<HTMLElement>("[data-exact]")!);
  const system = host.querySelector<HTMLSelectElement>(
    '[aria-label="Reference system"]',
  )!;
  system.append(
    ...[...new Set(references.map((note) => note.system))].map(
      (value) => new Option(value, value),
    ),
  );
  const retrievalEnabled =
    host.querySelector<HTMLInputElement>("[data-retrieve]")!;
  host.querySelector<HTMLButtonElement>("[data-search]")!.onclick = () => {
    const query = host.querySelector<HTMLInputElement>(
      '[aria-label="Reference search"]',
    )!.value;
    renderReferences(
      host.querySelector<HTMLElement>("[data-search-results]")!,
      retrieveReferences(query, system.value),
    );
  };
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
    showScope();
  };
  const source = host.querySelector<HTMLInputElement>(
    '[aria-label="Shared terminal source"]',
  )!;
  const models = host.querySelector<HTMLSelectElement>(
    '[aria-label="Companion model"]',
  )!;
  const discover = host.querySelector<HTMLButtonElement>("[data-discover]")!;
  const showProvider = () => {
    host.querySelector("[data-provider]")!.textContent = provider.name;
    const configured =
      provider instanceof ConfiguredCompanion ? provider : undefined;
    models.hidden = discover.hidden = !configured;
    host.querySelector(".source-tag")!.textContent = configured
      ? configured.fixture
        ? "PROVIDER FIXTURE · NO MODEL"
        : "CONFIGURED MODEL · OPTIONAL"
      : "PROTOTYPE · OFFLINE FIXTURE";
    button.textContent = configured
      ? "Send text to configured provider"
      : "Send to offline fixture";
    showScope();
  };
  const receiveSelection = () => {
    const selection = takeSelection();
    if (!selection) return;
    shared.value = selection.text;
    source.value = selection.source;
    shared.closest("details")!.open = true;
    status.textContent =
      "Exact selection shown for review. Nothing sent; choose Send deliberately.";
    showScope();
  };
  const topic = host.querySelector<HTMLSelectElement>(
    '[aria-label="Companion reference topic"]',
  )!;
  topic.replaceChildren(
    new Option("No additional reference", ""),
    ...references.map((note) => new Option(note.title, note.id)),
  );
  const scope = host.querySelector<HTMLElement>("[data-sharing-scope]")!;
  const showScope = () => {
    const configured =
      provider instanceof ConfiguredCompanion ? provider : undefined;
    scope.textContent = configured
      ? `Destination: ${configured.destination} · model: ${models.value} · scope: question, ${messages.length} retained messages, ${new TextEncoder().encode(shared.value).length} selected bytes from ${source.value || "unspecified source"}${topic.value ? ", selected reference note" : retrievalEnabled.checked ? ", up to two retrieved notes (" + (system.value || "all systems") + ")" : ""}. Only Send submits this text.`
      : "Offline guide: no provider receives your question or selected text.";
  };
  const showReference = () => {
    const note = references.find((note) => note.id === topic.value);
    host.querySelector("[data-reference-note]")!.textContent =
      note?.text ?? "Choose a source-backed project note.";
    const link = host.querySelector<HTMLAnchorElement>(
      "[data-reference-link]",
    )!;
    link.hidden = !note;
    link.href = note?.source ?? "#";
    showScope();
  };
  topic.onchange = showReference;
  host.querySelector<HTMLButtonElement>("[data-reference-question]")!.onclick =
    () => {
      question.value =
        references.find((note) => note.id === topic.value)?.question ?? "";
      question.focus();
      showScope();
    };
  retrievalEnabled.onchange = showScope;
  system.onchange = showScope;
  shared.addEventListener("input", showScope);
  source.addEventListener("input", showScope);
  models.addEventListener("change", showScope);
  showReference();
  const unsubscribe = onSelection(receiveSelection);
  receiveSelection();
  host.querySelector<HTMLButtonElement>("[data-configured]")!.onclick =
    async () => {
      if (pending) return;
      const controller = new AbortController();
      pending = controller;
      try {
        const result = await configuredCompanion(controller.signal);
        if (disposed || pending !== controller) return;
        clear();
        provider = result.provider;
        models.replaceChildren(
          ...result.models.map((model) => new Option(model, model)),
        );
        showProvider();
        status.textContent = `Sending will share your question/history and the displayed excerpt with ${result.provider.destination}. Model knowledge is not a live machine observation.`;
      } catch (error) {
        if (!disposed && pending === controller)
          status.textContent = (error as Error).message;
      } finally {
        if (pending === controller) pending = undefined;
      }
    };
  host.querySelector<HTMLButtonElement>("[data-offline]")!.onclick = () => {
    clear();
    provider = new GuideFixture();
    showProvider();
  };
  host.querySelector<HTMLButtonElement>("[data-cancel]")!.onclick = () => {
    pending?.abort();
    pending = undefined;
    button.disabled = false;
    status.textContent = "Request cancelled; no guest action taken.";
  };
  models.onchange = () => {
    if (provider instanceof ConfiguredCompanion) provider.model = models.value;
  };
  discover.onclick = async () => {
    if (pending || !(provider instanceof ConfiguredCompanion)) return;
    const controller = new AbortController();
    pending = controller;
    try {
      const names = await provider.discover(controller.signal);
      if (disposed || pending !== controller) return;
      status.textContent = !provider.discoveryAvailable
        ? "Configured model list only; send a question to test the connection."
        : names.length
          ? `Provider responded; approved available models: ${names.join(", ")}`
          : "Provider responded; no approved models available.";
    } catch (error) {
      if (!disposed && pending === controller)
        status.textContent = (error as Error).message;
    } finally {
      if (pending === controller) pending = undefined;
    }
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
      if (provider instanceof ConfiguredCompanion) {
        const size = (text: string) => new TextEncoder().encode(text).length;
        if (
          next.length > 18 ||
          size(shared.value) > 4096 ||
          size(source.value) > 160 ||
          next.some((message) => size(message.content) > 4096) ||
          next.reduce(
            (sum, message) => sum + size(message.content),
            size(shared.value) + size(source.value),
          ) > 12000
        )
          throw Error(
            "Provider context limit: clear chat or shorten the selected text before sending.",
          );
        provider.source = source.value;
        provider.reference = topic.value;
        provider.retrieve = retrievalEnabled.checked;
        provider.system = system.value;
      }
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
      append(
        provider instanceof ConfiguredCompanion
          ? provider.fixture
            ? "Provider fixture"
            : "Model"
          : "Offline guide",
        answer,
      );
      if (provider instanceof ConfiguredCompanion && provider.retrieval) {
        const sources = document.createElement("div");
        renderReferences(sources, provider.retrieval);
        log.append(sources);
      }
      question.value = "";
      shared.value = "";
      showScope();
      status.textContent =
        provider instanceof ConfiguredCompanion
          ? provider.fixture
            ? "Deterministic provider fixture replied; no model or guest action."
            : "Configured model replied; verify advice against historical references. No guest action."
          : "Local fixture response · no model contacted or guest action taken.";
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
    unsubscribe();
    pending?.abort();
    messages = [];
  };
}
