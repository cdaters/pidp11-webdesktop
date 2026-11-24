# Selected-text 0.2 — future conformance plan

**Planned, not executed or implemented.** This plan qualifies the
[proposed contract](selection-contract-0.2-proposal.md), not the unchanged 0.1
experiment. Reuse regression machinery without overwriting its baselines. Each
future result must identify exact adapter, Desktop and consumer revisions, test
layer and whether text/model/guest interaction is fixture or genuine.

| ID | Case and observable acceptance condition | Required layer |
|---|---|---|
| C01 | Provider/config disabled by default: opening either application makes zero provider calls, publishes nothing and does not enable tools; normal independent operation still works | Both applications, request capture |
| C02 | Select → exact preview → approval: no publication before approval; later text/destination edits during negotiation cannot replace frozen preview; cancelled/expired/mismatched preview handle fails; UTF-8 bytes, not character count, govern bounds | Desktop unit, authenticated HTTP and three-browser UI |
| C03 | Manual receipt import: opening companion, pasting or editing does not retrieve or submit a question; explicit Load uses fixed provider, exact configured audience and independent sign-in. No text, URL, cookie or bearer token in envelope | Both browsers/backends, network inspection |
| C04 | Missing, empty, duplicate, comma-joined, malformed or wrong receipt: zero excerpt bytes returned. Valid read credential alone is insufficient; exact receipt alone is insufficient | Real adapter HTTP/TLS |
| C05 | Exact text: all fields, whitespace/UTF-8 and original expiry match approved snapshot; loading checks response shape/receipt/audience; per-question reread cannot substitute even identical-text new publication | Adapter/client and consumer UI |
| C06 | Expiry: at boundary and after 30 seconds reject read; reads cannot extend approval; shorter identity assertion expiry wins; clock rollback/skew cannot restore usable local state | Controlled-clock adapter/client tests |
| C07 | Revoke: atomically empties slot and advances epoch even when empty. An in-flight old-epoch publish cannot resurrect it; same-source delayed callback cannot overwrite newer state | Concurrent adapter tests |
| C08 | Replacement/shared slot: only one publisher wins same epoch; fresh epoch replacement retires old receipt even for equal text. One page's global revoke retires another's selection; UI explains effect | Multi-client TLS and two-page UI |
| C09 | Cancellation before/during negotiation, during body, after delayed success and before model submit/display: discard late reply, no retry or queued request, no receipt/history restoration; uncertain publish reports bounded remaining exposure and attempts global revoke | Fault-injected clients and real delayed TLS |
| C10 | Source generation: changed simulator, attachment, service instance, viewer revision, removed/replaced same-count viewer or lost view invalidates pending publication and read. Browser cannot forge a source-view membership | Identity callback races plus Desktop binding tests |
| C11 | Reused terminal port: new source listener/process at same address cannot inherit approval. Same-process OS changes remain explicitly unobservable; do not claim test detects what identity cannot establish | Disposable lifetime lab plus limitation review |
| C12 | Cross-origin: adapter refuses every Origin, CORS/preflight and query-based transfer; both applications enforce own session/Origin/CSRF on mutations; arbitrary receipt-provided endpoints/redirects refused | HTTP/TLS, browser network capture |
| C13 | Credentials: read token cannot publish/revoke/status; publisher cannot retrieve; tokens cannot be equal; browser payload/HTML/storage, logs, URLs and model context contain no service credentials | Role matrix, canaries, UI/model sink |
| C14 | Negotiation: exact version, mandatory capabilities/sole authority and bounds; unsupported/missing/downgrade responses stop flow, while publisher revoke remains callable. Consumer never loads publication credential | Client fixtures and real TLS |
| C15 | Independent stop/restart: adapter starts empty/new epoch; consumer starts without receipt or selection-derived history; publisher restart retires old approval before new work; abrupt publisher loss never claimed immediately revoked; guest/console continue independently | Disposable application lifecycle lab |
| C16 | No console/control fallback: missing provider, expiry, refusal, no receipt and model tool request cannot invoke `read_screen`, `/screen`, `keys`, monitor, shell, storage or panel. Explicit switch to a normal mode clears selection context; never auto-enables normal tools | Instrumented consumer route/tool counters |
| C17 | Local expiry/revoke/failure: clear receipt/include state, cancel operation, advance history generation and signal local reset. Late model answer cannot repopulate history. Remote revoke is detected on next read/expiry, not promised immediate cross-page delivery | UI fake clock, delayed request and two-page tests |
| C18 | Retention honesty: further requests cannot silently reuse selection-derived history after expiry/revoke or unchecked inclusion. Notice says already delivered text, other instances, clipboard and submitted model requests cannot be recalled; no global-deletion claim | Consumer history assertions and manual copy review |
| C19 | Bounds/errors: 1/4096-byte texts, rejected empty/4097-byte text, 6 KiB JSON escaping, duplicate/unknown/trailing JSON, wrong viewer types, oversized responses/headers, transport failures; bounded errors reveal no excerpt or token; slow consumer cannot block retirement | Decoder/property cases, TLS and lock/race tests |
| C20 | Legacy preservation/profile isolation: unchanged 0.1 tests continue to pass. In explicitly selected 0.2 profile old routes cannot read/publish the new slot; no implicit upgrade, version fallback or two simultaneous consent stores | Both profiles, configuration/migration tests |

## Qualification order and reporting

First test deterministic state/decoders and role-separated clients. Then run actual
trusted loopback TLS with controlled faults, followed by Desktop and independently
implemented consumer UI in Chromium/Firefox/WebKit. Inspect actual network/model
payloads with synthetic canaries, not private credentials or console transcripts.
Finally, only with separate authorization, qualify actual consumer/model/genuine
selection use in the disposable guest lab. Never start the physical Pi for this plan.

Keep existing nine client, six modified-module and Go/TLS test sources unchanged
until a separately reviewed implementation requires additions. Tests in
[`integrations/selection-contract`](../../integrations/selection-contract),
[`internal/replicant`](../../internal/replicant), and
[`lab/m516/selection-ui.mjs`](../../lab/m516/selection-ui.mjs) are useful foundations;
they do not already prove 0.2 or a native upstream provider.

A report must separate agreed design, implemented code, fixture results, actual
application interoperability and upstream adoption. No count is a compatibility
claim without the tested revisions, disabled/negative cases and lifecycle evidence.
Preserve original console independence and the known inability to infer OS identity,
recall delivered data or guarantee provider-side cancellation.
