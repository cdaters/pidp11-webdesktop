# Terminal personalities and conformance

M5.6 separates a terminal's interpretation of bytes from its connection. Choose **VT100** or **VT52** in **Guest terminal** before connecting. Both use the same configured ASCII guest line, generation checks, read-only initial state and keyboard lease. Selection does not configure the guest's terminal setting, negotiate Telnet, start a guest or acquire its keyboard. Choose the corresponding terminal type within a guest application independently.

The screen stays **80 columns × 24 rows**. Text size changes readability, not geometry; a smaller window scrolls. Reconnecting creates a fresh renderer and personality parser, discards incomplete escape sequences and returns without keyboard authority. The separate mock command editor remains a VT100-style demonstration; it is not a VT52 guest test.

## VT100 subset

The existing pinned xterm.js renderer handles cursor position, scrolling margins, DEC special graphics, character reverse video, CR and LF independently, and fragmented escape sequences. The shared keyboard adapter uses xterm's reported application cursor/keypad modes. PF1–PF4 use SS3; Delete sends DEL rather than a modern ANSI delete-key sequence. Backspace remains an explicit choice of DEL, BS or UNIX V7's `#` erase character.

The [DEC VT100 User Guide, programmer information](https://vt100.net/docs/vt100-ug/chapter3.html) is the historical reference. `browser-tests/terminal-profiles.spec.ts` verifies position and margin contents, line-drawing glyphs, reverse-video styling, separate CR/LF movement, application keys, resizing and reconnect. These are fixtures in three engines, not proof of every historical application's behavior. Double-width/height characters, printer extensions, serial timing and complete VT100 identification/conformance are not qualified. xterm has later features; their presence does not make this a complete VT100.

## Initial VT52 text subset

`src/terminal-profile.ts` incrementally interprets VT52 bytes before the existing renderer. It implements ESC A/B/C/D, H, I, J, K, Y, Z, = and >, plus BEL, BS, HT, LF and CR. Repeated ESC restarts an escape; NUL/DEL fills do not terminate it. At the right margin new text overwrites the last cell. Invalid vertical addressing preserves the row; oversized columns clamp right. Tabs after column 73 advance one column. Arrow keys use ESC A–D; the three function keys use ESC P–R; alternate numeric keypad uses ESC ?. Identification returns ESC / K, only while this viewer owns the keyboard.

These details follow [DECscope VT50/VT52 Operator's Manual, EK-VT5X-OP-001](https://vt100.net/dec/ek-vt5x-op-001.pdf), printed pages 15–22. Graphics characters, copier operations, serial BREAK/flow control and extended PC keys are outside the subset. Unrecognized escape commands are ignored; no automatic ANSI-mode detection is promised. It rejects high-bit output and chunks above 64 KiB. Parser storage is constant; expanded display output is bounded by the input chunk. Only a current keyboard owner may send a query reply, so read-only observers never answer the host.

Unit tests exercise every split of cursor-address fixtures, bounds, reset and keys. Browser tests exercise rendered positions, non-wrap, ownership-gated identification and switching back to VT100 after disconnect. Genuine V7 regression verifies ordinary login/command I/O in each personality; it does not prove a full-screen VT52 application.

## Reproducing the checks

From the **Mac development shell**, run `npm test`, start `npm run dev`, then run:

```sh
npx playwright test browser-tests/guest.spec.ts browser-tests/terminal-profiles.spec.ts
```

These tests intercept the transport deliberately. For real guest evidence use the separate [M5.6 lab](../../lab/m56/README.md). No terminal fixture contacts a Pi.
