import references from "../internal/companion/references.json" with { type: "json" };
import type { Retrieval } from "./companion-references.ts";
import type { CompanionProvider, CompanionRequest } from "./companion.ts";

/** Same-origin chat only. Endpoint and credentials come solely from the owner's
 * private service configuration; browser input cannot select a host or URL. */
export class ConfiguredCompanion implements CompanionProvider {
  readonly name: string;
  source = "Manually pasted excerpt";
  reference = "";
  retrieve = true;
  system = "";
  retrieval?: Retrieval;
  readonly destination: string;
  model: string;
  readonly fixture: boolean;
  readonly discoveryAvailable: boolean;
  private csrf: string;
  constructor(
    destination: string,
    model: string,
    fixture: boolean,
    csrf: string,
    discoveryAvailable = false,
  ) {
    this.destination = destination;
    this.model = model;
    this.fixture = fixture;
    this.csrf = csrf;
    this.discoveryAvailable = discoveryAvailable;
    this.name = `${fixture ? "DETERMINISTIC PROVIDER FIXTURE" : "Configured model provider"} · ${destination}`;
  }
  async reply(request: CompanionRequest, signal: AbortSignal): Promise<string> {
    const response = await fetch("/api/v1/companion/chat", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrf,
      },
      body: JSON.stringify({
        model: this.model,
        reference: this.reference,
        retrieve: this.retrieve,
        system: this.system,
        messages: request.messages,
        shared_text: request.sharedText,
        source: this.source,
        send_to_configured_provider: true,
      }),
    });
    if (!response.ok) throw Error((await response.text()).slice(0, 512));
    const answer: unknown = await response.json();
    if (
      !answer ||
      typeof answer !== "object" ||
      !("answer" in answer) ||
      typeof answer.answer !== "string" ||
      answer.answer.length > 4096
    )
      throw Error("Invalid provider response");
    this.retrieval = undefined;
    if ("retrieval" in answer) {
      const result = answer.retrieval;
      if (
        !result ||
        typeof result !== "object" ||
        !("status" in result) ||
        typeof result.status !== "string" ||
        !("notes" in result) ||
        !Array.isArray(result.notes) ||
        result.notes.length > 2
      )
        throw Error("Invalid reference result");
      const notes = result.notes.map((note: unknown) => {
        if (!note || typeof note !== "object" || !("id" in note))
          throw Error("Invalid reference ID");
        const trusted = references.find((entry) => entry.id === note.id);
        if (!trusted) throw Error("Reference missing from installed catalog");
        return trusted;
      });
      this.retrieval = { status: result.status, notes };
    }
    return answer.answer;
  }
  async discover(signal: AbortSignal): Promise<string[]> {
    const response = await fetch("/api/v1/companion/models", {
      method: "POST",
      signal,
      headers: { "X-CSRF-Token": this.csrf },
    });
    if (!response.ok) throw Error((await response.text()).slice(0, 512));
    const result = await response.json();
    if (
      !Array.isArray(result.models) ||
      result.models.length > 32 ||
      result.models.some(
        (m: unknown) => typeof m !== "string" || m.length > 128,
      )
    )
      throw Error("Invalid model inventory");
    return result.models;
  }
}

/** Inspection makes no provider network call; discovery/chat require a click. */
export async function configuredCompanion(
  signal: AbortSignal,
): Promise<{ provider: ConfiguredCompanion; models: string[] }> {
  const session = await fetch("/api/v1/session", { signal });
  if (!session.ok)
    throw Error(
      "Sign in through Guest terminal first; a writer credential is required for model chat.",
    );
  const auth = await session.json();
  if (typeof auth.csrf !== "string") throw Error("Session unavailable");
  const response = await fetch("/api/v1/companion", { signal });
  if (!response.ok)
    throw Error("Configured companion unavailable or permission missing");
  const config = await response.json();
  if (!config.configured)
    throw Error(
      "No model provider configured; the offline guide remains available.",
    );
  if (
    typeof config.destination !== "string" ||
    !Array.isArray(config.models) ||
    !config.models.length ||
    config.models.length > 32 ||
    config.models.some((m: unknown) => typeof m !== "string" || m.length > 128)
  )
    throw Error("Invalid provider configuration response");
  return {
    provider: new ConfiguredCompanion(
      config.destination,
      config.models[0],
      config.fixture === true,
      auth.csrf,
      config.discovery === true,
    ),
    models: config.models,
  };
}
