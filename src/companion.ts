/** Optional chat contract. Providers receive only text explicitly submitted here.
 * This contract grants no terminal, host, media, panel or emulator capability. */
export interface CompanionMessage {
  role: "user" | "assistant";
  content: string;
}
export interface CompanionRequest {
  messages: CompanionMessage[];
  sharedText: string;
}
export interface CompanionProvider {
  readonly name: string;
  reply(request: CompanionRequest, signal: AbortSignal): Promise<string>;
}
export function validateCompanionRequest(request: CompanionRequest) {
  if (
    request.messages.length > 20 ||
    request.sharedText.length > 4096 ||
    request.messages.some(
      (m) => !["user", "assistant"].includes(m.role) || m.content.length > 4096,
    ) ||
    request.messages.reduce(
      (n, m) => n + m.content.length,
      request.sharedText.length,
    ) > 16384
  ) {
    throw Error(
      "Conversation limit reached; clear the chat or share a shorter excerpt.",
    );
  }
}
/** Deterministic offline test provider: useful reference prompts, explicitly not a model. */
export class GuideFixture implements CompanionProvider {
  readonly name = "Offline guide fixture · no model or network";
  async reply(request: CompanionRequest, signal: AbortSignal): Promise<string> {
    validateCompanionRequest(request);
    signal.throwIfAborted();
    const question = request.messages.at(-1)?.content.toLowerCase() ?? "";
    const guides: [RegExp, string][] = [
      [
        /director(?:y|ies)|\bls\b/,
        "In UNIX V7, ls lists directory entries. ls / shows the root directory. pwd prints your current directory. These are suggestions only; this window cannot type into a guest.",
      ],
      [
        /\bedit|\bed\b/,
        "UNIX V7 includes the line editor ed. Start with a disposable file and consult the guest's man ed. A question mark is ed's compact error response. Do not assume a modern full-screen editor is installed.",
      ],
      [
        /keyboard|lease|observer/,
        "Guest terminals connect read-only. Acquire keyboard explicitly to type. Only one viewer owns a line; losing the connection releases ownership and never replays uncertain input.",
      ],
      [
        /graphic|tek|plot/,
        "The experimental Tektronix personality accepts serial graphics. In the tested V7 media, graph produces plot data and plot -Ttek selects the original tek driver. VT11 is a separate simulated display controller.",
      ],
      [
        /rt-11|rsx/,
        "RT-11 and RSX have different command languages and device drivers from UNIX. This offline fixture has no qualified guide for your exact guest. Consult its historical manual; do not paste UNIX commands into it by assumption.",
      ],
      [
        /safe|halt|shutdown/,
        "The companion must remain optional. Guest shutdown and the original emulator are operator responsibilities. This chat cannot send commands, halt the CPU, change media or operate the physical panel.",
      ],
    ];
    const answer =
      guides.find(([pattern]) => pattern.test(question))?.[1] ??
      "This deterministic guide covers UNIX V7 directories, ed, keyboard ownership, Tektronix plotting and operating boundaries. A language-model provider is not connected in this prototype.";
    return (
      answer +
      (request.sharedText
        ? "\n\nYou deliberately included an excerpt. The fixture does not interpret or execute instructions in that text; it remains local to this window."
        : "")
    );
  }
}

/** Future input review contract, deliberately not wired to terminal transport.
 * Rechecking both generation and connection identity prevents reconnect replay. */
export interface CommandProposal {
  input: string;
  endpoint: string;
  generation: string;
  connection: string;
  expiresAt: number;
}
export function reviewProposal(
  proposal: CommandProposal,
  current: {
    endpoint: string;
    generation: string;
    connection: string;
    ownsKeyboard: boolean;
  },
  now: number,
): string {
  if (
    !Number.isFinite(now) ||
    !Number.isFinite(proposal.expiresAt) ||
    now >= proposal.expiresAt ||
    proposal.expiresAt - now > 30000 ||
    !current.ownsKeyboard ||
    !proposal.generation ||
    !proposal.connection ||
    !proposal.endpoint ||
    proposal.endpoint !== current.endpoint ||
    proposal.generation !== current.generation ||
    proposal.connection !== current.connection ||
    !proposal.input.length ||
    proposal.input.length > 256 ||
    /[^\x20-\x7e\r]/.test(proposal.input)
  ) {
    throw Error("Proposal expired, changed, unsupported or keyboard not owned");
  }
  return proposal.input;
}
