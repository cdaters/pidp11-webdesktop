# PiDP-11 Web Desktop

**Craig Daters · [RetroRealm.org](https://retrorealm.org/projects/pidp-11)**

**Experimental alpha · Independent project · [MIT original code](LICENSE)**

A browser workspace for exploring a PDP-11: vintage terminals, vector graphics, continuous-form paper, and an optional historical reference companion. Inspired by The High Nibble’s IMSAI 8080 desktop, this project brings those tools together around [Oscar Vermeulen’s PiDP-11/70](https://github.com/obsolescence/pidp11).

The old computer still does the computing. SIMH runs the historical operating system; the browser displays its terminal and device output. Oscar’s original launcher, physical panel and conventional console remain independent of the optional desktop.

[**Try it locally**](#try-the-local-desktop) · [Getting started](docs/getting-started/README.md) · [Gallery](docs/screenshots/README.md) · [Capabilities](docs/capabilities.md) · [Documentation](docs/README.md)

![Actual Web Desktop with a UNIX V7 terminal, V7 Tektronix plot and completed LP11/PC11 device observations](docs/screenshots/m510/desktop.png)

*Actual Chromium capture from a disposable Mac-hosted Linux lab. V7 supplies the terminal and plot; a separate diskless PDP-11 program supplies the printer and paper-tape bytes. This is not a physical Pi deployment or an operating-system printer-driver demonstration. [Full-size gallery and provenance](docs/screenshots/README.md).*

## A desk for historical computing

- **Use real guest terminals.** Open independent lines, share read-only views, and explicitly acquire a keyboard when you want to type.
- **Explore terminal personalities.** Choose VT100, VT52, a VT220 subset, or an ASR-33-inspired paper presentation.
- **Watch vector graphics and device output.** Display V7 plots, follow approved LP11/PC11 output, and download completed bytes.
- **Learn without a model.** Search 29 source-linked historical notes, request 13 verified source facts, or calculate PDP-11 values exactly.
- **Explore without hardware.** The local demonstration includes an SVG PDP-11/70 panel, mock terminals, and simulated disk, tape and printer workflows.

Windows move, resize, maximize and arrange like equipment on a workbench. The browser supplies the graphics; the optional Go service stays small and serves its application assets from one executable. No graphical desktop, Node runtime, database or container is required on the target Pi.

## Genuine operating systems, with specific evidence

**Research UNIX V7** has run through the browser in disposable laboratories and in a completed terminal-only pilot on the actual Raspberry Pi. **2.11BSD** has passed genuine `vi` editing and `more` paging through the browser. Full-screen application tests cover specified terminal subsets, not complete historical-terminal conformance.

![Genuine 2.11BSD vi running through the VT220 subset](docs/screenshots/m510/bsd-vi.png)

*Fresh disposable 2.11BSD, original SIMH and the actual browser terminal. The editor’s filename contains a test identifier. [Terminal behavior](docs/technical/terminal-personalities.md) · [Guest demonstrations](docs/capabilities.md#terminals-and-operating-systems).*

RT-11SJ V05.03 worked through the original physical launcher and console. That is **not** a verified Web Desktop RT-11 integration. RSX and RSTS/E historical references likewise do not establish browser guest acceptance.

## Graphics and peripherals

The Tektronix 4010 renderer receives genuine UNIX V7 `graph | plot -Ttek` output. LP11 and PC11 observation follows output from the original SIMH devices; a PDP-11 CPU test program exercises those registers and transfers actual bytes. Guest printer-driver integration remains unverified.

![Genuine UNIX V7 vector plot in the browser](docs/screenshots/m510/v7-tek.png)

The separate disk, magnetic-tape, paper-tape and system-management applications are **simulations**. They do not attach or rewrite real guest media. VT11/VR14 work remains research. [Graphics guide](docs/technical/graphics-foundations.md) · [Device observation](docs/technical/observed-peripherals.md).

## An optional companion for learning

The offline reference desk, source facts and exact calculator work without AI. For example, `/calc 16 oct 177776` gives decimal **65534** and hexadecimal **FFFE**; `/fact movb-register` retrieves a source-backed explanation.

A separately configured local model can discuss deliberately shared text and source passages. Genuine Gemma conversations passed in three browser engines, but Gemma still makes factual and arithmetic errors. Claim annotations check only narrowly recognized statements; a source citation does not certify an answer. Nothing in chat automatically operates the host, simulator, guest or panel. The separate, disabled-by-default command-proposal experiment allows only three reviewed UNIX suggestions with explicit human approval.

[Use the companion](docs/getting-started/configured-companion.md) · [Reference library](docs/technical/historical-reference-library.md) · [Measured limits](docs/lab/M5.9.3-D.md).

### Hacker Replicant is a separate project

[Rolf Peters’ Hacker Replicant](https://github.com/rolfpeters-droid/pidp11-hacker-replicant) inspired aspects of our independently developed companion. Its GNU Screen operator-console approach differs from our dedicated guest serial lines and explicit attachment/keyboard protections.

The actual application completed laboratory conversations through our model gateway. Phase D used an **explicitly modified** copy in a separately authenticated read-only mode, with synthetic selected text and no console control. This is not a supported full integration, merger or endorsement. [Optional integration and attribution](integrations/hacker-replicant/README.md).

## Try the local desktop

You need Git and Node.js **22.18 or newer** with npm. In a terminal on your development computer:

```sh
git clone https://github.com/cdaters/pidp11-webdesktop.git
cd pidp11-webdesktop
npm ci
npm run dev
```

Open the loopback address printed by Vite, normally `http://127.0.0.1:5173`. Open **Terminal**, acquire its keyboard and type `HELP`, or add a sample job in **Line printer**. Stop the preview with Ctrl-C.

This demonstration requires **no Pi, guest disk or model**. It does not connect to hardware. **Guest terminal** is a separate application that needs an explicitly prepared guest service. [Explore the controls](docs/getting-started/explore.md) · [Troubleshooting](docs/getting-started/questions.md).

## Choose an installation path

| Your starting point | Where to go |
|---|---|
| I want to explore on my computer | [Local demonstration](#try-the-local-desktop) |
| I already own a working PiDP-11 | [Path A: optional companion candidate](docs/getting-started/installation-paths.md#path-a-you-already-have-a-working-pidp-11) |
| I have an empty microSD card | [Path B: Oscar’s original software first](docs/getting-started/installation-paths.md#path-b-start-with-raspberry-pi-os-lite) |
| I want to reproduce a genuine guest lab | [Developer instructions](docs/technical/development.md) and [lab reproduction](lab/m510/README.md) |

The optional ARM64 package is **laboratory tested, not accepted for production deployment**. It starts detached, stays disabled by default, requires HTTPS/authentication and enforceable memory protection, and never starts an emulator. There is no published binary download implied by these instructions. [Alpha package preparation](docs/releases/alpha-readiness.md).

The original-software installation tutorial was reconstructed from a successful installation; the complete guide has **not** passed an independent blank-card replay.

## Current boundaries

Physical coexistence was partially demonstrated, but the original installation’s unexpected SR0/boot-selection behavior blocked acceptance. The machine is currently disassembled awaiting switch repair. Memory-controller readiness and representative Pi resource measurements also remain unresolved. Remote front-panel control is not a production feature.

The original physical-only operating experience is the fallback and must remain independent of this project. [Capability matrix](docs/capabilities.md) · [Known limitations](docs/known-limitations.md) · [Roadmap](ROADMAP.md).

## Explore, contribute and give credit

Browse the [current gallery](docs/screenshots/README.md), [documentation](docs/README.md), [project philosophy](PHILOSOPHY.md) and [development history](docs/timeline.md). Historical-system experience, terminal quirks, clearer instructions and small fixes are welcome. Start with [Contributing](CONTRIBUTING.md), [Issues](https://github.com/cdaters/pidp11-webdesktop/issues) or [Discussions](https://github.com/cdaters/pidp11-webdesktop/discussions).

Thank you to Oscar Vermeulen, SIMH, Jörg Hoppe’s BlinkenBone/REALCONS, The High Nibble, Rolf Peters, xterm.js and the wider preservation community. [Acknowledgments](ACKNOWLEDGMENTS.md) identify their work and the development assistance used here.

Original RetroRealm code and appropriate original documentation use [MIT](LICENSE), copyright 2026 Craig Daters. Other materials retain their [own notices](THIRD_PARTY_NOTICES.md). This independent hobby project claims no official DEC, PiDP-11 or upstream endorsement.
