# Reproducing M5.15

This is a Mac/disposable Linux runbook, not a Raspberry Pi procedure. Read the
[report](../../docs/lab/M5.15.md) for exact results, excluded attempts and limits.
No historical disk, private credential, kernel disk or raw console is bundled.
Use fresh ignored work directories and retain failed attempts before changing a
procedure. Never replay an uncertain guest command automatically.

## Source and ordinary checks

The integration review revision is
`c39647975fbf573e14c8bd4a16b8f017df3597b9`; later lab/documentation commits supply
this directory. Node 22.18+, Go 1.25+, Python 3 and the existing Playwright browsers
are required for the relevant development checks. In the Mac shell:

```sh
npm ci
npm run doctor
go vet ./...
go test -race ./...
npm run check
npm test
npm run test:integration
npm run test:selection-contract
npm run test:replicant
node --test lab/m515/instrumentation.test.mjs
PIDP11_CONTRACT_TLS_TEST=1 go test -race ./internal/replicant -v
npm run build
```

The Go TLS test starts its own disposable loopback server and Node child, with a
fresh explicitly trusted test certificate. Fault routes exist only in the test
server. These checks require no real model, guest, upstream app or Pi. The ordinary
browser demo still needs only Node/npm; QEMU is not a product dependency.

Follow the [browser setup](../../docs/technical/development.md) and put results in
a new path using `PIDP11_BROWSER_RESULTS`. The recorded run used
`.research/m515/browser-results.json`. Preserve versioned capture baselines; move
new untracked fixture images into the private run directory after verification.

## Separate ARM64 kernel

The [Dockerfile](Dockerfile) builds diagnostic tools from the pinned Debian base.
Package repositories change; record actual installed versions rather than assuming
a future build has the recorded kernel. M5.15 used QEMU 10.0.13, Linux
6.12.118+deb13-arm64, Python 3.13.5, strace 6.13 and gdb 16.3. QEMU's own guest
kernel must differ from the outer OrbStack kernel. See
[QEMU virt](https://www.qemu.org/docs/master/system/arm/virt.html).

1. Build the diagnostic image from this Dockerfile. Create a uniquely named owned
   container with network none, dropped capabilities, no-new-privileges, a
   1,536 MiB memory/zero-additional-swap bound, two CPUs and 128 PIDs. Mount only
   the fresh private work directory at `/work` and reviewed lab files read-only.
   Package downloads happen during image construction, before the offline test.
2. Place the exact original and current static executables in
   `/work/kernel-input/original` and `current`. Verify their SHA-256 values against
   [startup results](results/arm64-startup.json). The original is the preserved
   M5.13 executable, not a newer source rebuild mislabeled as that binary.
3. Inside the owned container, make a new root staging directory from its
   `/bin`, `/sbin`, `/lib`, `/usr`, `/etc` and `/var`, preserving symlinks. Add empty
   `/dev`, `/proc`, `/sys`, `/run`, `/tmp`, `/root` and `/work`. Create a fresh 2 GiB
   regular image file with `truncate`, then `mkfs.ext4 -d` that staging directory.
   **This image is disposable; never substitute a block device or guest disk.**
4. Install a private executable `/init` into the unmounted image. It mounts proc,
   sysfs, devtmpfs, devpts and cgroup2 as needed, loads `9pnet_virtio`/`9p`, mounts
   the explicitly configured `work` share at `/work`, and invokes the copied
   `kernel-startup.py`. Log its exit status before syncing. Finish by remounting
   root read-only and calling `/bin/busybox poweroff -f` explicitly. Existing
   mounts from the Debian initramfs must be distinguished from failed mounts.
5. Boot QEMU inside this owned container, using its installed kernel/initramfs.
   The following is the recorded invocation shape; replace the image/kernel paths
   only with independently verified files from this disposable setup:

   ```sh
   qemu-system-aarch64 -machine virt -cpu cortex-a72 -accel tcg -smp 2 -m 768 \
     -kernel /boot/vmlinuz-6.12.118+deb13-arm64 \
     -initrd /boot/initrd.img-6.12.118+deb13-arm64 \
     -append 'console=ttyAMA0 root=/dev/vda rw init=/init noresume panic=-1' \
     -drive file=/work/root.ext4,format=raw,if=none,id=root \
     -device virtio-blk-device,drive=root \
     -fsdev local,id=work,path=/work,security_model=none \
     -device virtio-9p-device,fsdev=work,mount_tag=work \
     -nic none -nographic -monitor none -no-reboot
   ```

The startup helper refuses the OrbStack kernel and any network interface other
than loopback. It performs eight immediate copy/executions for each binary on
guest-native ext4 and shared 9p, then traces one original/current provision and
checks execute-permission refusal. Each child enters a 96 MiB/zero-swap cgroup;
only its own core limit changes. Results are persisted after each attempt.
Unexpected returns, signals, timeout or hash mismatch stop the campaign.

Keep the distinction between guest filesystem and backing file: the first
recorded ext4 image was stored on the Mac-backed work mount. It is an ext4 guest
filesystem but still uses that host storage path underneath. The corrected
resource run used a verified ordinary image copy on the outer Linux filesystem.
TCG timings do not qualify native Pi performance.

## Resource test and image-editing checkpoint

The startup phase leaves private native configurations under `/root/m515-native`.
A second boot may invoke `kernel-resource.py` instead. It requires these exact
owned inputs, verifies missing-memory-limit refusal before listening, starts the
service in a 96 MiB/zero-swap group, checks detached status, preserves mappings
and stops the exact child. It neither installs a systemd service nor starts SIMH.

**Do not edit a dirty ext4 image with debugfs and then boot it.** M5.15 observed a
new init script with its old file length after journal recovery; the truncated
shutdown command caused an init-exit kernel panic. Preserve the image first.
For a reviewed recovery on a disposable copy:

1. Confirm QEMU has exited. Make an ordinary copy to native Linux storage using
   explicit buffered reads/writes, sync/close it, and compare both length and
   full SHA-256 before any filesystem operation. The recorded sparse-copy attempt
   on the Mac share failed with `EINVAL`; never continue after such an error.
2. Run the filesystem check on that **copy only**. Treat checker status 0/1 as
   success/corrected; stop for any other result. Retain the checker output.
3. Install the complete init script into the unmounted copy, set executable mode,
   dump it back and compare its bytes with the intended source. Debugfs may print
   a command error without a useful process status, so readback is mandatory.
4. Boot the copy once. Require the resource result, normal service exit, read-only
   root remount and actual QEMU poweroff, not merely a script's success marker.

The initial startup script used force poweroff without the read-only remount;
the safer teardown above was used in the corrected resource run. The report keeps
both failures and the final success separate. Export private traces/configuration
and retain failed images before deleting the exact owned container. Never prune
unrelated containers, caches or volumes.

## Genuine V7 tracing and campaign ownership

Prepare fresh V7 media with `lab/m50/prepare.py` and the accepted public archive.
Use [M5.14 preparation](../m514/README.md) and the unchanged original SIMH image,
network-none lab and reviewed current package. Record source hashes. Keep the
original operator console and traditional serial line independent.

`serial-tap.py` is a lab-only bounded TCP forwarder: 40200 → original DC11 40100,
within the network-none container. It records at most 1 MiB of private bytes and
connection events. Start it before attachment. While the actual bridge is stopped,
change only the private lab endpoint from 40100 to 40200; restart detached and
explicitly approve the inspected guest line. It modifies no simulator source.

Use the exclusive wrapper for cooperating campaigns. In the Mac shell:

```sh
PIDP551_WORK="$PWD/.research/m515/v7" node lab/m515/run-exclusive.mjs lab/m59/browser.mjs
PIDP551_WORK="$PWD/.research/m515/v7" node lab/m515/run-exclusive.mjs lab/m515/plot.mjs
```

Wait for the first command to exit successfully before the next. A live/stale lock
refuses another campaign; inspect the owning process and guest before deliberate
recovery. The wrapper cannot prevent an unrelated terminal/tool from using IPC.
The first recorded overlapping campaign was excluded and retained separately;
accepted results came from a new working disk.

`plot.mjs` creates a unique private attempt directory. It records guest begin/end
markers, a tee copy of the actual pipeline bytes, the tapped serial bytes, browser
frames, parser replay and rendered vectors. It never reissues a failed command.
The controlled negative case is deliberately opt-in:

```sh
PIDP551_WORK="$PWD/.research/m515/v7" M515_PLOT_FAULT=missing-input \
  node lab/m515/run-exclusive.mjs lab/m515/plot.mjs
```

Expect exit 1, zero vectors and no peripheral phase. Inspect its unique result and
console trace; that is an intentional failure, not permission to mark plotting
passed. The classifier names the first unproved boundary and does not infer where
missing evidence went. The test does not reproduce the historical timeout's cause.

For combined equipment, independently start the original diskless
`lab/m592/devices-live.py` producer at phase 0 and the labeled provider fixture.
Use `M592_SCREENSHOT` and the exclusive wrapper around `lab/m592/equipment.mjs`.
Each attempt now preserves a distinct console filename and failure stage. A failed
plot stops before device phase dispatch. Never repeat an uncertain device phase.

## Other guest regressions and cleanup

Use the inherited [guest procedures](../m511/README.md) and
[M5.14 map](../m514/README.md) with fresh private copies/hashes in
[media.json](results/media.json). The actual runs used BSD at 8446, RSX at 8449
and RT-11 at 8448; endpoint numbers do not establish identity. Use
`lab/m512/rsx-browser.mjs` with `PIDP_RSX_SCREENSHOT` to preserve older captures.
The override was added after discovering its older fixed rolling-private path.
BSD uses `BSD_RUN=m515`, `M592_EXPANDED=1`, `PIDP_BSD_WORK` and `BSD_SCREENSHOT`.
RT-11 uses `PIDP_RT_WORK`, `PIDP_RT_SCREENSHOT` and the already generated M513FB
copy; confirm its actual MTTEST/AST prompt before each private console action.

Stop the real bridge before guest shutdown. Require BSD disk-sync/HALT, RSX final
dismount/SHUTUP/HALT, RT-11's idle monitor after application termination, and V7
synchronization before SIMH quit. Finish the original device producer only after
its third verified phase. Remove only exited owned containers and exact owned
relay/preview processes. Retain private working media and traces; no public
result should contain a credential, disk, private address or raw console.
