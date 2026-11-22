# Hacker Replicant: proposed read-only interoperability boundary

Prepared for possible owner-directed review with Rolf Peters. No contact, upstream
issue, pull request, endorsement or agreement is implied. Hacker Replicant remains
an independent project. Its original notices and license stay with its checkout;
Web Desktop's adapter is separately attributed in
[the integration directory](../../integrations/hacker-replicant/README.md).

## Two useful but different console models

The inspected upstream revision is
[`6f8a2aca7786736e01bdf5ba9b44bf66a7f19349`](https://github.com/rolfpeters-droid/pidp11-hacker-replicant/tree/6f8a2aca7786736e01bdf5ba9b44bf66a7f19349).
Its `server.js`, `pidp11-bootapi.py` and `public/index.html` use an operator console:
the browser embeds the configured console page, and optional model tools read a
GNU Screen snapshot or send keys to that same console through the boot API.
Upstream's control toggle is off by default; this describes the inspected design,
not a claim that all deployments enable control.

Web Desktop instead reserves a separate guest serial line. An operator console
can reach emulator controls when the guest stops; the dedicated line avoids giving
browser keyboard traffic that monitor authority. It also allows the original
console to remain independent through bridge failure. That tradeoff requires real
guest drivers and login/application services. A listener alone cannot supply them,
as the RT-11 and RSTS experiments demonstrate.

```mermaid
sequenceDiagram
 participant U as Signed-in user
 participant H as Modified Hacker Replicant
 participant A as Read-only selection adapter
 participant T as Trusted lab identity guard
 participant M as Model gateway
 U->>H: Preview exact excerpt and destination; explicitly approve
 H->>A: Read current publication epoch
 H->>A: Publish excerpt with epoch and consent
 A->>T: Verify original process/attachment/view binding
 A-->>H: Unique selection receipt
 U->>H: Ask question with that receipt
 H->>A: Read current excerpt
 A->>T: Recheck binding and expiry
 A-->>H: Exact receipt and bounded text
 H->>M: Question, paraphrased references, consented text
 M-->>H: Qualified generated answer, or explicit refusal
 H-->>U: Display answer; no simulator action
```

## Exact patch inventory

[`prepare.py`](../../integrations/hacker-replicant/prepare.py) refuses a different
upstream revision or a dirty checkout. It changes only these tracked upstream
files and adds the two listed adapter files:

| File | Explicit modification |
| --- | --- |
| `server.js` | Import/install read-only routes before original chat routes; bound JSON to 24 KiB; opt-in loopback HTTPS; blank original console iframe in read-only mode |
| `public/index.html` | Cancellation, no overlapping question, one-use sharing checkbox/receipt, history generation fence after revoke, read-only explanatory text and adapter UI script |
| Added `read-only.mjs` | Separate login credential; exact-origin/session checks; fixed model/adapter destinations; bounded references, selected text, chat and request lifetime; no tools, console route or arbitrary destination |
| Added `public/read-only-ui.js` | Explicit excerpt preview/publication/revocation, reference search and separate selected-text opt-in |

The original tool/console code remains in the disposable upstream tree, but the
opt-in mode intercepts the routes and refuses control. This is why the tested
mode must be explicit and why an unmodified upstream deployment is not covered by
our read-only claim. No upstream file, guest image or model weight is bundled in
the source alpha. The preparation helper is a reproducible experiment, not a
commitment to maintain a permanent fork.

## Minimal reproduction and comparison

In a developer shell, outside any production Pi installation:

```sh
git clone https://github.com/rolfpeters-droid/pidp11-hacker-replicant.git /absolute/new/disposable-checkout
git -C /absolute/new/disposable-checkout checkout --detach 6f8a2aca7786736e01bdf5ba9b44bf66a7f19349
python3 integrations/hacker-replicant/prepare.py /absolute/new/disposable-checkout
git -C /absolute/new/disposable-checkout diff --stat
git -C /absolute/new/disposable-checkout diff -- server.js public/index.html
npm run test:replicant
go test -race ./internal/replicant ./internal/modelhost ./internal/terminalservice ./internal/terminalbridge
```

Run these adapter tests from Web Desktop, not the upstream directory. They require
no guest, model or credentials. The two new files are untracked in the disposable
upstream tree and therefore need separate inspection alongside `git diff`.
The pinned original README/license and boot API remain available for comparison.
Do not start the original boot API for this read-only experiment.

For a genuine opt-in rehearsal, use the separate four-credential/TLS setup in
[the adapter runbook](../../integrations/hacker-replicant/README.md) and
[M5.12 supervised V7 procedure](../../lab/m512/README.md#model-and-sharing).
Keep all credentials/certificates private; the model token, adapter-read token,
publication token and browser login are distinct. Default-disabled lab guards are
not automatically production installed. The [security packet](../security/M5.13-review.md)
provides exact tests, boundaries and review questions.

## Demonstrated behavior and remaining questions

M5.12 sent a deliberately selected genuine V7 `pwd` excerpt through the modified
application to local Gemma. Expiry, revocation, wrong receipt, source loss and
same-count viewer replacement refused further selected-text access. M5.13 reruns
the isolated route/concurrency regressions and applies the shared model-gateway
quotation qualification. That is not a new independent app security audit.

Receipts bind a question to one publication. Epochs prevent an old publication
prepared before revocation from restoring consent. They do not recall transmitted
text. The epoch starts when the app observes adapter status, not at a browser
click timestamp. Guest OS identity remains operator-attested even when a pidfd,
listener and accepted socket match. An unchanged process/stream can conceal an OS
change. Stop the actual observer/bridge before that change.

A small future interface could retain `status`, explicit `selection` publication/
revocation and receipt-bound readback, with an explicitly absent/refused `keys`
capability. The model gateway could remain independently configured through its
chat-only API. Version negotiation should make missing consent/epoch support fail
closed. Selection expiry and attribution should be visible to users of either app.

Discussion points for Rolf, if invited: a native read-only mode; a pluggable
reference/selection source; cancellation and receipt semantics; capability
negotiation; independent authentication; and whether any of these belong upstream.
Changes to his UI, API or supported deployment require his agreement. Remote
machine control, monitor access and automatic guest identification are not part
of this proposal.
