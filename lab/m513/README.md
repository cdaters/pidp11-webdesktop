# M5.13 reproducible laboratory entry points

Use the Mac developer shell and owned disposable ARM64 Linux. No Pi, SSH, GPIO,
production disk or original launcher is involved. Stop at a failed checkpoint;
inspect actual responses before sending another guest command. Preserve failed
working media and private logs rather than restoring over them.

## Prerequisites and first genuine guest

A new contributor should start with the complete [M5.0 V7 procedure](../../docs/lab/M5.0-runbook.md):
Git, Go 1.25+, Node 22.18+/npm, Python 3, an ARM64 Mac with OrbStack's `orbstack`
Docker context, and Playwright engines (`npm ci`, `npx playwright install`).
`sh lab/build-image.sh` builds pinned original SIMH from public source. The media
helper verifies the separately obtained authorized archive and fresh disk; no
private backup, production image or preconfigured Pi is required.

For the current optional service rather than the older M5.0 single pilot, use
[the M5.9 runbook](../m59/README.md#original-v7-terminal-and-graphics-checks):
prepare a fresh disk with `lab/m50/prepare.py`, build a fresh package with
`GOFLAGS=-buildvcs=false sh packaging/build.sh NEW_DIRECTORY`, set absolute
`PIDP551_WORK` and `PIDP551_PACKAGE`, run `sh lab/m59/run.sh`, wait for readiness,
then start `python3 lab/m551/forward.py` and run `node lab/m59/browser.mjs`.
It explicitly approves the line and tests detached restart, revoked old sessions
and conventional console/serial independence. Use the runbook's `shutdown` action
and stop the exact relay afterward. Do not run multiple scripts against one IPC
channel concurrently.

The M5.13 invocation used `.research/m513/v7` and a newly built package. All twelve
VT100/VT52/VT220/teletype × Chromium/Firefox/WebKit cases passed. BSD reused
`lab/m591/bsd-inventory.py` and `bsd-browser.mjs` with `M592_EXPANDED=1`, a new
`BSD_RUN`, explicit `PIDP_BSD_WORK` and private `BSD_SCREENSHOT`. RSX reused
`lab/m512/guest-inventory.py rsx` and `rsx-browser.mjs`. Read
[the preceding reproduction guide](../m512/README.md) for their separate boot,
configuration, credentials and guest-safe shutdown requirements. Their new
results are in this directory; no full-screen RSX qualification is implied.

## RT-11: exact build and probe

See [the generation/diagnosis report](../../docs/lab/m513/rt11.md). Verify the
recorded immutable base before making a new working copy; make **only the new
copy** writable. Runtime container settings used network-none, read-only root,
dropped capabilities, 128 MiB whole-lab memory, two CPU quota and 64 processes,
with `/lab` read-only and only the designated `/work` writable. The original
`guest-inventory.py rt11` profile and known idle RT-11 console are prerequisites.

`python3 lab/m513/rt11-sysgen.py /absolute/new/rt11-work` sends reviewed choices,
stops on unknown prompts and records actual responses. At RT-11's dot prompt,
inspect generated `M513.CND`, then run these **guest commands**, one completed
command at a time:

```text
@M513.MON
@M513.DEV
COPY RT11FB.SYG M513FB.SYS
COPY DL.SYS M513DL.BAK
COPY/SYSTEM DL.SYG DL.SYS
MACRO/OBJECT:MTTEST M513.CND+MTTEST
LINK MTTEST
```

Do not restart the old default SJ bootstrap expecting it to match the new handler.
The reproduced rescue route stops the actual bridge/simulator at idle KMON,
creates a **second fresh baseline working copy**, attaches that rescue copy as RL0
and the generated working disk as RL1, both RL02. Enable original SIMH DZ with
DLI disabled, eight lines, address `17760100`, vector `300`, raw loopback port
40100. Boot the rescue RL0, then issue `BOOT DL1:M513FB` at **RT-11's dot prompt**.
SIMH's `sim>` prompt is a different command environment. Verify `SHOW CONFIG`.

To install the small original RetroRealm status probe on this disposable guest,
use `COPY TT: MTSTAT.MAC`, type the contents of this directory's `MTSTAT.MAC`, and
finish with control-Z. Then `MACRO MTSTAT`, `LINK MTSTAT`, `RUN MTSTAT`. Expected
LUN-1 words: `007202`, `000003`, `000000`, `010120`. This reads status only; it
neither changes the original monitor nor patches MTTEST.

For the actual browser, provision the separately built service on container
loopback HTTPS 8448 with a private directory, set its sole endpoint to the raw DZ
line, and explicitly approve the verified guest/line using fresh status. Keep
writer/observer credentials in private files. This is the same manual approval
procedure as [optional service setup](../../docs/getting-started/optional-service.md),
but inside the owned lab only. A bounded fixed Docker-exec TLS relay, as in the
V7 lab, exposes that port on Mac loopback; it is not a production network design.

The M5.13 RT scripts use the explicit private root `.research/m513/rt11` and
port 8448. `rt11-browser.mjs` requires original MTTEST already waiting at its
console `.MTIN` prompt. It sends one console line, checks browser echo plus
application retype, and reconnects read-only. `rt11-ast-browser.mjs` waits for the
actual asynchronous test phase, checks lowercase echo, advances the original
console, sends a completed line, and checks newly appended input-status events.
Do not run either at an unknown prompt. `ipc.py` is the bounded local request
helper; `finish` requires the operator to have already established guest-safe
state. It is not a general automatic shutdown policy.

Stop the actual bridge first, verify console `SHOW CONFIG`, then quit original
SIMH at idle KMON. Preserve media/logs and verify immutable-base hashes. Keep
all generated DEC sources, manuals and guest files out of public artifacts.

## Security and model qualification

Run the [review packet's tests](../../docs/security/M5.13-review.md), including
real ARM64 foreign-owner tests, separately from genuine guest assertions. The
Linux observer child/socket suite is `lab/m512/supervisor_test.py`. It does not
need GPIO or a guest. Root-only ownership tests modify only temporary fixtures.

`tutor/questions.json` is a new frozen held-out set, hashed before actual model
calls. Development inputs were the prior M5.12 MOVB/quotation failures and the
new unit tests; no rule/reference changes were made after seeing these final
answers. With the already installed local `gemma4:12b` runner at loopback 11434:

```sh
PIDP11_LOCAL_MODEL_TEST=1 go run ./lab/m513/tutor
```

No model download or automatic alternate provider occurs. Results include raw
model words, qualification/refusal, citation-ID check, narrow claim annotations
and duration. Compare the whole answer with its source passage; matching an ID
or a recognized fragment is not factual certification. The same qualification
function is tested at both desktop HTTP and model-gateway HTTP boundaries.

## Evidence and limitations

Public results are sanitized summaries and bounded nonprivate model questions/
answers. Raw console transcripts, keys, modified disks and screenshots stay in
ignored `.research/m513`. Existing screenshots and milestone tags are preserved.
The whole-container lab limit is separate from the mandatory installed-service
96 MiB/no-swap guard. M5.13 is not a new sustained Pi benchmark or physical
acceptance. Source archive and clean-checkout checks are described in
[the candidate notes](../../docs/releases/M5.13-source-alpha.md).
