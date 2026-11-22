# Hacker Replicant interoperability foundation

Reviewed upstream: Rolf Peters' [PiDP-11 Hacker Replicant, revision 6f8a2aca7786736e01bdf5ba9b44bf66a7f19349](https://github.com/rolfpeters-droid/pidp11-hacker-replicant/tree/6f8a2aca7786736e01bdf5ba9b44bf66a7f19349). This remained the current remote revision during Phase B. Its MIT license names Rolf Peters, copyright 2026. No upstream application code was imported, installed or executed, and no developer was contacted. This is an independently implemented compatibility foundation, not an endorsed or completed integration.

## What the current implementation actually does

The reviewed [`pidp11-bootapi.py`](https://github.com/rolfpeters-droid/pidp11-hacker-replicant/blob/6f8a2aca7786736e01bdf5ba9b44bf66a7f19349/pidp11-bootapi.py) provides three routes beneath `/api/pidp11`:

| Upstream route | Actual meaning | Web Desktop boundary |
|---|---|---|
| `GET /screen` | GNU Screen hardcopy of the existing `pidp11` operator-console session, returned as `{"text":"..."}` | Only a deliberately shared, bounded guest selection; not an automatic hardcopy or current screen |
| `POST /keys` | `screen -X stuff` writes text into that same console; literal backslash-r/backslash-n sequences become Return | Refused by the new compatibility contract, including otherwise approved UNIX suggestions |
| `GET /status` | `running` means a matching Screen session exists; `os` is read from the simulator command-file path | Preserve as unverified upstream claims; never equate with CPU RUN, current guest identity or an attachment generation |

That console can reach boot prompts and the SIMH monitor. Our dedicated guest serial line deliberately excludes that authority. Naming both surfaces “terminal” does not make them interchangeable.

The boot API binds all interfaces with permissive CORS and no built-in authentication, with its own warning about exposure. Its keyboard route has no Web Desktop generation, exclusive keyboard lease, one-use approval or command allowlist. Do not point an unmodified agent at the optional service's credentials or expose this API on its behalf.

The reviewed [`server.js`](https://github.com/rolfpeters-droid/pidp11-hacker-replicant/blob/6f8a2aca7786736e01bdf5ba9b44bf66a7f19349/server.js) supports local/cloud OpenAI-compatible endpoints, configurable models and server-side API keys. Tools are off by default in its UI. When enabled, `send_keys` and `read_screen` execute in an action-limited loop, with provider and tool timeouts. This is not per-command human approval. The code also retrieves `/status` before chat even with tools off. The inspected request path does not propagate browser disconnection to an AbortController for the tool loop; a timeout is not evidence that closing the browser stopped an already submitted operation. It supplies SSE progress, rather than our bounded nonstreaming answer surface.

The optional [`webconsole/app.py`](https://github.com/rolfpeters-droid/pidp11-hacker-replicant/blob/6f8a2aca7786736e01bdf5ba9b44bf66a7f19349/webconsole/app.py) separately provides a PTY/Screen console and a DZ11 telnet bridge. Its boot/stop routes manipulate Screen and simulator/panel processes. Those lifecycle functions are outside this integration's scope. They were reviewed, not run.

## Implemented now

1. [`internal/replicant`](../../internal/replicant/contract.go) converts an explicitly shared guest selection into a text readback envelope, preserving endpoint/generation and labeling its narrower semantics. It refuses missing consent, wrong attachment identity, invalid UTF-8 and over-4-KiB text. It does not capture, store, refresh or send terminal contents. Its status decoder retains upstream claims while reporting CPU/attachment identity as unknown/unverified. Its keyboard entry point always refuses.
2. The contract's deterministic tests use the actual upstream JSON shapes and exercise generation mismatch, missing consent, malformed status, bounds and refusal of automatic keys. This is a tested Go library contract, not a registered `/screen` or `/keys` HTTP service or a loaded Hacker Replicant application. A future caller must obtain identity from the existing authenticated terminal state, not from a model.
3. [`cmd/model-gateway`](../../cmd/model-gateway/main.go) exposes an authenticated, bounded **chat-only** OpenAI-compatible endpoint, approved model listing and the same reference search used by Web Desktop. Both projects can use one already installed model runner without a second download. The request-shape tests include Hacker Replicant's system/user messages. System prompts are carried as inert user context to our existing provider adapter. Tool fields and runner-management routes are rejected. This means upstream control mode is deliberately incompatible.
4. `/v1/references?q=...&system=...` returns source metadata and complete original notes without calling a model. An external application can show the returned notes, then deliberately include selected context in chat. No automatic terminal readback accompanies this interface.

The existing browser companion still uses its existing authenticated routes. No new model response can acquire a lease, change an attachment or approve a command. The separate `pwd`, `ls`, `ls /` review experiment remains disabled by default and is unchanged. The new contract does not bypass it by translating `send_keys` into a proposal.

## Questions for a future discussion

- Can a read-only external surface accept **user-selected** guest text instead of requesting a complete operator-console hardcopy?
- Can guest identity include a service instance and attachment generation, with stale observations explicitly retired?
- Can model and tool cancellation propagate through a browser disconnect, while uncertain keyboard delivery remains non-replayable?
- Can the model-host connection use a narrow authenticated gateway and explicit model allowlist, with tools absent for knowledge-only sessions?
- Can a source lookup result retain edition/system/section and incomplete-coverage status without treating a retrieved note as authority to act?
- Would optional, independently authenticated navigation to an external companion be preferable to embedding code with access to our browser session?

These are proposed discussion topics, not agreed changes. A future application integration needs a separate security and genuine-guest acceptance review. Original console, physical controls, guest lifecycle and media must remain independent of either assistant.

## Phase C: working read-only HTTP and pinned upstream chat

The Phase B contract now has an optional `internal/replicant.Adapter`. An embedding application publishes a consented, bounded selection locally; no publish endpoint or terminal reader is exposed. Token-authenticated GET `/api/pidp11/screen` returns the upstream `text` field plus `endpoint`, `generation` and narrower semantics. A selection expires in 30 seconds, is checked against the current attachment and is forgotten on mismatch. GET `/status` returns `os:null`, `running:null`, `cpu_running:"unknown"`; this adapter cannot observe GNU Screen or CPU RUN. `/keys` refuses every request. The embedding host must supply TLS, private token delivery and authoritative, concurrency-safe attachment tracking.

Upstream revision `6f8a2aca7786736e01bdf5ba9b44bf66a7f19349` was refreshed and tested unchanged in a disposable network namespace, with tools OFF. A real Gemma response arrived through the authenticated model gateway. Direct use rejected the upstream prompt because it exceeds the gateway's 4,096-byte message limit. A **lab-only shim** splits a bounded system prompt into messages while preserving the production 20-message/16-KiB limits. It also translates unknown status into upstream's unavailable-status path because upstream otherwise mistakes `running:null` for stopped.

These results establish a working selected-text adapter and an adapted upstream chat demonstration. They do not establish unmodified full compatibility, upstream UI selection sharing or genuine guest acceptance. Upstream tools-disabled chat does not automatically call readback; the harness separately exercised it with labeled synthetic text. The upstream browser disconnect does not cancel its pending model fetch; our gateway deadline bounds it, while direct desktop/gateway cancellation was verified separately. No Screen, SIMH monitor or guest keyboard authority was added.

Specific questions for a future owner-approved discussion with Rolf:

1. Can status explicitly distinguish absent/unknown Screen, verified guest identity and CPU state?
2. Can a read-only selected-text capability carry attachment generation and expiry without implying operator-console access?
3. Could the backend support authenticated boot-API requests and reject non-loopback exposure by default?
4. Can model prompt limits be negotiated or bounded messages supported without enabling tool calls?
5. Can browser disconnects cancel the corresponding model fetch, and can tools be administratively disabled rather than just toggled in the UI?

No outreach, collaboration, endorsement or merged upstream work occurred. [Lab evidence and exact boundaries](../lab/M5.9.3-C.md).
