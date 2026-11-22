# Diagnosing an alpha setup

The basic demonstration runs on your development computer. It does not need a
Pi, Go, Docker, guest disk or model. Start with the [released-source quick start](source-alpha.md).
The [Alpha 2 candidate](source-alpha-2.md) includes the M5.14 changes below.
These are development commits after the immutable M5.13 archive;
they do not silently update that download.

## Browser demonstration on the Mac

1. In the directory containing `package.json`, run `node --version` and
   `npm --version`. Node must be 22.18 or newer. A shell saying either command
   is missing means the tool is unavailable on its current PATH; fix that before
   trying to start the desktop.
2. On M5.14 development source, run `npm run doctor`. Unsupported Node or missing
   packages produce specific messages. Run `npm ci` to install the locked packages,
   then repeat the check. It performs no installation or network request itself.
   The published M5.13 archive has no `doctor` command; follow its existing steps.
3. Run `npm run dev` and use the actual loopback URL it prints. A busy port can
   cause Vite to choose another. Do not stop an unrelated process to reclaim it.
   Stop your preview with Ctrl-C, then verify that its URL no longer loads.

The mock Terminal accepts `HELP`. A Guest terminal requires a separately approved
real guest. Choosing a guest name or connecting to a TCP listener does not create
a login service or establish which operating system is running.

## Optional service: configuration before startup

The following concerns the separately authorized disposable Linux lab, not a Pi
installation procedure. Run `webdesktop-service check -config /absolute/config.json`
under the intended service account before opening listeners. It validates private
files and configuration without connecting to a guest. It cannot guarantee that
a port is free or that a later filesystem operation will succeed.

Malformed JSON errors on M5.14 identify field names/types/syntax as the things to
check without echoing arbitrary private input. Compare the documented configuration
shape; do not paste tokens, private keys or guest text into an issue. Missing or
unreadable private files, invalid certificates and mismatched listen/origin ports
must be corrected before startup. Do not make secrets world-readable to pass a check.

Provisioning always requires a new absolute directory. M5.14 writes and syncs its
private files before writing `config.json` last. A handled write failure removes
only files created by that invocation and removes the directory only if it is
empty and still the same directory. Unknown files are retained and reported.
Existing configurations are never overwritten. Test coverage includes real Linux
file-size refusal and injected disk-full writes.

A killed process, host crash or cleanup failure can still leave an incomplete
private directory. Stop and inspect it before retrying. Preserve evidence outside
public artifacts; select a new empty destination or deliberately remove only the
reviewed failed attempt. Do not use recursive deletion or overwrite a previously
working configuration. This is handled-error cleanup, not a power-loss transaction
or an explanation of the two earlier ARM64 exits.

## Private socket and stopped recovery

The control directory must be owned by the effective service account and private
(normally 0700). Root being able to write another account's directory does not
make it safe. A missing directory or occupied socket produces contextual guidance.
The application never automatically unlinks an existing socket.

For a separately authorized Linux laboratory recovery:

1. Verify the actual companion has stopped, including its service manager and
   exact process. A closed browser or failed health request is insufficient.
2. Inspect the configured control path and its parent. Confirm it is the expected
   service-owned private directory and the entry is the old Unix socket, not a
   symlink, regular file or another live service. If identity is uncertain, stop.
3. Remove only that verified stale socket. Do not remove its directory contents,
   credentials, guest media or another process's socket. Systemd may already have
   removed its own RuntimeDirectory after the service stopped; inspect first.
4. Start only the companion. Require a fresh instance, detached lines and explicit
   new guest-line approval. Old sessions, approvals and keyboard leases must fail.
   Verify the original console remains independently usable.

M5.14 exercised this path after SIGKILL against a disposable V7 companion. It did
not start, signal or restart the emulator during recovery.

## Connection and memory refusals

An unavailable approved guest line consumes that approval and is not retried.
Verify the intended guest, its real terminal driver/login or application, the
reserved line and current service generation before approving again. An observer
stall or identity loss must retire authority. Restarting the browser or observer
must not silently restore it. Stop the actual bridge before intentional OS changes;
the same process and socket may conceal a different guest.

The installed candidate requires effective `MemoryMax=96M` and
`MemorySwapMax=0` before listeners open. `GOMEMLIMIT=72MiB` is only a soft runtime
target. If the kernel controller is unavailable, leave the service stopped.
Do not remove the guard, weaken the unit or change the physical Pi's boot settings
as a troubleshooting shortcut. See [M5.14 evidence](../lab/M5.14.md).

Rollback is a stopped-service operation. Use the retained reviewed version and a
compatible private configuration. Newer keys can be rejected by older binaries;
restore the prior configuration deliberately while stopped rather than silently
dropping required protections. After rollback, require detached startup and fresh
approval. The no-Pi browser demonstration remains independent of this service path.

## Reporting an intermittent startup or graphics fault

State the exact source revision and whether you used the published M5.13 archive
or current development. Include your OS/browser, the failed step, expected result
and actual error. A shell status of 139 alone does not prove a signal termination.
Preserve the failed private directory and original output before deliberately
starting a separate attempt; do not automatically retry a guest command.

The [M5.16 runbook](../../lab/m516/README.md) provides bounded native-status and
plotting diagnostics for disposable Linux. These are optional development tools,
not required for the browser demonstration or instructions to test a physical Pi.
Report a sanitized summary through the [contribution guidance](../../CONTRIBUTING.md);
keep tokens, private configuration, terminal content, disks and process mappings
out of public issues. Use [private security reporting](../../SECURITY.md) when relevant.
