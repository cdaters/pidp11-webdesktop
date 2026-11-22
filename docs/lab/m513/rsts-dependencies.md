# RSTS/E V7.0-07: generation dependency manifest

No browser-terminal acceptance is claimed. M5.13 inspected the retained authorized
archive and booted a fresh copy of its **minimal** system, complementing M5.12's
full-system inventory. No replacement distribution was downloaded. This bounded
investigation found no complete locally available generation kit.

The archive SHA-256 remains
`14bcf83610737c2383ffbfa411ebbd067590705fd1c42caa679d1a5a63f60bd9`.
Its RSTS directory contains `boot.ini`, `rsts_min_rl.dsk`, `rsts_full_rl.dsk`,
`rsts_swap_rl.dsk` and `rsts_readme.txt`. The README mentions a build text file
which is **not present in this archive**. Its description of patched sources on
the swap disk is not evidence that the complete monitor-generation sources remain
there. M5.12's guest directory searches found no MAC sources on that disk.

## Observed configuration

Both minimal and full systems identify V7.0-07. INIT's `SET LIST KB:` shows only
KB0/TT and four pseudo-keyboards. Both supplied `CONFIG.MAC` files specify:

| Conditional | Value | Consequence |
| --- | --- | --- |
| KL11 | 1 including console | No extra generated KL console-like serial line |
| DL11CD, DL11E | 0 | No alternate generated DL line to use instead of DZ |
| DJ11, DH11, DZ11 | 0 | No generated multiplexer terminals |
| MULTTY | 1 | Multi-terminal framework alone does not instantiate a physical line |

Pseudo-keyboards are software jobs used by batch/system utilities, not additional
raw serial login ports. Selecting one in a browser cannot substitute for a missing
guest driver. No existing alternative serial interface was found to enable
without regeneration. Hardware inventory can see SIMH's DZ while this monitor
still has no DZ line.

## Required material and its role

The primary source is DEC's **RSTS/E V7.0 System Generation Manual**, May 1979,
AA-2669E-TC, chapter 4, especially printed 4-1–4-3, 4-7 and 4-22 onward.
[Archived primary manual](https://archive.decromancer.ca/bitsavers.org/pdf/dec/pdp11/rsts_e/V07/v1b_AA-2669E-TC_sygen_May79.pdf).
The retained reviewed PDF digest is
`a9d584448053b3aef48fc0077fccf0344afadac00c9905a08747d4e7e03ac5ff`.
It describes source assembly for system tables and terminal service; most other
monitor modules are distributed preassembled. A directory of general utilities
is therefore not a full monitor build kit.

| Dependency | Available evidence | Required future input / verification |
| --- | --- | --- |
| Matching V7.0-07 generation distribution and patch history | Installed tools dated 1979; supplied images have later local changes | Owner-supplied legitimate kit with provenance, checksums and matching patch level; do not substitute V9 or an unrelated monitor |
| `CREATE.SAV` | Absent from searched minimal/full/swap inventories; only historical `CREATE.LOG` | Original matching bootstrap batch copier; the log is not executable or current media inventory |
| `SYSGEN.SAV`, `SYSBAT.SAV` | Present in full system | Preserve/check exact versions; SYSGEN creates configuration and batch instructions, SYSBAT executes them |
| `CONFIG.MAC`, `COMMON.MAC` | Present; only MAC files found on minimal/full system disks | Configuration is insufficient by itself; retain as baseline, regenerate only on a working copy |
| TBL, TTDINT, TTDVR assembly inputs | Required by manual; absent from MAC inventories | Matching source/include/macro inputs for system table, terminal interrupt and terminal driver modules |
| Remaining preassembled monitor modules / libraries | Complete matching set not established; general `SYSLIB.OLB`/`CSPCOM.OLB` do not prove it | Inventory against the matching distribution and generated `SYSGEN.CTL`; resolve every link input before attempting a build |
| `MACRO`, `CREF`, `LINK` | Installed full-system tools | Matching assembler, cross-reference generator and linker |
| `SILUS`, `HOOK`, `ERR.STB` | SILUS/HOOK installed full-system tools; `ERR.STB` also confirmed in fresh minimal image | Build SIL save-image library, make output bootable, supply monitor/runtime link symbols |
| RT11 run-time system and special LOGIN/LOGOUT/UTILTY, PIP | Manual identifies their generation roles; installed utilities exist | Verify generation-compatible versions; installed BASIC/RSX/RT11 run-time systems are not separate historical guest OS boots |
| Optional BASIC-PLUS generation inputs | Installed BASIC works; complete regeneration set not established | Needed only if rebuilding that run-time system; no claim that installed BASIC supplies source |

The manifest distinguishes confirmed missing filenames from an unverified complete
module set. It does not invent a definitive list of every object in an unavailable
kit. The minimal image's fresh inventory also contains only `CONFIG.MAC` and
`COMMON.MAC`, and `CREATE.LOG` rather than `CREATE.SAV`.

## Exact retained batch dependencies

The minimal image retains `[1,2]SYSGEN.CTL`. It explicitly requests generation
volume **AX-D527G-BC**, logical name `SYSGNG`, followed by patch volume `PATCHG`.
This is stronger evidence than guessing filenames from the general manual.
The batch was read, **not executed**. It refers to:

- Assembly inputs: `COMMON`, `KERNEL`, `CHECK`, `KBDEF`, `TTDVR`, `TTDINT`,
  `TBL`, plus local generated `CONFIG` (MAC sources).
- Monitor link inputs: distribution `RSTS`, `DSK`, `TER`, `EMT`, `FIPLRG`,
  `RSX`, `OVRLRG`; generated `TBL`, `TTDINT`, `TTDVR`; and `ERR.STB`.
  The batch's library/module selections include MORBUF, SYDLRG, BUF, LPDVRX,
  DSKPAT, DKSEEK, DLSEEK, DRSEEK, TERPAT, TTSYST, EMTPAT, LIB, FIPPAT,
  OPL, UUO, SND, LIN, DLN, DIR and RSXPAT.
- Save-image inputs: `ODT`, `DEFALT`, and the newly linked monitor segments.
- Optional BASIC build in this retained configuration: `RTS`, `MA2F`, `XL2F`,
  `XT2F`, `SF`, `IO`, `PU`, `MX`, `SN`, `VE`, with its selected PA overlay.
- Post-link patches: `PATCHG:$MONITR.CMD` and `PATCHG:$BASIC.CMD` through ONLPAT.
- Supporting copies/tools: `SYSLIB.OBJ`, `OVLHD.OBJ`, LIBR, PATCH, PAT and
  MINCOP, in addition to the tools in the table above.

Fresh minimal-image searches find only `OVLHD.OBJ` and `SYSLIB.OBJ` as OBJ files,
plus `ERR.STB`; the needed assembly sources beyond COMMON/CONFIG are absent.
The archive contains neither the requested generation volume nor its patch volume.
Suffixless batch names above are preserved as identifiers rather than guessing
all extension/library conventions without the kit. A future owner-supplied kit
must resolve these exact inputs and its patch provenance before a build starts.

## Future reproduction gate

1. Obtain the owner's legitimate matching kit and preserve it immutable. Record
   its distribution/patch identity, checksums and complete directory inventory.
2. Use fresh independent disks in the original network-none SIMH laboratory.
   Verify original console and guest-safe shutdown first.
3. Reconcile CREATE's inputs and the generated batch/link dependencies with the
   manual before executing SYSBAT. Stop at any missing or mismatched input.
4. Generate one explicitly chosen supported serial interface with documented
   CSR/vector/line count. Keep the previous monitor separately bootable.
5. Boot the generated monitor, verify INIT's actual KB mapping, then establish
   conventional serial login before adding the browser bridge.
6. Qualify browser I/O, explicit ownership, conventional-console independence,
   bridge failure and guest-safe shutdown separately. Preserve source/base hashes.

INIT SET can change the state of a generated device; the manual explicitly says
omitted terminal lines require regeneration. Do not change emulator code to mimic
missing guest support. RSTS/E remains a known historical configuration/materials
blocker, not a browser defect or a promised alpha feature.
