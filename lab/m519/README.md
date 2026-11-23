# M5.19 genuine workstation laboratory

Use the established [M5.16 guest setup](../m516/README.md#genuine-guest-and-plotting-comparison)
with the current private runtime and **new** verified media copies under
`.research/m519/`. Preserve original media hashes and metadata. The four owned
containers are `pidp11-m519-v7`, `-bsd`, `-rsx`, `-rt11`: network-none, read-only
root, dropped capabilities, no-new-privileges, bounded memory/CPU/PIDs, no GPIO.
These are development tools, not a new production deployment architecture.

Run one campaign per guest line at a time. V7 uses `run-exclusive.mjs` around the
existing `lab/m59/browser.mjs`, with absolute `PIDP551_WORK`. BSD retains the
nine-case `lab/m591/bsd-browser.mjs` run (`M592_EXPANDED=1`, unique `BSD_RUN`,
private `BSD_SCREENSHOT`, absolute `PIDP_BSD_WORK`). RSX first completes the existing
`lab/m512/rsx-browser.mjs` login/HELP/PIP check. RT-11 retains the generated
`M513FB` monitor, original MTTEST and `lab/m513/rt11-ast-browser.mjs` scope.

## Additional genuine applications

Only after the preceding campaign exits and the line is independently verified:

```sh
# Mac shell; root must be the fresh M5.19 directory, not an old accepted run.
PIDP_BSD_WORK="$PWD/.research/m519/bsd" node lab/m519/bsd-robots.mjs
PIDP_RSX_WORK="$PWD/.research/m519/rsx" node lab/m519/rsx-edt.mjs
```

The BSD script uses installed `/usr/games/robots` and VT100. The supplied image's
`/usr/man/cat6/robots.0` documents its keys. The initial screen can omit its board
and legend tail; the test records `initialRedrawRequired` and uses one documented
Ctrl-L redraw after confirming the game is actually running. It does not replay
launch or game input. A normal step or blocked-step response, redraw, `q`/confirmed
quit, explicit-exit `awk` BEL and read-only reconnect follow. This is qualification
**with a required workaround**, not a clean initial-display pass or a diagnosed fix.

RSX has `LB:[3,54]EDT.TSK`. The script requires an already logged-in, idle browser
line. It sets that disposable line's VT100 characteristics, refuses preexisting
`M519F0.TXT`–`M519F2.TXT`, enters CHANGE mode, inserts text, edits with an arrow,
uses Gold/PF1 plus keypad 7 for a command, and keypad Enter to submit it. EDT's
**Press return to continue** is a real checkpoint before Ctrl-Z returns to line
mode. TYPE WHOLE, EXIT, PIP readback and observer reconnect complete each engine.
The [DEC EDT manual](https://bitsavers.trailing-edge.com/pdf/dec/pdp11/rsx11m_s/RSX11M_V4.1_Apr83/3_Utilities/AA-M476A-TK_edt_198309.pdf),
§3.19, describes these keypad/line transitions. Failed assertions stop the script
and preserve raw frames/final text; inspect the original console and actual guest
state before any recovery. Never rerun a campaign against those same filenames.

Both extra scripts use an exclusive campaign file and retain bounded private
frames and screenshots. The guest and independent console outlive browser failure.
A closed browser context does not necessarily revoke its authenticated server
session. The M5.19 exploratory campaign reached the existing 16-session cap;
a known-idle guest and exact bridge-only restart were verified before continuing.
Do not weaken limits or retry failed logins blindly. Future repeated runs should
sign out completed views or use a fresh independently approved lab instance.

## Fixtures, resources and cleanup

`npm test` and the Playwright `workstation.spec.ts` / `terminal-profiles.spec.ts`
checks are intercepted fixtures, not guest evidence. Audio-node fixtures exercise
mute/focus/autoplay logic; separate tests use the real browser AudioContext API.
Neither establishes acoustic fidelity or speaker audibility.

With the ordinary local preview on 5173:

```sh
node lab/m519/browser-performance.mjs /absolute/private/rendering-result.json
```

That Chromium-only fixture measures output-to-consumption acknowledgement, retained
heap after garbage collection and task CPU, not paint latency, guest latency or Pi
performance. It sends 1,920 lines in 80 bounded chunks, awaiting credit each time.
Keep process-resource observations separate from combined emulator/container use.
The campaign containers have 128 MiB/zero-swap bounds; M5.19 does not repeat the
separate 96 MiB production-guard rehearsal or authorize changing the physical Pi.

Stop each actual bridge first. Verify V7 operator/conventional serial consoles,
BSD console, RSX console and RT-11 console still answer. Then V7 syncs before
SIMH quit; BSD sync/halt must reach disk-sync completion and HALT; RSX SHUTUP must
complete dismount and HALT; RT-11 returns to its idle monitor before quitting.
Remove only the stopped owned containers, stop exact relay/preview processes,
verify listener closure and rehash original sources. Preserve working media and
private evidence. Public `results/` contains only curated aggregates; never copy
raw guest transcripts, credential files or runtime/guest binaries into it.
