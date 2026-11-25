---
title: 'PiDP-11: a minicomputer on my desk'
menu: PiDP-11
kicker: 'Hardware · historical computing · Web Desktop'
summary: 'A kit full of switches and blinking lights, some unexpected time at the workbench, and an idea for exploring an old computer from a modern browser.'
status: 'Hardware repair • Source Alpha 2 available'
updated: '2026-11-22'
visible: true
hero:
    display: false
lead_image: m510-desktop.png
lead_caption: 'My equipment desk in the Mac laboratory, M5.10, November 21, 2026. Genuine UNIX V7 supplies the text and plot; a separate diskless program running on original SIMH supplies the completed LP11 and PC11 observations below. These views are read-only. No model or physical Pi is connected.'
metadata:
    description: 'Craig Daters builds a PiDP-11/70 and develops an experimental browser desktop with genuine UNIX guests, observed peripherals and an optional tutor, while the physical kit awaits repair.'
chapters:
    -
        label: 'The story'
        route: /projects/pidp-11
    -
        label: 'Build & roadmap'
        route: /projects/pidp-11/build-log
    -
        label: 'How it fits together'
        route: /projects/pidp-11/architecture
    -
        label: 'Gallery & credits'
        route: /projects/pidp-11/gallery
---

<h2 id="source-alpha" style="scroll-margin-top:6rem">Source Alpha 2 is out!</h2>

**November 22, 2026:** [Source Alpha 2 of PiDP-11 Web Desktop](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.17-source-alpha.2) is now available! Alpha 1 was my first public experimental release; this second alpha brings further security and reliability work, better handling of approved text sharing and cancellation, and clearer diagnostics. The software has now managed two releases while my physical machine is still on the workbench, waiting for replacement switches.

This remains a **source-only experimental alpha for local browser demonstrations and controlled historical-computing laboratories**, not an approved installer for physical PiDP-11 hardware. The local demo uses simulated equipment; genuine historical guests need a separate laboratory setup. Start with the release's named source archive and the [Alpha 2 quick start](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/getting-started/source-alpha-2.md).

Independent security review, reliable guest identity verification and physical integration acceptance remain outstanding. A second alpha is progress, not a finished installation on my Pi.

## It started with the blinking lights

I wanted the blinking lights. I also wanted to find out what was behind them.

[Oscar Vermeulen’s PiDP-11/70](https://obsolescence.dev/pdp11.html?target=_blank&rel=noopener) is a Raspberry Pi-based recreation of DEC’s PDP-11/70: a physical front panel paired with software that lets you explore historical operating systems. It puts a very different sort of computer within reach of an ordinary desk. There are switches to set, lamps to watch and unfamiliar systems to learn. That is a fairly effective combination if you already enjoy old computers.

Zork, the early Infocom adventures and the computers that ran them have always been part of the attraction for me. A modern Mac or Linux machine makes it easy to run an emulator. Building the PiDP-11 offered something more tangible: a machine I could assemble, sit in front of and learn to operate.

## From the box to the workbench

I ordered my kit in April 2026. After AlphaGraphics CPS ceased operations in July, I had more time to return to projects that had been waiting. This one eventually became two projects: assembling the machine and building an optional Web Desktop around it. In typical fashion, the software got ahead of the soldering iron.

The hardware was finished in November. By November 19, I had assembled the kit and booted RT-11 using the physical switch register. My Raspberry Pi 3B+ had already hosted a genuine UNIX V7 browser-terminal experiment the previous day. 

The appeal is in both halves. Assembling the board is one challenge; figuring out an unfamiliar operating system is another. I am comfortable around computers; that does not mean I already know my way around every computer from fifty years ago. That is part of the point. Plus, I want to explore versions of Zork and Colossal Cave Adventure on a machine from that era&mdash;even if my machine is a modern recreation!

<h2 id="computer-room" style="scroll-margin-top:6rem">A desk full of terminals — and a computer room beyond it</h2>

[David’s IMSAI 8080esp from The High Nibble](https://thehighnibble.com/imsai8080/?target=_blank&rel=noopener) helped inspire the Web Desktop. I liked the possibility of opening a browser and finding a collection of vintage devices: terminals, a front panel, disk and tape windows, paper tape and a continuous-form printer. Anyone who remembers tractor-feed paper will understand why the printer deserved some attention.

What I have in mind is an optional **virtual PDP-11 computer room**: a place to use the old computer and the equipment around it. Open a terminal, work in an operating system, watch a printer listing arrive or follow a paper tape through its reader and punch. Eventually, I would like to work with removable disk packs, magnetic tapes, serial and modem connections, networking and historical graphics displays too, with manuals and an optional guide close at hand. SIMH would still do the actual PDP-11 computing; the browser would bring that room to a modern screen.

I want that room to make sense for two kinds of enthusiast: someone with Oscar’s physical PiDP-11/70 and its original SIMH/REALCONS software, and someone running a PDP-11 in ordinary SIMH without the replica. The latter should not need a panel PCB, REALCONS or GPIO. Linux, macOS, Raspberry Pi and other suitable hosts are part of that architectural ambition, not a promise that today’s alpha installs everywhere. My own Pi can stay headless while another computer or tablet draws the room.

The aim is to connect those interfaces to genuine emulated guests and devices wherever feasible. A blinking indicator or simulated disk is useful while I am building things, but I want the equipment to earn its place by doing something. Much of that room is still ahead of me; the [architecture page](/projects/pidp-11/architecture#equipment-interfaces) separates the working laboratory paths from the interfaces I still need to build.

That picture is getting rather more interesting. The laboratory still has genuine UNIX V7 terminals, 2.11BSD editing and V7 Tektronix plotting. Since Source Alpha 2, RSX and RT-11 utilities have also produced verified printer and paper-tape output, with retained job records and exact downloads. Disk and magnetic-tape views now show separately captured facts from genuine guest workflows. The [engineering reports](https://github.com/cdaters/pidp11-webdesktop/blob/b7b485f129d2b689c9f78a95df099f29024f198b/docs/capabilities.md) identify the particular systems and tests; this is not a promise that every guest has every peripheral configured.

The ordinary browser front panel and local demonstrations still use simulated state. Separately selected printer, paper-tape and storage observations carry their own provenance; they do not let the browser mount media or operate the simulator. The [gallery](/projects/pidp-11/gallery) distinguishes genuine historical captures, retained output and disconnected current interface views.

## More of the room is doing real work

M5.26 and M5.27 added genuine V7 serial and bounded local-modem text exchanges with an independent peer. M5.28 then connected a genuine 2.11BSD guest through an emulated DEUNA Ethernet controller to a separate test peer. That network existed only inside an isolated laboratory: no Internet, real LAN or physical Pi was involved. Ethernet needed a separately built original-source simulator and currently produces retained evidence, not a live browser networking window.

I am now preparing a **Source Alpha 3 candidate for review**. [Source Alpha 2](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.17-source-alpha.2) remains the latest public release, and its download has not changed. The newer development work is useful, but it does not make the physical installation ready. [Current source qualification](https://github.com/cdaters/pidp11-webdesktop/blob/main/docs/releases/source-alpha-3-candidate.md).

## The physical machine comes first

There is one rule behind all of this: **the PiDP-11 must remain useful without the Web Desktop.**

The switches and LEDs, original console, SSH, GNU Screen, and appropriate serial or guest network access should not depend on a browser being open. I built a physical machine because I wanted a physical machine. A browser should add another enjoyable way to use it.

Keeping those routes independent is part of the design, not an optional extra. The [architecture page](/projects/pidp-11/architecture) explains how it fits together; the detailed experiments and their limits live in the repository.

## There are people at the other end

On November 19, I introduced the project in the [PiDP-11 Google Group](https://groups.google.com/g/pidp-11/c/2LzVyxvgLHI?target=_blank&rel=noopener). Rolf Peters and I exchanged notes about his [Hacker Replicant](https://github.com/rolfpeters-droid/pidp11-hacker-replicant?target=_blank&rel=noopener), a tutor alongside a browser console. His independently developed tutor helped inspire my own companion experiments. An optional guide could be a useful addition when you are learning an unfamiliar historical system. I could certainly use one myself.

My own optional companion now has an offline reference desk, source-backed answers that do not need a model, and an exact calculator for PDP-11 values. A local language model can help explain what I am reading, but its answers remain experimental. I rather like having the references beside the answer. I still need to read them: a fluent explanation can be wrong.

An earlier [laboratory demonstration with Rolf’s actual Hacker Replicant application](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.9.3-C.md) used an adapter and a laboratory-only translation layer, with tools switched off. Phase D has now taken that further: an explicitly modified copy of Hacker Replicant has its own sign-in and a read-only mode for questions, source lookup and deliberately shared excerpts.

Those Phase D laboratory tests used a real model and clearly labeled synthetic text. They did not establish live guest sharing or production readiness. The modified integration is not an upstream-endorsed or merged project. The [architecture page](/projects/pidp-11/architecture#independent-companion) explains the boundary. The community is as much a reason to keep working on this as the hardware.

## Where I want to take it

**November 21, 2026:** the software has moved ahead while the physical kit is back on the workbench. I removed the suspect SR0 switch and damaged the neighboring momentary switch housing in the process. I have asked Oscar about replacements. The [build log](/projects/pidp-11/build-log) has that part of the story, warts and all.

Phase D is complete, and M5.10 now brings the screenshots and documentation up to date with that tested runtime. Phase D makes the source material easier to use directly and adds the optional read-only companion described above. There is still work to do: independent review of the tutor and integration, reliable identification of a live guest, and sustained testing. The model still gets things wrong, so I use source-backed facts for established points and the exact calculator for arithmetic. The [build log](/projects/pidp-11/build-log#m510) follows that progress; the [M5.10 report](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.10.md) records what the fresh captures actually demonstrate.

You can try the local browser demonstration without a Pi or a guest disk. A genuine guest session needs a separately prepared connection. There is no stable binary release or accepted installation on my physical Pi. The optional Pi service remains a laboratory-tested candidate: hardware repair, renewed coexistence checks and the Pi’s memory-protection setup still stand between it and an accepted installation. The [getting-started guide](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/getting-started/README.md) and [two installation paths](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/getting-started/installation-paths.md) explain those choices. The [repository](https://github.com/cdaters/pidp11-webdesktop) holds the source and changing technical status.

This is an independent RetroRealm project, with thanks to Oscar and the PiDP contributors, Bob Supnik and SIMH, Jörg Hoppe and BlinkenBone/REALCONS, xterm.js and The High Nibble. Codex and ChatGPT have assisted with development, research and documentation. [Full credits](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/ACKNOWLEDGMENTS.md?target=_blank&rel=noopener).

Interested in your own blinking lights? Start with the [official kit](https://obsolescence.dev/pidp11-get-one-direct.html?target=_blank&rel=noopener) and [assembly instructions](https://obsolescence.dev/pidp-11-building-instructions.html?target=_blank&rel=noopener).
