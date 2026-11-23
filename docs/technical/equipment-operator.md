# Operating a supervised printer or paper-tape session

This workflow is for a knowledgeable operator in the isolated Linux laboratory.
It makes observation repeatable without giving the browser control of SIMH. The
original console remains the place to run historical utilities and inspect devices.
Neither utility below starts, stops, switches or sends monitor commands to a guest.
Physical deployment is not qualified.

## Prepare once for an independently operated guest

In the **isolated Linux shell**, independently identify the original simulator PID,
its guest, loaded driver and actual device attachment. A surviving PID cannot tell
you which operating system is running. Prepare an unused disposable output spool
through the original console/monitor at an independently verified safe boundary.
The optional observer service must already have the slot and path in its private
configuration; browsers cannot add a path or attachment. Keep readonly tape input
paired with its exact configured hash. Review the [session contract](equipment-sessions.md).

Prepare a new owner-only supervisor configuration (paths below are lab examples):

```sh
/work/runtime/equipment-supervisor -prepare \
  -config /work/operator-new.json -pid "$verified_simulator_pid" \
  -guest rsx-v46-bl87 -simulator original-lab-instance \
  -socket /tmp/m522-control/control.sock -slots lp,punch \
  -guest-and-devices-verified
```

The command records the existing process's start identity and executable checksum;
it refuses an existing configuration file. Review the resulting private JSON and
actual guest/device checks before continuing. It does not approve observation.

Start the **local guided operator** in a terminal that stays open:

```sh
/work/runtime/equipment-supervisor -config /work/operator-new.json -guided
```

It displays the operator-attested guest, simulator and allowed slots. Type `confirm`
only after independently verifying those facts and the fresh empty output spool.
The guide accepts only the narrow commands below, renews owned observations while
it runs, and prints an acknowledgement for each accepted step. A rejected command,
EOF or uncertain response stops renewal. Inspect actual state; do not retry blindly.

## One printer job, from empty spool to verified artifact

1. In the **guided operator**, type `begin lp print-one`. Require an accepted reply.
   In the **browser**, sign in, open Line printer → Observe device, refresh, select
   the named job and explicitly observe it. Confirm zero bytes before starting output.
2. In the **guest console**, execute the verified historical print utility. Continue
   using the conventional console normally; the browser is only an observer.
3. After the utility returns and independent task inspection confirms it ended,
   type `returned lp PIP returned and independent task inspection passed` in the
   guide. This does not prove drain, flush or completion.
4. Independently inspect the original device at a safe paused boundary. Confirm
   ready/no error and record its **decimal** produced length. For a 172-byte example,
   type `drained lp 172 Original ready CSR and decimal POS independently inspected`.
   Use the actual measured value, not this example.
5. Only after independent safe device close/flush, type
   `closed lp Original device safely closed and host length inspected`.
   The observer checks the host file length against the reported device length.
6. Independently hash the complete closed spool. Type `complete lp ACTUAL_SHA256`,
   substituting the 64-digit checksum. Require acceptance. The observer verifies
   full bytes, length and checksum before creating the completed record/export.
7. In the **browser**, Job history → Refresh job history → select print-one → View
   job. Inspect complete state and length; save completed raw bytes or text. Job
   details contain timestamps, source, generation and checksums. The view is retained
   data, never an implicit live connection.

For paper tape, use `begin punch tape-one READER_SHA256`. The reader hash must match
its configured readonly working copy. After independent register inspection, report
`reader punch DECIMAL_POSITION reading` or `reader punch DECIMAL_POSITION eof`.
EOF is separate from punch completion. Use the same returned/drained/closed/complete
steps on the punch slot. The actual guest utility may change leader/trailer bytes;
verify its observed transformation rather than assuming a binary copy.

For the next job, preserve the first artifact before independently preparing a new
empty spool at the configured path. Begin a distinct job name. The observer creates
a fresh generation; stale viewers cannot follow it. Do not truncate an active spool.
`detach lp` ends observation authority only. `quit` ends the guide; its remaining
leases expire within five seconds plus polling. Neither command stops the guest.
Stopping a browser observer cancels that viewer only, not the producer or guide.

## Save history before a service restart

History contains at most **eight terminal jobs**, each with at most **64 KiB** of
retained bytes. Live jobs remain in Observe device. New terminal records evict the
oldest history entry. A completed job larger than the tail limit can have a complete
full-job checksum but only an incomplete retained range available for download.
Old completed-export slots remain separately bounded to their latest publication.

For explicit durable retention, create one empty owner-only directory in the
**Linux shell**, then a private configuration containing only:

```json
{"socket":"/tmp/m522-control/control.sock","archive_directory":"/work/archive"}
```

Directory mode must be 0700; configuration mode 0600 (or the service's supported
private group-readable mode). The directory is operator-provisioned, never chosen
by a browser. Keep it separate from guest media and credentials.

```sh
/work/runtime/equipment-records -config /work/records-config.json -action list
/work/runtime/equipment-records -config /work/records-config.json -action save -id ARTIFACT_ID
```

Copy the exact artifact ID from the list or browser Job details. Save writes a new
checksummed record and independently rereads it. It refuses overwrites and stops
at eight records; it never deletes or rotates archives. Provision another explicit
private directory if more retention is needed. Keep saved artifacts backed up.
A failed write or stale lock requires inspection, not automatic repair or cleanup.

## Recover data after an independently requested service restart

The observer starts detached with empty RAM history. It cannot reconnect a prior
job, and a new supervisor cannot adopt an unowned live generation. Use a fresh
operator decision for any future live observation.

To recover a previously saved artifact, in the **local Linux shell**:

```sh
/work/runtime/equipment-records -config /work/records-config.json \
  -action recover -id ARTIFACT_ID -confirm-retained-data
```

Recovery independently validates the archive's metadata checksum, retained bytes,
size, equipment allowlist and completion-state consistency. It adds **data only**
to Job history. No PID, owner nonce, credentials, renewal or guest-control authority
is restored. An expired/incomplete record stays expired/incomplete. A saved record
is trusted operator evidence, not a signature proving the original guest was safe.
A compromised local archive owner can forge attestations; independent review is pending.

In the browser, explicitly refresh Job history and inspect the recovered record.
The guide/console must separately establish a new safe empty-spool session to resume
observation. Do not treat an old partial file as a new fresh spool or complete it
because the service restarted.

## Troubleshooting without changing the guest

- **No history:** authenticate and refresh explicitly. Active jobs belong in Observe
  device; service restart clears unsaved RAM history. Recover only known saved records.
- **Retired generation:** stop that viewer and inspect the selected job. Refreshing
  does not grant authority over a replacement spool.
- **Stage rejected:** stop and inspect the console, registers and file. A returned
  prompt alone cannot justify drained or closed. Do not repeat uncertain operations.
- **Archive full, corrupt or locked:** retain the files and failure evidence. Inspect
  the previous save process/permissions; do not delete the archive to obtain a pass.
- **Lost supervisor:** the original guest continues independently. Preserve partial
  output and use the original console to establish a safe boundary. A new supervisor
  needs fresh configuration/verification; it cannot finish an old owned job.

The [M5.22 report](../lab/M5.22.md) records the actual tested subset and remaining
limits. This guide is not authorization for physical Pi use or production installation.
