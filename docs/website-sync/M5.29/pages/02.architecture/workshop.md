---
title: 'A computer room, with its own off switch'
kicker: 'PiDP-11 · architecture'
summary: 'A browser computer room around independently operated SIMH, with or without a physical PiDP-11 panel. The original access paths stay open.'
status: 'Physical and independent operation first'
updated: '2026-11-22'
visible: false
hero:
    display: false
metadata:
    description: 'How the PiDP-11 Web Desktop separates browser presentation, a Go terminal bridge, genuine guest access, simulated peripherals and independent physical operation.'
---

<nav aria-label="On this page" style="margin:1rem 0; line-height:2"><strong>On this page:</strong> <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#guest-access">Guest access</a> · <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#window-modes">Three kinds of connection</a> · <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#equipment-interfaces">Equipment interfaces</a> · <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#historical-companion">Facts and explanations</a> · <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#independent-companion">Hacker Replicant</a> · <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#installation-status">Installation status</a></nav>

<h2 id="guest-access" style="scroll-margin-top:6rem">Two routes to the same machine</h2>

My physical PiDP-11 is the starting point, even while it is back on the workbench for repairs. The larger goal is an optional virtual PDP-11 computer room: terminals and usable peripheral interfaces around an independently operated SIMH environment, with documentation and optional assistance beside them. The Web Desktop must never become a replacement for the original software or operator console.

There are two intended arrangements. A physical PiDP-11/70 owner keeps Oscar’s original SIMH/REALCONS software, switches, lamps and independent access. An ordinary SIMH user should eventually have the same browser equipment room without needing a physical panel, REALCONS or GPIO. Linux, macOS, Raspberry Pi and other suitable environments are architectural targets, not a list of approved installations. Source Alpha 2 is still restricted to local demonstrations and controlled laboratories.

The existing conceptual diagram starts with the physical-owner arrangement and shows its independent and optional paths. Without a replica, the physical panel and REALCONS parts are absent; SIMH and its conventional console remain. It does not claim that every guest has every serial or network facility configured, or that all the equipment-room interfaces are implemented.

<div class="rr-architecture" role="group" aria-label="PiDP-11 conceptual architecture, with independent and optional access paths">
  <section class="rr-architecture-lane">
    <h3>Independent operation</h3>
    <p><strong>Physical switches and lamps</strong></p>
    <p aria-hidden="true">↕</p>
    <p><strong>Original PiDP-11 software · SIMH / REALCONS</strong><br>Historical guest operating system</p>
    <p aria-hidden="true">↕</p>
    <p><strong>Original console · SSH · GNU Screen</strong><br>Supported serial and guest network access</p>
  </section>
  <section class="rr-architecture-lane">
    <h3>Optional browser terminal</h3>
    <p><strong>Browser on a modern computer or tablet</strong><br>Terminal rendering and keyboard interface</p>
    <p aria-hidden="true">↕</p>
    <p><strong>Authenticated Go terminal bridge</strong><br>Explicit attachment and keyboard ownership</p>
    <p aria-hidden="true">↕</p>
    <p><strong>Approved guest serial line</strong><br>Connected to the historical guest under SIMH</p>
  </section>
  <section class="rr-architecture-lane">
    <h3>Simulated desktop devices</h3>
    <p><strong>SVG panel · disks · tape · paper tape · printer</strong></p>
    <p>Browser demonstrations, separately labeled. These windows do not establish a connection to physical GPIO or real guest media.</p>
  </section>
  <section class="rr-architecture-lane">
    <h3>Observed guest devices</h3>
    <p><strong>Emulated LP11 / PC11 → approved local output → browser</strong></p>
    <p>Read-only supervised output and retained records. CPU tests and qualified guest utilities supply real bytes; the browser does not attach media or operate the simulator.</p>
  </section>
  <section class="rr-architecture-lane">
    <h3>Optional historical companion</h3>
    <p><strong>Offline references · source facts · exact calculations</strong><br>Optional model on a capable host</p>
    <p>I choose what text to share. Generated answers remain experimental; the model does not acquire a guest keyboard or know the physical machine’s state.</p>
  </section>
</div>

Both access routes are bidirectional where their interfaces support it. The optional route does not sit between the physical panel and the original simulator. Remote panel control is a separate unresolved experiment. [Independent-access decision](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/decisions/0004-independent-access.md).

## Let the old computer do the computing

SIMH runs the PDP-11 and its historical operating system. The browser draws the terminal window. Between them, a small Go service carries the terminal’s input and output. The guest produces the results you see; the browser is not pretending to be UNIX.

The demonstrated guest connection uses a dedicated terminal line, separate from the simulator’s operator console. That distinction keeps ordinary guest typing out of the controls used to manage the simulator itself. More than one person can watch a terminal, while keyboard ownership is explicit.

The intended installation is lightweight: the Pi stays headless, and the browser runs on another computer or tablet. The optional service candidate has embedded browser assets, so a Pi installation would not require a local graphical desktop, Node or Docker. The candidate is installed stopped and disabled by default. It requires effective memory limits with swap disabled; a database or container on the Pi is not part of the intended installation.

## The original doors stay open

Physical switches and lamps, the original console, SSH and GNU Screen remain part of operating the PiDP-11. Appropriate serial and guest network connections should remain useful too. The Web Desktop must not become a new dependency inserted into every route to the machine.

The optional service therefore starts disconnected. It does not start the emulator, choose an operating system or change guest disks. A verified guest line must be approved before the browser can attach. Restarting the companion does not quietly restore an old connection. Before an intentional guest change, I must stop the actual terminal bridge, independently verify the new guest line and approve a fresh attachment. Closing the browser is not enough: a surviving byte stream cannot always reveal that the guest has changed.

That is the design direction and implemented laboratory behavior. It is not a claim that all physical integration has passed. The [independent-access decision](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/decisions/0004-independent-access.md) explains the principle in more detail.

<h2 id="window-modes" style="scroll-margin-top:6rem">Know which sort of window you opened</h2>

I use three distinctions when thinking about the room. They describe what an interface does, not a promise that every device supports all three:

- **Simulation:** a local browser demonstration. Its state does not represent a running guest or an actual emulated device.
- **Observation:** genuine guest or emulated-device output reaches the browser through an approved read-only path. Watching does not change machine state.
- **Supervised interaction:** a deliberately bounded action against a separately approved guest or device instance. Today’s guest keyboard connection is an example, with explicit attachment and keyboard ownership. This is not general permission to mount media, operate the simulator or control a physical panel.

The operator still has to establish which guest is connected. Process and connection checks can help reject stale attachments; they do not automatically identify the operating system or certify it.

**A genuine guest terminal** shows input and output from a historical operating system. UNIX V7 has been demonstrated in isolated development tests and controlled actual-Pi experiments. The laboratory also has genuine 2.11BSD full-screen editor checks, RSX-11M-PLUS text-terminal results and V7 Tektronix graphics. RT-11FB has demonstrated application-terminal input and output, not an independent browser command shell. Initial VT52/VT220 and teletype support does not imply complete terminal conformance. The [M5.17 qualification report](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/lab/M5.17.md) records the tested subsets.

**The ordinary browser front panel and local demonstrations** remain simulations. Disk and magnetic-tape windows also show explicitly selected captured observations, with age and provenance; printer and paper-tape windows provide approved output and retained jobs. A simulated mounted disk does not mean a real guest disk changed, and no view grants browser authority to attach media.

**Guest devices, printer and paper tape** provide read-only approved output. Earlier CPU/device tests remain valid, and M5.20–M5.22 add genuine RSX PIP and RT-11 utility workflows, sequential jobs, supervised observation and checked exports. Those are specific guest subsets, not a universal driver claim. The old M5.10 picture still shows its original CPU-test evidence. [Current equipment boundaries](https://github.com/cdaters/pidp11-webdesktop/blob/b7b485f129d2b689c9f78a95df099f29024f198b/docs/technical/equipment-history.md).

**Remote panel control** is a separate experiment with unresolved safety questions. A delayed START-release message in an early test showed why losing browser control does not necessarily cancel a command already in flight. It remains outside the production feature set.

The [gallery](/projects/pidp-11/gallery) captions preserve these distinctions instead of letting a good-looking screenshot imply more than it proves.

<h2 id="equipment-interfaces" style="scroll-margin-top:6rem">Different equipment needs different connections</h2>

A window is only the visible end of the job. I want the room to expose genuine machine and peripheral activity wherever it can, but each kind of equipment needs its own appropriate interface:

- **Terminals** use configured guest serial lines. The guest must supply the corresponding terminal service or application; its operator console is a separate connection.
- **Printers and paper tape** have genuine RSX/RT-11 utility evidence and retained job history. Media attachment and guest commands remain independent local operations; no general browser input/mounting authority is added.
- **Disk drives and magnetic tape** have genuine guest workflows and read-only captured geometry/provenance. They do not have ordinary-build live drive activity or browser mounting. The separate M5.25 TM11 activity hook is laboratory-only and missed its incremental-memory target.
- **Serial communications and the local modem** have genuine bounded V7 text evidence. Communications reuses explicit terminal ownership; the modem window observes a separate optional fixed-peer process. **Ethernet** has isolated BSD TCP/IP evidence with a separate experimental simulator, not an ordinary browser networking service. No arbitrary dialing, binary-transfer guarantee, DECnet or real-LAN qualification is implied.
- **Graphics displays** depend on the device. Genuine V7 Tektronix plotting uses a terminal byte stream. VT11/VR14 would need a specialized emulated display-controller interface; the Tektronix renderer does not provide one.
- **Physical-panel observation** is separate from guest terminal access. The ordinary browser panel is simulated; observing real switches or lamps requires its own independently qualified path. Remote physical-panel control remains outside the accepted feature set.

The published [capability matrix](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/capabilities.md) and [known limitations](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/known-limitations.md) are the evidence behind these boundaries. The broader computer room is the direction I want to take, not a new claim of completed equipment support. The browser does not automatically start or stop SIMH, select a guest operating system or manage its media.

<h2 id="historical-companion" style="scroll-margin-top:6rem">A guide beside the terminal</h2>

I like the idea of having a reference desk beside an unfamiliar computer. The companion offers three different ways to help:

- **Look up an established fact.** Offline search finds curated notes. Phase D’s source-fact answers also give a statement tied to a named edition and section, without model inference or sending a selected excerpt.
- **Calculate an exact value.** The local calculator handles explicit 8-, 16- and 22-bit values, signed interpretations, masks and shifts. It rejects invalid digits and overflow. It is not an assembler or a general instruction decoder.
- **Ask for an explanation.** An optional language model can use selected references and text I deliberately share. Its inference runs on a capable host, not the Pi 3B+. The explanation remains something to check.

The source library now includes release-specific notes for RSTS/E V9.0, RSX-11M V4.2 and RSX-11M-PLUS V3.0. Reference notes alone do not establish browser-terminal support; the separate RSX-11M-PLUS laboratory results above have their own, narrower evidence. Matching RT-11 V5.3 manual coverage and broader operational guidance remain incomplete.

The limited claim checker can recognize some individual fragments. **Only this fragment** means exactly that: the surrounding answer may still be wrong. Phase D’s fresh model responses included two substantive errors that the checker did not identify as contradictions. A valid citation is not proof that an explanation agrees with its source.

Ordinary chat does not type into the guest. The existing command-review experiment is separate, disabled by default and limited to three explicitly reviewed UNIX commands. Phase D did not expand that authority.

<h2 id="independent-companion" style="scroll-margin-top:6rem">A separate read-only companion</h2>

[Hacker Replicant](https://github.com/rolfpeters-droid/pidp11-hacker-replicant) is Rolf Peters’ independently authored application, and helped inspire my companion experiments. It remains a separate project. Phase C established an adapted chat demonstration; the [earlier compatibility findings](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/technical/hacker-replicant-interop.md) preserve that history. Phase D now supplies an optional integration for an explicitly modified, pinned copy of the upstream application. That distinction matters: it is neither unchanged upstream compatibility nor an endorsement from Rolf.

The desktop opens the configured companion in a separate window on a different HTTPS hostname. The other application has its own sign-in; opening it transfers no desktop credentials or terminal text. Its read-only mode removes the console view, refuses tool and keyboard requests, and shows machine state as unknown.

I paste an excerpt, approve it for a short interval and explicitly include it in the next question. The selection can expire or be revoked. Those actions prevent further readback and cancel this page’s pending request; they cannot recall text already sent or erase another browser’s transcript. Source lookup works without a model.

The adapter checks the supplied simulator and attachment identifiers, but the operator supplies that identity. It cannot discover or prove which guest is running. It also holds one owner’s selection, rather than providing a multiuser sharing system. The Phase D tests used genuine model replies and synthetic excerpts, with real guest endpoints detached. Later [supervised laboratory work](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/lab/M5.12.md) shared genuine V7 text with the modified application under a process, attachment and view guard. That remains a laboratory result: a guest change inside an unchanged process and byte stream can still escape detection, and the observer is not production-qualified.

The [optional Hacker Replicant setup](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/integrations/hacker-replicant/README.md) describes the modified laboratory integration. Independent security review, reliable live guest identity, production qualification and upstream design agreement remain outstanding. The original operator console, emulator lifecycle, media and physical controls stay outside this integration.

<h2 id="installation-status" style="scroll-margin-top:6rem">Trying it and installing it are different steps</h2>

I can develop and explore the browser demonstration without a physical PiDP-11. Genuine historical sessions need a prepared guest and terminal connection. Phase D’s exact ARM64 service package was installed, restarted, rolled back and removed in a disposable Linux environment. It stayed disabled by default, every start remained detached, and missing memory protection caused startup refusal. These are laboratory package checks; they do not establish an accepted Pi installation or sustained performance under guest and model workloads.

As of November 22, 2026, my physical kit still awaits switch repair and renewed coexistence checks. The assessed Pi also needs its memory-controller prerequisite resolved before the candidate service can start with the required limits. The Trixie headless guide covers Oscar’s original software; it is not a Web Desktop installer, and a complete fresh-card replay remains outstanding.

Start with the [published Source Alpha 2 release](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.17-source-alpha.2) and its [current quick start](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/getting-started/source-alpha-2.md). This is experimental source software for local browser demonstrations and controlled laboratories, not an approved installer for physical PiDP-11 hardware. The [M5.18 publication record](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/releases/M5.18-publication.md) identifies the exact released source; publication is not independent security certification or physical acceptance. The original ARM64 provisioning incidents and V7 plotting timeout remain unresolved.

The [existing-kit and fresh-Pi setup paths](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/getting-started/installation-paths.md) explain the separate prerequisites; the [build log](/projects/pidp-11/build-log) follows my physical project. The [gallery](/projects/pidp-11/gallery) retains its dated M5.10 images and Phase D captures. Those pictures document their own milestones, rather than illustrating equipment I have not connected yet.

## What the isolated Ethernet result means

The diagram describes the actual M5.28 topology, not a new live networking window.

![Isolated BSD DEUNA TAP peer topology with optional passive capture](/projects/pidp-11/m529-ethernet-topology.svg)

The final fresh-copy run recorded 22 Ethernet frames, three matching ping replies and a distinctive 23-byte request / 21-byte response through the guest's installed Telnet client. Capture remained outside the data path. A changed guest, namespace or observation generation needs a fresh deliberate selection; an address is not guest identity. [Measurements and failed attempts](https://github.com/cdaters/pidp11-webdesktop/blob/b7b485f129d2b689c9f78a95df099f29024f198b/docs/lab/M5.28.md).

Hacker Replicant remains Rolf Peters' independent project. The separately proposed 0.2 selected-text contract is under review; the earlier modified-application laboratory result does not establish upstream support. Optional AI explanations still cannot operate the machine.
