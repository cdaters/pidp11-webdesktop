# Welcome to the PiDP-11 Web Desktop

A browser can be a window into a very different kind of computer. This project brings vintage terminals, graphics and peripheral windows together while keeping Oscar Vermeulen’s original PiDP-11 independent.

The [PiDP-11](https://github.com/obsolescence/pidp11) is a replica front panel. A Raspberry Pi inside runs **SIMH**, the program that emulates the PDP-11 processor and devices. A historical operating system running inside it is the **guest**. The optional Web Desktop connects to an approved guest terminal; it does not replace the emulator.

## Try the desktop without hardware

Follow the short [local setup](../../README.md#try-the-local-desktop): install the project’s npm dependencies, run the development preview and open its loopback address. No Pi, disk image or model is needed. **Terminal** and the ordinary panel are simulations. **Guest terminal** requires a separately prepared service and guest.

![Actual desktop with V7 and observed emulated devices](../screenshots/m510/desktop.png)

*Genuine disposable V7 and separate diskless CPU/device tests in a Mac-hosted Linux lab. The ordinary local preview does not create these guest connections. [Capture details](../screenshots/README.md).*

## Choose your next step

- [Explore the desktop](explore.md): arrange windows, try mock equipment and find the reference desk.
- [Understand terminals](terminals.md): prompts, personalities, connection and keyboard ownership.
- [Choose an installation path](installation-paths.md): existing PiDP-11 owners or original software first on a fresh card.
- [Configure the optional companion](configured-companion.md): offline references first, a local model only if wanted.
- [Troubleshoot a problem](questions.md) or check [current capabilities](../capabilities.md).
- [Browse all documentation](../README.md) and [screenshots](../screenshots/README.md).

Genuine V7 and 2.11BSD browser sessions work in the lab. Earlier V7 Pi tests also passed specific terminal and physical-coexistence checks, but the overall physical deployment remains unaccepted. The machine is disassembled awaiting switch repair; mandatory memory protection needs separate validation. The [Trixie guide](../installation/README.md) installs Oscar’s original software, not this companion, and has not received a complete independent blank-card replay.
