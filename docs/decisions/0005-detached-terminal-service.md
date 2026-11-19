# ADR 0005: detached service and generation-bound guest attachments

Status: implemented for Mac-side and disposable Linux testing, November 19, 2026. Physical deployment remains unapproved.

The original `terminal-pilot` intentionally makes one connection during supervised startup. Turning it into a permanent service would make startup an implicit guest action. A reused TCP port cannot identify a guest, and an old browser choice must not silently follow a replacement listener.

Add a separate `webdesktop-service` command. It embeds the desktop, validates private configuration/TLS, and starts with all endpoints detached. A root/service-local Unix socket accepts status, detach and explicit attachment approvals. Browser APIs expose observation and keyboard operations only. No browser route can approve, dial an address, select an OS, start an emulator or read GPIO.

An approval includes a random service-instance ID, configured endpoint ID, current revision and the operator's confirmation that the guest and reserved line were independently verified. Every attempt consumes a revision. A dial happens outside the manager lock with a deadline; publication rechecks the revision, so detach/close during dialing retires the result. Each successful attempt creates a new, one-shot `terminalbridge.Endpoint`.

Browser listings include the attachment generation. New service WebSockets require that exact generation in their route; requests using a stale generation or the legacy generation-free route are rejected. Existing sockets retain the old endpoint object. Detach closes its viewers; EOF marks it unavailable; neither event transfers input ownership to a new attachment. Refreshing the line list is explicit and never connects. The original immutable pilot Bridge keeps its existing route and one-shot behavior.

The service starts with a new access gate, so cookies and pending approvals from an earlier process cannot be restored. Keyboard leases remain separate from guest attachment approvals. Closing a viewer releases its keyboard; stopping the service closes its terminal connections, not the guest CPU. Installed files/account/systemd supervision belong only to the companion.

The manager is not an authoritative guest watcher. A same-process guest replacement that preserves an open serial stream may be invisible. Before intentional guest changes, stop the actual service or explicitly detach every affected line, verify the new guest independently, and approve a fresh generation. If identity becomes uncertain, detach; do not infer safety from a banner, label, PID or reused port. Committed input cannot be recalled.

Keep the existing resource budgets. Bound public sockets at 64, local control sockets at eight, endpoints at four and viewers at eight per endpoint. Preserve the 64 KiB renderer credit, 64-frame queue, 256-byte input limit, ten-second lease and bounded write deadlines. An output frame's byte slice is immutable and shared across viewers after a single copy; accounting remains per viewer.

Consequences: a small installed service is possible without emulator lifecycle coupling, but manual attachment is an intentional operational step. Token rotation currently requires private-file replacement and a service restart; per-user/per-line credential administration and authoritative guest-change detection remain future work. The optional copilot proposal adds no implementation or new authority.

Evidence and owner procedure: [M5.5.1](../lab/M5.5.1.md), [deployment implementation](../lab/M5.6-implementation.md), [community comparison](../lab/M5.5.1-community.md).
