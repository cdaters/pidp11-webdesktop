# Isolated local modem laboratory

This is a development experiment, not an installation procedure. Read the
[M5.27 report](../../docs/lab/M5.27.md) and
[modem contract](../../docs/technical/local-modem.md). No physical Pi, external
network, guest download or arbitrary destination is involved.

## Reproducing the bounded workflow

The following is a reconstructed operator runbook from the recorded individual
commands. It has not been replayed as one unattended script. Stop at an unexpected
result; inspect the private console rather than replaying uncertain input.

1. **Mac shell:** use `lab/m526/prepare.py` with a new private directory and the
   legitimate V7 base identified in the report. Start `lab/m526/run.sh` with
   `M526_WORK` pointing there. The wrapper retains the historical container name
   `pidp11-m526-v7`; verify it is unused first. It enforces network-none, 96 MiB,
   zero swap, non-root identity, no capabilities and a read-only root. Verify
   fresh `ready.json`, original binary hash, idle single-user prompt and no
   competing DC11 connection. Mount only the disposable `/usr` partition with
   the original guest command `/etc/mount /dev/rp3 /usr` if source inspection or
   rebuilding is needed. Keep original media outside writable mounts.
2. **Mac shell:** build the opt-in executable separately:
   `CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -o <fresh-work>/local-modem ./cmd/local-modem`.
   Create an owner-only `/work/modem` directory and a mode-0600 `config.json`
   containing one `terminalbridge.Config`: ID `v7-modem`, label `V7 local modem`,
   kind `raw-guest-line`, address `127.0.0.1:40103`. Its serial profile must use
   `UNIX V7`, `DC11`, unit 0, line 3, `/dev/tty03`, `ascii7-raw-socket`, an explicit
   16–64-character simulator identity, and accurate application/LOCAL-peer labels.
   There is no user-supplied destination; the modem dials only loopback 40200.
3. **Isolated Linux, via a scoped `docker exec`:** start `/work/local-modem
   -directory /work/modem`, with `PIDP11_ISOLATED_LAB=1`, `GOMEMLIMIT=72MiB` and
   `GOMAXPROCS=2`. Optional `-trace` creates a new private capture, capped at 2 MiB;
   it is off by default. Verify detached status before approval. A stale control
   socket is refused; use a fresh directory after a crash and preserve the old one.
4. **Independent operator:** run `lab/m512/supervisor.py` against the exact
   independently identified SIMH PID, address `127.0.0.1:40103`, modem control
   socket, endpoint `v7-modem`, explicit operator epoch, and
   `--guest-and-line-verified`. It approves and renews a process/socket-bound lease.
   It does not identify a guest from its port. Stop it and the actual modem before
   any guest change. Do not connect a second bridge to this modem-owned line.
5. **Isolated Linux:** run `python3 /lab/m527/local-peer.py` in the same network-none
   namespace with the lab environment flag. It creates a fresh `/work/local-peer`
   directory. It listens independently and knows nothing about SIMH or AT commands.
   If bind fails, preserve that attempt and verify process/socket ownership; never
   kill unrelated processes. The recorded post-crash retry waited for TIME_WAIT.
6. **Guest V7 console:** invoke original
   `cu 0 -l /dev/tty03 -a /dev/null -s 300`. `/dev/null` substitutes for the absent
   calling unit; it does not represent telephone dialing. Wait for `Connected` in
   the full console log. At a fresh cu input line, use this exact escape:

   ```text
   ~!stty 300 raw -echo > /dev/tty03; stty raw -echo
   ```

   Submit the escape with CR. The **output** redirection matters: V7 stty uses
   descriptor 1. The second command configures the independent console. Verify
   raw/no-echo settings using installed stty before sending protocol commands.
   No historical binary is patched. The source and installed cu have broken mode
   ioctls, so do not rely on cu to configure or restore the terminals.
7. **Guest cu:** send `AT` followed by CR; require `OK`. Send `ATE0` + CR, then
   `ATDLOCAL` + CR; require `CONNECT` and independently check the peer connection.
   Generate a short disposable guest text file through cu's `~!` shell escape,
   then send it using `~</tmp/<file>` + CR. Use unique printable ASCII lines under
   256 bytes. Compare actual peer capture with the independent source bytes/hash.
8. **Independent peer:** the private request helper from M5.26 supports `status`,
   `send` with base64, `disconnect` and `finish`. No arbitrary connect address exists.
   To test actual guest file receipt, send cu's receive-diversion framing:
   `~>/tmp/<new-file>\n`, distinctive CRLF-terminated text, then `~>\n`.
   Cu removes CR immediately before LF. Verify the resulting file from the
   stopped disposable disk with `lab/m526/v7files.py`; console display alone
   is insufficient. The public measurements give exact reference payload hashes.
9. **Guest cu:** after at least one second without guest data, send `+++` without
   CR; wait another full second and require `OK`. `ATH` + CR closes the peer and
   returns `OK`. Peer loss instead returns `NO CARRIER`. Test another explicit
   dial and verify distinct data; neither path silently redials. To exit cu, send
   `~.` + CR at a fresh line, then `stty -raw echo -nl` terminated with **LF**.
   Verify the independent shell prompt and a new harmless echo marker.
10. **Independent operator:** stop only the identified modem, supervisor and peer.
    Confirm the guest console remains usable. With the shell idle, use the existing
    `finish` request with `guest_idle_verified:true`: three syncs, independent
    SIMH interrupt, quit, exit 0. Preserve the working disk and all failed captures.
    Compare original hash/size/mode/mtime; remove only the stopped owned container.

## Failure interpretation

A receive diversion interrupted by peer loss can write `NO CARRIER` into the file.
That file is incomplete, even if it contains the expected prefix. There is no
file-transfer acknowledgment, resume protocol or binary transparency. A cu exit
or modem crash need not restore terminal settings; use the explicit console
recovery above. Never retry an uncertain transfer automatically.

`feedback/main.go` is the bounded reproduction of the earlier M5.26 personality,
not the new modem. `ioctl-probe.c` is a clearly identified disposable diagnostic,
compiled by the guest compiler; it is not a historical distribution utility.
Changing V7's erase character from `#` to `^` was necessary before uploading its
`#include` lines through the canonical console. Preserve that failed first attempt.

## Portable verification

Run `go vet ./...`, `go test -race -count=1 ./...`, `npm run check`, `npm test`,
`npm run build:server`. With one local Vite preview, run the modem, communications
and guest browser suites in Chromium, Firefox and WebKit. Use one Playwright
invocation or separate output directories: concurrent runs sharing an output
folder can remove each other's trace files. Those browser tests use fixtures,
not a historical guest. Genuine results are separately documented in the report.
