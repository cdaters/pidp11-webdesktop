# A terminal is a conversation with a computer

A DEC VT100 is a text terminal: a keyboard and screen that exchange characters with another computer. The computer can also send instructions that move the cursor, clear the screen or draw lines. Our browser terminal uses xterm.js to render a tested VT100-style subset. It is not yet a complete reproduction of every DEC terminal model.

Three prompts can look similar while controlling different things:

| Where you are | What commands affect |
|---|---|
| Mac or Raspberry Pi Linux shell | The host computer: files, programs and services |
| SIMH `sim>` monitor | The emulated machine: devices, disks and execution |
| PDP-11 guest terminal | The historical operating system running inside SIMH |

Do not paste a Linux installation command into a guest terminal, or a SIMH command into a guest shell. Prompt appearance is a useful clue, but read the window's source/status label too.

## The real demonstration

In M5.0, a genuine UNIX V7 guest ran under original SIMH/REALCONS in an isolated Linux environment on the Mac. The browser executed `ls /` and other real commands through a Go bridge connected to dedicated DC11 serial lines. The independent operator console remained usable when a browser closed or the bridge stopped.

![Real UNIX V7 browser session](../screenshots/m50-real-unix-v7.png)

*Actual M5.0 guest output. The background front panel is still simulated; this is not a photograph or a live physical-Pi connection.*

## Sharing a guest line

Several browsers can watch the same terminal output, but only one may own its keyboard. Connecting starts read-only. **Acquire keyboard** requests control, **Release keyboard** gives it up, and **Disconnect** closes that browser connection. A different guest line can have a different keyboard owner where the operating system supports it.

Refreshing does not silently take control. Reconnecting is explicit and starts with a fresh display; the guest may still be logged in or have unfinished input. Closing a browser does not shut down the guest. Stopping the bridge can disconnect the guest terminal line and affect that login, even while the PDP-11 and its operator console keep running.

## Typing and paste

The real adapter currently uses ASCII7 and a fixed 80 × 24 screen. Backspace encoding can be selected explicitly: DEL, BS or UNIX V7's `#` erase character. The correct choice depends on the guest's terminal settings.

Paste is captured for review. Only one bounded ASCII line without Return is accepted; **Send reviewed paste** does not press Return for you. Inspect what you are sending before executing a guest command.

VT52, fuller VT220 support, Tektronix 4010 and VT11/VR14 graphics are future directions, not current guest-terminal claims. Developers can follow the [M5.0 reproduction guide](../lab/M5.0-runbook.md) and [terminal architecture](../lab/M5.0.md).
