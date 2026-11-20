# M5.7.1 memory-containment laboratory

Mac and disposable ARM64 Linux only. These scripts do not SSH to a Pi, use GPIO or start a guest. Physical captures in the [report](../../docs/lab/M5.7.1.md) came from a separate owner-supervised procedure; do not treat these commands as physical authorization.

## Build on the Mac

Run ordinary Go vet/race, TypeScript/unit/integration and asset checks. Build a fresh package through `packaging/build.sh`. Cross-build the bounded allocation probe:

```sh
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath \
  -o .research/m571/memoryprobe ./lab/m571/memoryprobe
```

The probe accepts only 1–128 MiB, Linux ARM64 and `PIDP11_ISOLATED_LAB=1`. It touches allocated pages and reports live heap/runtime bytes. It has no guest/device/network interface.

## Prepare disposable Linux

Use the [existing isolated systemd setup](../m551/README.md#real-systemdpackage-lifecycle) with a fresh `pidp11-m571` Debian Trixie machine, 1 GiB outer limit and no host-home/SSH-agent integration. Install Python3/OpenSSL/curl prerequisites, then bring external `eth0` down. Do not alter host or Pi networking. Transfer only the reviewed package, probe and scripts through `orbctl run` input streams.

As the disposable Linux administrator:

1. Place the verified package at `/tmp/package-m571`; verify `PACKAGE_SHA256SUMS`.
2. Install through `install.sh /tmp/package-m571 m571`; configure loopback `127.0.0.1:8445`, origin `https://127.0.0.1:8445`, reserved synthetic endpoint `127.0.0.1:40100`. Leave autostart disabled.
3. Place the probe at `/tmp/memoryprobe` and this directory's `memory-lab.py` at `/tmp/memory-lab.py`.
4. Run `PIDP11_ISOLATED_LAB=1 python3 /tmp/memory-lab.py`, capturing JSON outside the VM. It reasserts the package hardening directives against OrbStack's type-wide override, tests actual startup/refusal, and uses bounded transient allocation units. The companion is stopped on exit, including assertion failures.

The harness creates only its named lab drop-ins/slice/transient units. `DisableControllers=memory` in the test parent slice removes local enforcement while the outer VM cap remains. This is not a disabled-kernel-controller boot experiment. Review failed evidence rather than calling it a pass.

## Existing lifecycle and actual browsers

Start the protected service manually and run unchanged `lab/m551/systemd-lifecycle.py` inside this VM with `PIDP11_ISOLATED_LAB=1`. It tests a synthetic loopback peer, not a guest. Record this distinction if publishing its results; its historical final field refers to a separate genuine-guest rehearsal that M5.7.1 did not rerun.

For `detached-browser.mjs`, stop this lab service, change only the lab configuration's listen/origin to loopback port18445, then start it detached. Use a loopback-only forwarding helper derived from `lab/m551/forward.py`: replace its fixed Docker command with `orbctl run -m pidp11-m571 -u root python3 -u -c CODE`, and replace both port8445 occurrences with18445. Keep the same bounded forwarding lifecycle. Inspect port ownership before binding; do not terminate unrelated listeners. On the Mac:

```sh
node lab/m571/detached-browser.mjs
```

This authenticates against the real installed application in Chromium, Firefox and WebKit, opens Guest terminal and checks that Connect stays disabled while detached. Tokens are read into memory and not printed. Certificate bypass is limited to disposable browser contexts; `memory-lab.py` separately verifies HTTPS using the actual certificate. The private `.research/m571/` evidence directory must already exist.

## Cleanup

Stop the exact lab forwarding process and companion. Disable the companion, then use the package's explicit `--purge-private-config-and-account` uninstall while its managed marker still exists. Verify its paths/account/group/listeners are absent. Remove only the named `zzzz-m571-hardening.conf` and test slice, reload lab systemd, and preserve results before deleting this exact disposable machine. Never apply this lab cleanup to the physical Pi.

An OOM result belongs to the bounded allocation fixture, not the desktop. Its independent sentinel check demonstrates laboratory isolation; it does not prove a real PDP-11 guest survives every host-wide memory failure. Mac-hosted measurements do not satisfy Pi performance acceptance.
