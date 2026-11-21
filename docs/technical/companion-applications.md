# Optional companion application boundaries

M5.6 extends the [M5.5.1 community review](../lab/M5.5.1-community.md); it does not import or combine those projects. Rolf Peters' Hacker Replicant, Oscar's Agent-PDP1, VT05/other terminal experiments and The High Nibble's desktop remain independent work. Their control models should be discussed with their maintainers before proposing integration. No contact, partnership or plugin loader is implied. M5.9 adds the separate offline companion described below.

A useful future application contract should distinguish:

| Boundary | Proposed information and obligations |
|---|---|
| Application lifecycle | A host element and explicit cleanup; bounded timers, event listeners, workers and queues; closing a window cannot stop an emulator |
| Device identity | Opaque endpoint ID, service instance and generation; labels are descriptive, not authentication or OS evidence |
| Representation | Explicit terminal personality and encoding, or a distinct graphics protocol; VT05/VT52/VT100 text, 4010 bytes and VT11 events are not interchangeable |
| Observation | Bounded ordered output with generation and coverage; disconnect/loss is visible, and stale data cannot become a current screen |
| Input | Existing exclusive keyboard lease, sequence checks and ASCII bounds; no automatic acquisition or replay after reconnect |
| Capabilities | Explicitly granted guest-terminal observation/input only; no implicit host shell, SIMH monitor, GPIO, boot, disk or panel authority |
| Resource use | Stop subscriptions on disposal; preserve the service's existing bounds; test slow consumers and competing viewers |

An in-process TypeScript module is trusted application code, **not a security sandbox**. Arbitrary third-party code cannot safely receive the desktop's session or DOM simply by being called a plugin. External companion origins need a separately designed authentication, CSP and permission boundary; embedding an unrestricted remote-control page does not enforce our restrictions.

Prove an adapter first with deterministic conformance fixtures and malformed/disconnected cases, then disposable genuine guests where applicable. Record exactly what passed. Keep original console, physical controls and guest lifecycle independent. Optional external intelligence, if ever pursued separately, must be absent by default and unnecessary for the complete desktop. Terminal output and model responses are data, never authority to widen capabilities.

## M5.9.1 current integration

The existing provider library is now registered behind authenticated service routes and optional private configuration. The offline guide remains the default. Explicit model discovery, destination disclosure, bounded selected-text sharing, cancellation and inert replies are implemented. Separately, an operator-disabled-by-default terminal review admits three exact UNIX suggestions and requires a single-use human approval under the current attachment and keyboard lease. No model tool execution or physical authority is supplied.

[Setup and workflow](../getting-started/configured-companion.md) · [Decision and limits](../decisions/0007-completed-devices-and-companion.md) · [Actual evidence](../lab/M5.9.1.md). Rolf's architecture remains a useful independent reference; no code import, compatibility agreement or partnership is implied.

## M5.9 historical starting point

The following describes the earlier increment; M5.9.1 supersedes its “not registered” and future-only approval status.

### Optional AI Companion

The desktop now offers an explicitly labeled **offline guide fixture**. It answers a small set of useful V7/terminal/graphics questions deterministically. It is not a language model. Questions and deliberately pasted excerpts remain in the window; no terminal text is captured automatically. Clear or close discards the conversation and cancels pending work. Submitted and displayed text is inert, with a 20-message, 16,384-character conversation bound and 4,096-character excerpt/response bounds.

The TypeScript `CompanionProvider` contract has only a cancellable chat operation. A separate Go `internal/companion` library has tested native [Ollama chat](https://docs.ollama.com/api/chat) and [OpenAI-compatible chat](https://developers.openai.com/api/reference/resources/chat) dialects. It requires an explicitly configured complete endpoint, HTTPS except literal-loopback HTTP, at most one concurrent request, a 20-second timeout and bounded request/response bodies. It refuses redirects, unsupported response shapes, partial results and tool requests. Credentials belong to a future private host configuration. The library is **not registered in the service**, and the UI has no provider configuration yet. Tests used local HTTP fixtures, not actual models or paid services.

A future integration should run on a capable owner-controlled host, never make the Pi model inference mandatory, and explain the exact destination before sharing text. A model claiming tools does not grant it any tools here. Rolf's [Hacker Replicant](https://github.com/rolfpeters-droid/pidp11-hacker-replicant) remains an independently authored project and architectural inspiration, not an imported component or agreed collaboration.

`CommandProposal` and `reviewProposal` prototype exact-input, short-expiry, endpoint, generation, connection and keyboard checks. They neither ask for nor consume human approval, and cannot send terminal input. Before connecting such proposals to a terminal, implement one-use approval records, recheck at delivery, display exact bytes, invalidate on lease/connection changes and reject uncertain delivery without replay. No host shell, SIMH monitor, panel, mount or shutdown API is added.
