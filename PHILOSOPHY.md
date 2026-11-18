# Why we are building this

There is something satisfying about sitting down at a terminal, exploring an unfamiliar operating system and finding out how an older computer thinks. PiDP-11 Web Desktop aims to make that experience available through a modern browser: an integrated collection of vintage terminals and peripheral interfaces connected to a genuine PDP-11 guest.

The physical PiDP-11 remains at the center of that experience. Oscar Vermeulen and the community have made an extraordinary machine approachable. Our desktop is an optional companion. The original simulator, switches, lamps, console, SSH, GNU Screen and physical serial connections should remain useful whether the browser is open, closed or absent.

## Let the old computer do the computing

SIMH runs the PDP-11 and its operating system. The browser renders the terminal and the Go service carries its bytes. We prefer established emulator and protocol interfaces to replacing working simulation code. Demonstrations help us develop the interface, but they are labeled as demonstrations. A simulated shell is not evidence of a real guest connection.

M5.0 matters because it crossed that boundary: the browser talked to genuine UNIX V7. We want future peripherals to earn the same distinction through observable, repeatable tests.

## Make access easy and keep the Pi small

A browser on a Mac, Windows PC, Linux machine or tablet should provide the graphics. The Pi should remain headless, with a small compiled service and embedded browser assets where practical. No local graphical desktop or large application framework should be necessary just to open a terminal.

Accessibility also means useful explanations. A person should be able to enjoy the desktop without already knowing what a multiplexer, lease or RPC server is. The deeper engineering should remain available to anyone who wants to investigate.

## Preserve details and tell the truth

Historical layouts, labels, keyboard behavior, character sets and paper matter. We use original references and credit their creators. Where behavior is approximate, incomplete or untested, we say so. A successful lab test does not automatically establish a safe hardware installation.

Observation and remote front-panel control are different problems. We will keep them separate while control-safety questions remain unresolved. Traditional operation should not be routed through a new web dependency merely to make an integration convenient.

## Leave room to experiment

The preferred path is an optional companion to the original installation. Oscar's suggestion of a separately maintained enhanced distribution remains a possible alternative where a feature truly needs it. Interoperability and reversible experiments will tell us which approach is useful; we do not need to choose a more complicated arrangement in advance.

We welcome the wider PiDP community's experience, corrections and independent experiments. A careful bug report, a remembered terminal quirk, a photograph or a clearer paragraph can be as valuable as a large code contribution.

## Share the work

Original RetroRealm code and appropriate original software documentation use MIT. We preserve other people's notices and distinguish implementing compatibility from redistributing particular files. Historical uncertainty is not an invitation to erase attribution or to stop unrelated development. Specific material questions are handled specifically, with the owner addressing any rights-holder correspondence.

This is a hobby workbench maintained by **Craig Daters · [RetroRealm.org](https://retrorealm.org/)**. Curiosity, preservation, collaboration and enjoyment are the reasons to keep building it.
