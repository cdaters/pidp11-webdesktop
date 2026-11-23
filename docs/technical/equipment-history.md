# Bounded equipment history and explicit data recovery

M5.22 separates three lifetimes: a currently approved observation, a retained job
record, and an explicitly saved record file. Recovering the latter never restores
the first. See the [operator procedure](equipment-operator.md) and
[genuine tests](../lab/M5.22.md).

```mermaid
flowchart LR
  Console[Independent guest console] --> SIMH[Original SIMH devices]
  SIMH --> Spool[Operator-owned disposable spool]
  Guide[Local guided supervisor] -->|Scoped approvals| Observer[Read-only follower]
  Spool --> Observer
  Observer -->|Terminal generation snapshot| History[Eight immutable records]
  History -->|Authenticated explicit view| Browser[Job history]
  History -->|Local explicit save| Archive[Eight private checksummed files]
  Archive -->|Local explicit recovery: data only| History
```

## Record and retention contracts

`Followers.mu` protects its live slots and history. A terminal supervised generation
is copied once into a record: completed, expired, interrupted or incomplete. Legacy
followers without `session` metadata do not manufacture new job attestations.
A record stores equipment kind/device, job/slot/session, operator-attested guest and
simulator, host start/end/completion times, observed/completed lengths, retained range,
provenance and checksums. Its ID is SHA-256 of the original observation generation.
No owner nonce, credential or renewal authority is stored in the record.

`SHA256` covers exactly the retained range. A completed record also contains the
independently verified full-job hash. For jobs beyond 64 KiB, the retained tail is
not a complete downloadable artifact even if the full job was verified. UI labels
and byte-range filenames preserve that distinction. Partial states cannot carry
completed length/timestamp/full hash. All returned byte slices are copies.

At most eight terminal records, each at most 64 KiB, are retained in memory. Insertion
evicts the oldest **retained entry in insertion order**, not the record with the
oldest guest date. Display sorts by host end time. Four live slots and the original
four completed-export slots keep their separate existing bounds. Retiring/reusing
a live generation does not change an earlier record. A failed replacement preserves
prior evidence. Shutdown does not relabel completed records as expired.

The service starts with empty RAM history and detached devices. It performs no
archive scan, auto-import, guest reconnect or authority adoption. Unsaved records
and active tails can be lost on observer exit; original spool files remain owned
by the independent operator. A raw partial file is not a completion certificate.

## Narrow local interfaces

`equipment-supervisor -prepare` creates a new private config for an independently
verified existing process; `-guided` requires explicit confirmation and translates
a bounded local command vocabulary into the existing strict JSON sequence. Original
process checks, one-second renewals, five-second consumer expiry and two-second
local HTTP timeout remain. It never sends monitor text or changes media. Unknown
commands/uncertain replies stop renewal instead of retrying. Independent guest,
ready-register and safe-close checks remain operator obligations.

The browser gets authenticated read-only `/api/v1/equipment-history` metadata and
`/api/v1/equipment-history/{id}` bytes. It never chooses a filesystem path, publishes,
saves on the host, recovers authority or runs privileged operations. A new view
requires explicit refresh/selection. Changed identities/checksums, delayed results
and evicted records cannot take over a replacement view.

Private Unix control adds `/streams/history`, `/streams/history/{id}` and
`POST /streams/recover`. Recovery accepts at most 100,000 encoded bytes, validates
all fields, ranges and checksums, and requires a matching configured equipment
slot/kind/device. Duplicate identities are refused; no old record is overwritten.
The import adds data only, even if the old job says completed. It cannot create
or mutate live approvals or the original completed-export slots.

## Explicit private archive

`equipment-records` reads a private config containing a Unix socket and one absolute
archive directory. That preprovisioned directory must be owned by the running user,
mode 0700. `os.Root` confines later file operations. An exclusive lock directory
serializes operations; stale locks require inspection rather than automatic removal.
Only eight fixed-format artifact-ID filenames are accepted. Symlinks, unexpected
entries, oversized files, traversal and wrong permissions are rejected.

Save validates the record, writes an exclusive mode-0600 checksummed JSON envelope,
syncs/closes it, then independently loads it. It never overwrites, evicts or silently
repairs disk records. Failed/partial writes remain visible and unqualified. Load
strictly decodes the envelope, checks its metadata digest, data digest, ranges and
state. Explicit recover then sends only that retained record to local control.
The archive is a small data format, not a database or automatic spool watcher.

The trusted local operator can forge metadata and matching hashes. Checksums detect
corruption and accidental mismatch; they do not authenticate historical truth or
prove safe close. Guest identity remains an attestation. Same-user host compromise,
malicious directory management, filesystem/power-failure durability and archive
backup/rotation need separate consideration. The controlled restart test is not a
power-loss test. Browser users cannot reach these private local operations.

## Source ownership and validation

- `internal/peripheral/history.go`: bounded immutable records and data-only import.
- `internal/peripheral/archive.go`: explicit private save/load and independent checks.
- `internal/equipmentsession/guided.go`: input translation/cancellation; no simulator API.
- `cmd/equipment-records`: standalone local list/save/recover utility, no background service.
- `src/equipment-history.ts`: explicit selection, validation, paper rendering and downloads.
- Go fixtures cover retention/recovery/bounds and existing authority protections;
  browser fixtures cover identity, cancellation, incomplete labels and responsive controls.
  The M5.22 report separately records genuine reused slots, supervisor/observer restart,
  saved partial recovery and three-engine exact downloads.

The byte-copy budget increases by at most 512 KiB, with metadata and temporary
encoding overhead measured separately in the lab. No existing per-job, tail,
response, producer-lease or future physical memory/swap bound was weakened.
