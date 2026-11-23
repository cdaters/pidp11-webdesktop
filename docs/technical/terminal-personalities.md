# Terminal personalities and conformance

## M5.19 implementation inventory

This table describes the current development code. All personalities remain partial;
no terminal certification or physical deployment is claimed. See the
[workstation guide](terminal-workstation.md) and [genuine results](../lab/M5.19.md).

| Area | VT100 | VT52 | VT220 |
|---|---|---|---|
| Controls / positioning | xterm CR/LF/BS/HT/BEL and ANSI cursor operations | Explicit bounded DECscope translator, no wrap, ESC Y address | C1 normalization plus xterm common display operations |
| Erase / scroll / edit | Erase and margins verified; ICH/DCH are renderer extensions, not base-VT100 authenticity claims | ESC J/K, LF and reverse index; no ANSI insertion mode | Common ANSI editing through xterm; selective erase unqualified |
| Attributes / character sets | DEC graphics and inverse video fixture-tested; complete sets/double-size unqualified | Text only; graphics/copier unimplemented | Seven-bit DEC graphics; supplemental/national sets unqualified or rejected |
| Keyboard | Application cursor/keypad, PF1–4, explicit erase choice | Three PF keys; alternate keypad; Shift/Control keypad correction; unsupported PC edits suppressed | Editing keys, F6–F20, Help/Do and common keypad/cursor modes |
| Identity | M5.19 intercepts DA and DECID as base VT100 `ESC[?1;0c`; suppresses later secondary DA | `ESC/K` | `ESC[?62c`; M5.19 adds DECID; existing secondary identity retained |
| Reset / wrap | Renderer RIS and wrap fixture-tested | Fresh connection resets parser/keypad; right margin overwrites | Renderer RIS/soft reset; seven-bit DECSCL; no full reset fidelity claim |
| Columns | Fixed 80×24; 132-column mode unqualified | Fixed 80×24 | Fixed 80×24; 132 columns unqualified |
| Bell | Parser event, optional gated audio | Translated BEL to same event | Normalized BEL to same event |

M5.19 deliberately improves identification and keyboard behavior instead of replacing
xterm's proven display parser. Replies still pass through the current keyboard
lease. The VT100 identity follows the [DEC VT100 programmer information](https://vt100.net/docs/vt100-ug/chapter3.html).
VT52 modifier behavior follows the [DECscope manual](https://vt100.net/dec/ek-vt5x-op-001.pdf),
printed page 15. VT220 keys and DECID follow the [DEC transmitted-code chapter](https://www.zx.net.nz/computers/dec/vt220/doc/vt220-rm/chapter3.html)
and [received-code chapter, §4.17.3](https://www.zx.net.nz/computers/dec/vt220/doc/vt220-rm/chapter4.html).
Identity replies advertise a compatibility choice, not complete emulation.

The sections below preserve the earlier implementation history. Their statements
that audio or later function keys are absent are superseded by this inventory.
Guest tty settings, echo/erase, flow control and application terminal databases
remain guest responsibilities; browser colors do not configure them.


M5.6 separates a terminal's interpretation of bytes from its connection. M5.9 adds **VT220**, **ASR-33** and **Tektronix 4010** beside **VT100** and **VT52**; choose a personality in **Guest terminal** before connecting. All use the existing configured guest line, generation checks, read-only initial state and keyboard lease. Selection does not configure the guest's terminal setting, negotiate Telnet, start a guest or acquire its keyboard. Choose the corresponding terminal type within a guest application independently.

Text screens stay **80 columns × 24 rows**, except the teletype’s 72-column paper. Tektronix uses a separate 1024×781 SVG viewport. Text size changes readability, not geometry; a smaller window scrolls. Reconnecting creates a fresh renderer and personality parser, discards incomplete escape sequences and returns without keyboard authority. The separate mock command editor remains a VT100-style demonstration; it is not a VT52 guest test.

## VT100 subset

The existing pinned xterm.js renderer handles cursor position, scrolling margins, DEC special graphics, character reverse video, CR and LF independently, and fragmented escape sequences. The shared keyboard adapter uses xterm's reported application cursor/keypad modes. PF1–PF4 use SS3; Delete sends DEL rather than a modern ANSI delete-key sequence. Backspace remains an explicit choice of DEL, BS or UNIX V7's `#` erase character.

The [DEC VT100 User Guide, programmer information](https://vt100.net/docs/vt100-ug/chapter3.html) is the historical reference. `browser-tests/terminal-profiles.spec.ts` verifies position and margin contents, line-drawing glyphs, reverse-video styling, separate CR/LF movement, application keys, resizing and reconnect. These are fixtures in three engines, not proof of every historical application's behavior. Double-width/height characters, printer extensions, serial timing and complete VT100 identification/conformance are not qualified. xterm has later features; their presence does not make this a complete VT100.

## Initial VT52 text subset

`src/terminal-profile.ts` incrementally interprets VT52 bytes before the existing renderer. It implements ESC A/B/C/D, H, I, J, K, Y, Z, = and >, plus BEL, BS, HT, LF and CR. Repeated ESC restarts an escape; NUL/DEL fills do not terminate it. At the right margin new text overwrites the last cell. Invalid vertical addressing preserves the row; oversized columns clamp right. Tabs after column 73 advance one column. Arrow keys use ESC A–D; the three function keys use ESC P–R; alternate numeric keypad uses ESC ?. Identification returns ESC / K, only while this viewer owns the keyboard.

These details follow [DECscope VT50/VT52 Operator's Manual, EK-VT5X-OP-001](https://vt100.net/dec/ek-vt5x-op-001.pdf), printed pages 15–22. Graphics characters, copier operations, serial BREAK/flow control and extended PC keys are outside the subset. Unrecognized escape commands are ignored; no automatic ANSI-mode detection is promised. It rejects high-bit output and chunks above 64 KiB. Parser storage is constant; expanded display output is bounded by the input chunk. Only a current keyboard owner may send a query reply, so read-only observers never answer the host.

Unit tests exercise every split of cursor-address fixtures, bounds, reset and keys. Browser tests exercise rendered positions, non-wrap, ownership-gated identification and switching back to VT100 after disconnect. Genuine V7 regression verifies ordinary login/command I/O in each personality; that original regression did not prove a full-screen VT52 application. Later 2.11BSD evidence is summarized below.

## Reproducing the checks

From the **Mac development shell**, run `npm test`, start `npm run dev`, then run:

```sh
npx playwright test browser-tests/guest.spec.ts browser-tests/terminal-profiles.spec.ts
```

These tests intercept the transport deliberately. For real guest evidence use the separate [M5.6 lab](../../lab/m56/README.md). No terminal fixture contacts a Pi.

## M5.9 VT220 subset

`VT220Profile` normalizes incoming eight-bit C1 controls to seven-bit ESC forms before xterm's UTF-8 decoder. It supplies its own primary identity `ESC[?62c`, without advertising unimplemented optional capabilities, and secondary identity `ESC[>1;0;0c`. Editing keys and F6–F12 use their DEC-style sequences. Seven-bit DECSCL is supported through a soft reset; eight-bit replies and unsupported compatibility levels fail visibly. Keyboard/reply transport remains ASCII7. Device strings and supplemental high characters are rejected. Pending sequence storage is limited to 128 characters; reconnect discards it.

The [DEC VT220 programmer reference, chapter 4](https://www.zx.net.nz/computers/dec/vt220/doc/vt220-rm/chapter4.html) informs this adapter. It is not a relabeled complete xterm: xterm supplies common display operations, while the adapter supplies the qualified differences. Downloadable characters, user-defined keys, selective erase, complete national character sets, 132 columns and full reset fidelity remain unqualified. Query replies require the current keyboard lease. Browser fixtures verify identity, C1 display, editing keys and observer silence; actual V7 ordinary I/O and `hangman` passed in all three engines.

## M5.9 teletype presentation

`TeletypePaper` models a bounded paper record: uppercase display, separate carriage return and line feed, backspace and no wrapping beyond column 72. At the margin subsequent print overwrites the final cell. Overstrike keeps the latest glyph, not accumulated ink. Export retains at most 512 lines. BEL is counted internally; no audible bell or 110-baud pacing is implemented. Tabs and other unsupported mechanical controls are ignored. Output chunks are limited to 64 KiB and ASCII7.

The [Teletype Model 33 technical manual](https://www.bitsavers.org/communications/teletype/33/310B_Vol_1_33_Teletypewriter_Sets_Technical_Manual_Sep74.pdf) supplies historical context; this modern paper presentation does not claim full device emulation. Uppercase keyboard is an explicit option, initially off so lowercase V7 login/commands still work. All three engines passed genuine V7 commands. Mechanical timing, paper motion and acoustic authenticity remain future work.

## Current compatibility evidence

| Presentation | Fixture verification | Genuine guest verification |
|---|---|---|
| VT100 | Existing cursor, margin, graphics, keypad and reconnect suite | V7 commands and line-oriented `hangman`, three engines |
| VT52 | Fragmented addressing, control handling, non-wrap, keys and identity | Same V7 command/game scope, three engines |
| VT220 | Separate identity/C1/editing-key tests and bounds | Same V7 command/game scope, three engines |
| ASR-33-inspired | Paper controls, truncation/export, ownership and multiple windows | V7 commands, three engines |
| Tektronix | Compressed/incremental coordinates, bounds, GIN ownership and hardcopy | Original V7 plotting, three engines; no genuine GIN test |

The M5.9 table above is the historical baseline. M5.9.1 additionally retained eight genuine 2.11BSD `/usr/ucb/vi` cases: VT100 and VT52 in all three engines, VT220 in Chromium and Firefox. The guest TERM matched the presentation. Insert/write/redraw/delete/quit and read-only reconnect passed; the VT220/WebKit result was not retained after a volume interruption and is not counted. This is scoped application evidence, not full DEC conformance. [M5.9.1 details](../lab/M5.9.1.md#historical-full-screen-evidence).


M5.9.2 completed the missing VT220/WebKit case and expanded genuine BSD `vi`/`more`, ownership and observer checks. [Current evidence](../lab/M5.9.2.md). M5.10 adds a fresh Chromium VT220 `vi` capture and V7 VT52/teletype presentation captures; it does not repeat the entire three-engine suite. [Current gallery](../screenshots/README.md).
