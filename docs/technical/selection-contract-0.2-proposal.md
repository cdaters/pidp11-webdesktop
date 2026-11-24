# Selected-text contract 0.2 — proposal for review

**Status: proposed, not implemented or upstream-approved code.** M5.23.1 records
Rolf Peters' architectural direction as relayed by the owner. The exact wire names,
receipt handoff and implementation sequence below are Web Desktop recommendations
for review. The implemented [0.1 draft](selection-contract-draft.md), experimental
`/api/pidp11/screen` route and all prior results remain unchanged. See the
[decision/change inventory](M5.23.1-interoperability-review.md) and
[future conformance plan](selection-contract-0.2-conformance.md).

## Independent applications and credentials

Web Desktop owns selection, preview, approval, publication and global revocation.
Hacker Replicant is an optional, independently authenticated consumer, disabled by
default. Enabling this provider must not enable existing tools, console/keyboard,
SIMH monitor, host shell, storage, panel or guest-lifecycle access. Its existing
`read_screen` tool obtains a GNU Screen hardcopy: it is a different operation and
must never be a fallback for a missing or rejected selected excerpt. Normal modes
remain independent; entering another mode must clear this provider's receipt and
selection-derived future model context, not carry its authority into a tool loop.

| Party | Credential custody and authority |
|---|---|
| Web Desktop browser | Its own session and CSRF protection; temporary preview handle and receipt only. No adapter bearer credential |
| Web Desktop backend | Separate publication credential; may negotiate, obtain publication status, publish and globally revoke. No consumer credential required |
| Selection adapter | Validates separately provisioned publisher/read credentials and one fixed consumer audience; owns the single slot, epoch, expiry and identity callback |
| Hacker Replicant backend | Separate read credential for its configured provider/audience; may negotiate and retrieve exact receipts. Cannot publish or globally revoke |
| Hacker Replicant browser | Its independent login/session, manually imported receipt and approved excerpt preview; neither adapter credential |
| Optional model service | Independently configured authentication; receives only the deliberately included excerpt/question, never receipts, adapter credentials or guest control |

Credentials are installed deliberately on their own servers, not exchanged by the
apps. Equal publisher/read credentials are rejected. A receipt identifies one
publication; **possession of it is insufficient without the read credential**.
The destination label and consumer ID are configured locally, not supplied by a
model, URL parameter or pasted receipt. One consumer audience is enough initially;
this is not a multiuser or page-scoped authorization system.

```mermaid
sequenceDiagram
 participant U as User
 participant W as Web Desktop browser and backend
 participant A as Selection adapter
 participant H as Independently signed-in Hacker Replicant
 participant M as Configured model
 U->>W: Select text; request exact preview
 W->>A: Negotiate and get epoch / current attachment (publisher credential)
 W-->>U: Immutable text, destination and expiry preview
 U->>W: Explicitly approve that preview
 W->>A: Publish approved snapshot with epoch and identity
 A-->>W: Unpredictable receipt and absolute expiry
 W-->>U: Copy receipt on explicit action
 U->>H: Paste receipt; explicitly load approved excerpt
 H->>A: Negotiate; GET selected-text with read credential and receipt
 A-->>H: Exact bounded excerpt, receipt, identity and expiry
 H-->>U: Show excerpt; inclusion initially unchecked
 U->>H: Deliberately include excerpt in this question
 H->>A: Revalidate same receipt immediately before use
 H->>M: Question and excerpt as untrusted data, without tools
```

## Web Desktop consent and receipt handoff

The browser selects text only from its chosen terminal. Before the first await it
copies the exact string and source-view reference; subsequent selection edits do
not modify that copy. The backend resolves the authenticated source-view reference
to its actual attachment and viewer generation. Browser-supplied identity strings
are not sufficient. Missing or uncertain source ownership refuses preparation.
No terminal scraping or full-screen read is added.

A future same-origin Web Desktop handler would obtain the adapter epoch and
identity **before showing the final approval preview**, then retain one bounded
pending immutable preview, tied to that signed-in session/source view and a random
single-use handle. Proposed internal application routes (also unimplemented) are
`POST /api/v1/companion/selection/preview`,
`POST /api/v1/companion/selection/publish`, and
`DELETE /api/v1/companion/selection`. These are not adapter or upstream routes.
They require the existing application authentication, exact Origin, CSRF and
explicit sharing authorization. The publish request contains only the pending
handle and affirmative approval, not replacement text or a destination URL.

The preview shows exact decoded text, selected source, configured Hacker Replicant
destination and maximum lifetime. It must expose whitespace/control characters
without silently changing the submitted text; reject text the UI cannot review
faithfully. Approval copies no new terminal data. Pending preparation expires
within 30 seconds; a fresh preview invalidates the previous handle. Identity,
expiry, epoch and session/view lifetime are rechecked at commit. Failed negotiation
or epoch mismatch requires another preview and approval; never refresh the epoch
and retry the same approval automatically. This closes the earlier draft's gap
between the user's preview and the start of its status-to-publication fence.

The backend holds the publication token and returns only a bounded receipt
handoff object to its browser. **Recommended first transport: explicit manual
copy and paste**, not cross-origin messaging. Example schema, with symbolic values:

```json
{
  "protocol": "pidp11-explicit-selection",
  "version": "0.2-proposed",
  "consumer_id": "configured-companion",
  "selection_id": "<32 lowercase hex characters>",
  "expires_unix_ms": 1800000000000
}
```

Copy requires a user action; never read the clipboard automatically. The user
pastes into an independently signed-in Hacker Replicant receipt field and selects
Load approved excerpt. Limit this envelope to 1 KiB, reject unknown fields and
compare consumer ID against fixed server configuration. It contains no excerpt,
URL, host path or privileged credential. Do not treat its timestamp or audience as
trusted: the server response is authoritative. The consumer must not discover a
provider from pasted data. Clipboard contents can survive expiry, but cannot
resurrect an expired receipt; neither application can promise clipboard deletion.

Do not use URL queries/fragments, deep links, iframe access, `postMessage`, CORS,
shared cookies/storage or an opener channel. Optional companion navigation remains
plain `noopener,noreferrer` HTTPS navigation, passing nothing. Opening it is not
publication or retrieval. An automated handoff would require another reviewed
transport; none is silently included in this proposal.

## Proposed versioned adapter routes

The configured base is an exact trusted HTTPS origin; append only the following
literal paths. No discovery, redirects, alternate hosts, browser-origin requests
or automatic retries. Browser-to-own-backend traffic is separate from this
server-to-server API. All responses use `Cache-Control: no-store`; do not log
Authorization, receipts, excerpt bodies or receipt handoff objects.

| Method and full proposed path | Allowed credential | Operation |
|---|---|---|
| GET `/api/pidp11/v0.2/capabilities` | Publisher or read | Explicit negotiation; no selection |
| GET `/api/pidp11/v0.2/status` | Publisher only | Epoch and attested attachment for preview preparation; no text |
| POST `/api/pidp11/v0.2/selection` | Publisher only | Exact approved snapshot, consume matching epoch |
| DELETE `/api/pidp11/v0.2/selection` | Publisher only | Global revoke, including empty slot; advance epoch |
| GET `/api/pidp11/v0.2/selected-text` | Read only | Mandatory exact `X-Selection-ID`; no query parameters |

`0.2-proposed` is the proposed capability version, not today's `0.1-draft` or a
published compatibility promise. Both clients require an exact negotiated match,
all listed capabilities and exactly the sole authority below. Unknown versions,
missing requirements or added machine authority refuse the workflow. Additional
informational capabilities confer no authority. The adapter profile and consumer
provider must both be explicitly enabled; default configuration makes no calls.

```json
{
  "protocol": "pidp11-explicit-selection",
  "version": "0.2-proposed",
  "capabilities": ["publication-epoch", "selected-text-receipt-required", "desktop-owned-publication", "consumer-bound-receipt", "single-slot", "attachment-viewer-fencing", "explicit-revoke", "expiry", "local-history-reset", "unknown-os"],
  "authority": ["selected-text-only"],
  "maximum_selection_bytes": 4096,
  "maximum_lifetime_seconds": 30,
  "maximum_publication_bytes": 6144,
  "maximum_response_bytes": 8192
}
```

The publisher's status response contains `publication_epoch`, `attachment`,
`attachment_confirmed`, `os:null`, `running:null`, `cpu_running:"unknown"`.
`attachment` contains `endpoint`, `generation`, `simulator_generation` and
`viewer_revision`. Confirmation means an accepted lifetime assertion, not OS/CPU
observation. Capture the tuple and epoch together; revalidate on publication.
Identity strings are nonempty, at most 128 UTF-8 bytes. Viewer revision is a
required positive safe integer, at most 9007199254740991. Epoch is an opaque,
bounded adapter-instance/revision token (at most 128 ASCII characters).

Publisher request, symbolic identities rather than a real guest:

```json
{
  "publication_epoch": "example-instance:1",
  "consumer_id": "configured-companion",
  "consent": true,
  "selection": {
    "endpoint": "example-line",
    "generation": "example-attachment",
    "simulator_generation": "operator-process-assertion",
    "viewer_revision": 1,
    "text": "Exactly the reviewed excerpt"
  }
}
```

Text must be valid UTF-8, 1–4096 bytes, with no truncation or normalization after
preview. Preserve the 4 KiB limit and 30-second maximum lifetime. JSON escaping can
hit the separate 6 KiB publication limit first; report that before approval rather
than modifying the text. Preflight the encoded read-response budget too; escaping
must never produce an oversized reply or silent truncation. Reject duplicate/unknown fields, trailing JSON, wrong
types, absent consent and out-of-range values. Consumer IDs are configured bounded
ASCII identifiers of at most 64 characters, never network addresses.

Proposed publication success is **201 JSON**, distinct from legacy 204:
`{selection_id, expires_unix_ms, consumer_id}` with identical `X-Selection-ID`
response header. Generate 128 random bits as 32 lowercase hex characters. Server
expiry is no later than 30 seconds after publication or the trusted attachment
assertion's expiry, whichever comes first. Reads never renew it. A successful
publication atomically consumes the epoch, retires the previous receipt (even for
identical text), and stores the immutable selection. Concurrent publishers using
one epoch cannot both win. Retirement and publication must share the same lock or
compare-and-swap boundary; a stale identity callback cannot restore retired state.

Retrieval requires **exactly one** syntactically valid `X-Selection-ID` header;
reject missing, empty, duplicate or comma-joined values before returning text. An
unpredictable receipt alone does not authenticate. Validate read credential,
consumer audience, exact receipt, attachment/simulator/viewer tuple and expiry,
then return 200 JSON:

```json
{
  "selection_id": "<same 32 lowercase hex characters>",
  "consumer_id": "configured-companion",
  "text": "Exactly the reviewed excerpt",
  "endpoint": "example-line",
  "generation": "example-attachment",
  "simulator_generation": "operator-process-assertion",
  "viewer_revision": 1,
  "expires_unix_ms": 1800000000000,
  "semantics": "explicit-guest-selection; not operator console or live screen"
}
```

The consumer validates receipt, audience, required fields, UTF-8/byte bounds,
expiry and cancellation before showing or using text. On loading, freeze that
complete tuple and text; before a deliberately included question, re-read the same
receipt and require identical facts and original expiry. No substitution, refreshed
expiry or silent question submission without its requested context. The include
choice resets after each question. Selection-derived model history must not bypass
fresh validation on later questions: retain it separately, and clear/exclude that
context unless the same receipt is freshly validated and inclusion is deliberate.
A plain question may proceed without selection only by the user's separate choice.

## Retirement, errors and failure behavior

One shared slot means two Web Desktop pages can replace one another's approvals;
any authorized global revoke clears the slot, not merely the current page. Tell the
user this. Revocation returns 204, advances the epoch even if empty, and prevents
an old in-flight publication from restoring the slot. Revoke does not require a
working capabilities negotiation. Expiry and observed identity loss clear the
selection and advance the epoch; neither terminates a guest. Adapter restart uses
a new instance, empty slot and no persisted publication or receipt.

| HTTP | Proposed meaning; no text, token or receipt echoed on error |
|---|---|
| 400 | Malformed JSON/header, missing receipt, bad type, invalid consent or unsupported query |
| 401 | Missing/invalid bearer authentication |
| 403 | Wrong credential role/audience, any Origin on adapter requests, or forbidden control access |
| 404 / 405 | Unimplemented route / unsupported method |
| 409 | Stale epoch, missing/retired/replaced/expired receipt, uncertain or changed attachment; generic fresh-approval-required response |
| 413 | Publication/metadata exceeds its bound |
| 429 | Busy bounded operation; no queued or automatic retry |
| 503 | Required identity source unavailable; refuse text, retire uncertainty |

Use bounded JSON error codes, not raw upstream errors. A five-second bound per
adapter request and 8 KiB maximum response carry forward the existing client
limits. Browser/backend cancellation propagates through negotiation, body reading
and model requests. Recheck cancellation and operation/history generation after
**every await**, including the final body and before model submission/display.
Window closure, sign-out and provider disable clear local handles/context and
cancel pending work. Ordinary browser disconnection is not proof of server revoke.

A timed-out publication may have committed: never retry, expose a late receipt or
claim success. Web Desktop clears its local approval and attempts bounded global
revocation; if that is uncertain, say publication may persist until expiry. This
cleanup can retire another page's slot too. Serialize local publish/revoke, fence
pending operations and require a new preview for subsequent attempts. A consumer
read failure clears local receipt/context, emits the local reset and withholds the
question's selected context; no new receipt is selected automatically.

Use a monotonic local countdown capped by the server expiry and 30 seconds; clock
rollback/uncertainty must not extend approval. The server owns expiry. Clock skew
may reject usable text early. Reconnect does not restore approval or retry a read,
publication or model submission. Reopening either application starts without an
imported receipt. Backend startup must retire any previous publisher-instance
approval before new publications; consumer restart starts empty and cannot resume
selection-derived history. An abrupt publisher crash may leave adapter state for
its remaining bounded lifetime; this is not immediate crash revocation.

In each application, local revoke/expiry/receipt failure clears local receipt and
include state, cancels that operation, advances a history generation and signals
`pidp11-selection-reset` with a reason, **without text or credentials**. This is a
proposed local event, not a cross-origin notification bus. Existing experimental
`pidp11-revoke` behavior remains unchanged. Consumers can detect remote revoke or
replacement only on their next explicit read (or local expiry); no immediate
cross-application signal is promised. Hacker Replicant's Clear selection is local;
global revoke belongs to Web Desktop and must be labeled distinctly.

Neither revocation nor this event recalls already delivered text. A model request
may already include it; another page, process or provider can retain it. Clear the
local future-request history, not claim global deletion. Excerpt retrieval and
model submission are not atomic, so a revoke between them can race already
released data. Guest OS identity remains operator-attested: unchanged process,
socket and viewer generations can conceal a guest switch. Stop the actual bridge
and observer before an intentional guest change; this protocol cannot command that
stop or independently certify the new OS. Original console, SIMH, REALCONS, Screen,
SSH and physical controls remain independent throughout.

## Compatibility and migration gate

Do not rename or repurpose current `/api/pidp11/screen`, change the 0.1 capability
response or reinterpret historical results. The future first migration should use
an explicitly selected **exclusive 0.2 adapter profile**, starting with an empty
slot; legacy read/publication routes must not expose that profile's slot. Otherwise
the old missing-header `/screen` path could bypass the proposed exact-receipt rule.
Use one slot/epoch authority, not parallel competing consent stores. Preserving
the legacy implementation does not mean making it an alternate route to new data.

Supporting old and new active consumers simultaneously is outside this initial
proposal and would require separate isolation/conformance work. No fallback to
legacy `/screen`, upstream `read_screen`, `keys`, boot API or webconsole is allowed.
A separately authorized migration must qualify both unchanged legacy operation
and the new exclusive profile before any native-compatibility claim. No upstream
maintainer is presumed responsible for our adapter, preparation helper or migration.
