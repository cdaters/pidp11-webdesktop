# RT-11 magnetic tape: the qualified guest workflow

M5.24 successfully used the retained **RT-11SJ (S) V05.03** distribution's MT handler
and PIP utility to read two files from an emulated TM11/TU10 tape. This advances
beyond M5.23's separate CPU/DMA test. It does not qualify tape writing, backup/restore,
other handlers, physical tape or browser-controlled positioning.

## Handler inventory and selection

The original console reported the following configuration. Addresses and vectors
are octal, in the guest's 16-bit I/O-page notation; the SIMH TM display shows the
corresponding 22-bit address `17772520–17772533`, vector `224`, BR5.

| Distribution file | Documented controller | Guest CSR / vectors | Available SIMH family | M5.24 result |
|---|---|---|---|---|
| MT.SYS, 9 blocks | TM11 file-structured handler, unmapped monitor | 172520 / 224 | TM / TU10 | Installed and used successfully |
| MS.SYS, 10 blocks | TS11 file-structured handler, unmapped monitor | 172522 / 224, 300 reported | TS | Present, not installed or tested |
| MM.SYS, 9 blocks | TJU16 file-structured handler, unmapped monitor | 172440 / 224 | TU / TM02–TM03 family | Present, not installed or tested |

The mapping comes from DEC's [RT-11 Installation Guide, §2.6.10 and file inventory](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-H376F-TC_RT-11_Installation_Guide_Aug91.pdf),
not similar names. That later manual distinguishes unmapped `.SYS` and mapped `X.SYS`
variants. The actual test used the installed unmapped SJ monitor, booted from
DL0:RT11SJ on an 11/70 configured with 4 MiB; SHOW CONFIG reported 4,088 KB and no
SYSGEN options. No monitor rebuilding or memory change was required. Shared default
vectors do not establish that all three controllers can be enabled together.

[Device Handlers Manual §2.8](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-PE7VA-TC_RT-11_Device_Handlers_Manual_Aug91.pdf)
describes the supplied file-structured module and distinguishes it from hardware-only
handlers. Standard utilities need the former. Its documented DOS-tape restriction
means an arbitrary raw or DOS tape would not be an equivalent test.

MT initially could not install: KMON reported “No room.” Installed HELP explained
INSTALL/REMOVE. Removing the unused CT cassette handler freed a slot; INSTALL MT
then succeeded and SHOW DEVICES confirmed it. No handler source was changed.
`SHOW MT` was an invalid monitor option; the corrected command was SHOW DEVICES.
Both failures remain in the private transcript; no uncertain operation was retried.

## Authored input and actual utilities

The tape contains two deliberately authored files, not historical distribution
content. DEC's [Volume and File Formats Manual §1.2.1, Table 1–6](https://www.bitsavers.org/pdf/dec/pdp11/rt11/v5.6_Aug91/AA-PD6PA-TC_RT-11_Volume_and_File_Formats_Manual_Aug91.pdf)
explicitly describes the earlier format: pre-V5.5 labels occupy 512 bytes, with the
label fields in the first 80. Data records are also 512 bytes. The independently
written [media generator](../../lab/m524/media.py) uses VOL1, HDR1 and EOF1 labels,
file-section/sequence/count fields and the documented filemarks. The image is SIMH
length-framed TAP, 4,192 bytes, attached read-only and locked before boot.

This label convention is not inferred from a newer release's default. It passed
with the actual V05.03 handler. No guest INIT, tape write, custom driver or host-file
substitute for guest I/O was used. SIMH's logical image position and the guest's
filesystem search are separate from physical tape length.

Commands **actually executed at the independent RT-11 console**, after verifying
the idle prompt and installing MT:

```text
DIR MT0:
COPY/IMAGE MT0:RECA.TXT SY:READA.TXT
COPY/IMAGE MT0:RECB.TXT SY:READB.TXT
COPY/IMAGE MT0:ABSENT.TXT SY:ABSENT.TXT
TYPE READA.TXT
```

DIR listed two files, one and two blocks. COPY dispatched the installed PIP.SAV;
its `/IMAGE` semantics were checked against retained guest HELP. PIP copied both
files successfully, and TYPE displayed the authored text. The deliberate ABSENT
search returned `?PIP-F-File not found MT0:ABSENT.TXT`, an expected negative result.
No separate PIP version banner was obtained: the exact distribution file is identified
by its [size/hash](../../lab/m524/results/guest-tools.json), alongside DIR.SAV and
all three handlers. These identifiers avoid inventing a utility version.

## Independent byte and filemark verification

At a verified idle prompt, the independent operator paused the simulator. A read-only
RT-11 directory decoder extracted the two output files from the quiescent working
RL02 and compared all bytes, including NUL padding, with the authored input. It
follows the documented standard directory-segment layout and refuses unsupported
prefix blocks. This check never creates guest output. Both comparisons passed:

| Tape file → guest disk file | Length | Recovered SHA-256 |
|---|---:|---|
| RECA.TXT → READA.TXT | 512 | `aebba95d881ce65dbe403a39faa3a1ad53a7326d71ae53bf08eedeadbaeef160` |
| RECB.TXT → READB.TXT | 1,024 | `7190fb13f6e934d33f6c8c7116f4de82cd1037c06ef3733d609db15bbb633782` |

After both copies, the tape image offset was **3,660**, immediately following the
second data filemark. After the absent-file search it was **4,188**, following the
first extra logical-end mark, with one additional mark still in the image. Captured
MTS=`040105`, MTC=`160200`, UST[0]=`040104` preserve EOF and the expected error summary.
This is ordinary file-structured termination, not a demonstrated physical EOT or
read beyond end-of-image. The earlier M5.23 CPU test independently covers the latter.

The [verification record](../../lab/m524/results/byte-verification-final.json)
contains all record boundaries, lengths and both matches. Input tape SHA-256 stayed
`8841da1560ce50d73165b659fb437c5de7d61fcd484993be2247ff05ffde09bb`.
The final verification after guest shutdown passed again. See the
[experiment report](../lab/M5.24.md) for browser results, resources and preservation.
