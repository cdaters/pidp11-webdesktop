# Using the genuine terminal workstation

Open **Guest terminal** for a separately configured, operator-approved guest line.
The ordinary **Terminal** application is still a local command fixture. A screen
color, saved window or terminal personality never connects either window to a guest.

## Connect deliberately

1. Sign in with a locally provisioned terminal credential. Choose **Refresh lines**
   to inspect the operator's current approvals. Open **Connection and equipment
   details** to inspect the selected identity, protocol, generation and limitations.
2. Choose the personality before connecting. It changes interpretation of terminal
   bytes, not the guest's driver or terminal type. Set `TERM` or the guest's terminal
   characteristics separately using its documented commands.
3. **Connect** opens an observer. Confirm the intended line and guest with its local
   operator. **Acquire keyboard** requests this window's lease; a busy owner must
   release it explicitly. Queries, virtual keypad buttons and pasted input all use
   the same lease gate.
4. Disconnect when finished. A lost connection never replays input or automatically
   takes a replacement guest. If approval changed, refresh and deliberately choose
   the new verified generation. Stop the actual bridge before an intentional guest
   change; closing a browser is not equivalent to stopping that process.

The original console remains independent. A disconnected browser cannot tell you
whether a guest has halted. Ordinary SIMH installations use this same endpoint
contract without requiring REALCONS or physical GPIO. The current portable browser
boundary is tested in the Mac/disposable ARM64 lab, not a new cross-platform
production installer.

## Keys, copy and search

Use **Workstation** to find the on-screen Esc, line feed, PF and numeric keypad keys.
They help on laptops without a DEC-style keypad. VT220 editing buttons are enabled
only for that personality and a current keyboard owner. Modern F1–F4 map to PF1–PF4
(only three for VT52); they are not the VT220's local top-row keys. F6–F20 use the
VT220 sequences, including Help/Do. Operating systems may reserve some physical
keys, so the on-screen alternatives are useful.

Return normally sends CR; the renderer honors host newline mode where supported.
Ctrl-J and **Line feed** send LF. Ctrl-C is a guest interrupt, not Copy. Backspace
is an explicit DEL, BS or V7 `#` choice; the guest's erase setting must agree.
VT100/VT52 Delete sends DEL; VT220 Delete represents Remove. Application cursor
and keypad modes follow received guest sequences. VT52 keypad Shift/Control do
not replace its historical codes. Unsupported VT52 editing/function keys are
suppressed rather than leaked as modern ANSI sequences. Shift-arrow does not send
a modified DEC key. Alt/Option behavior remains browser/OS-dependent; non-ASCII
keyboard input is rejected by this seven-bit transport.

Select terminal text with the pointer or **Select retained text**, then choose
**Copy selection**. Command-C or Ctrl-Shift-C is also local Copy; Ctrl-Shift-F opens
terminal search. Other Command shortcuts are left to the browser/OS. Clipboard
permission can be unavailable; the status explains the fallback to browser Copy
or **Save display**. Native paste is always captured for review. Only one ASCII
line, up to 256 characters and without Return/control codes, can be sent with
**Send reviewed paste**. Return remains a separate deliberate action. Clipboard
operations cannot obtain a keyboard lease.

Search is literal, case-insensitive and confined to this window's retained buffer:
300 scrollback lines plus the screen, or 512 scrollback lines for paper. It is not
a complete guest transcript. Use Previous/Next match, Enter/Shift-Enter in the
search field, **Latest output**, and **Focus terminal**. Search does not alter the
guest or persist its contents. For text containing unusual Unicode combining or
wide characters, cell-aligned search is not qualified; the intended guest text
transport is ASCII7. Teletype export has its separate 512-line paper bound.

## Display and optional sound

Green, amber or white phosphor, three brightness levels, block/underline/bar cursor,
and 11/13/16/20-pixel text are presentation options. Text remains 80×24 (paper 72
columns); resizing a window does not negotiate a new guest geometry. Use the
window's existing maximize/fullscreen controls or scroll a smaller viewport.

Scanlines and soft glow are static and off by default. Reduced-motion,
high-contrast and forced-color preferences suppress these effects; cursor blinking
is always off. **Readable defaults** restores the fast default presentation.
The renderer's minimum contrast ratio is 4.5. This is an accessibility measure,
not a complete accessibility audit or proof of native screen-reader compatibility.

Only the six whitelisted display fields are saved in
`pidp11.terminal.display.v1`. New windows use them. Open windows remain independently
adjustable. No guest, token, transcript, generation, connection, keyboard authority,
sound unlock or emulator state is stored there. Existing geometry persistence
remains separate. Unavailable storage leaves the current window usable.

Sound begins muted. **Enable bell in this window** is an explicit browser gesture;
it unlocks that window's audio and clears global mute. Other terminals retain their
own mute/unlock state. Use **Mute this terminal**, **Mute all terminals** and Volume
as needed. Closing every genuine terminal releases the shared audio context and
restores global mute. The browser may still refuse audio; text operation continues.

BEL is interpreted by xterm's parser, including fragmented output. An OSC title
terminator is not a bell. Teletype BEL is both counted in its paper model and passed
to that event. Audio requires this workstation to contain focus, the document to
have focus and the tab to be visible. Background events are counted, not queued.
The synthetic 800-Hz, 100-ms tone is a modern approximation, capped at five starts
per second across windows and 30% gain. No keyboard click, mechanical printer
sound, authentic recording or baud-rate pacing is claimed. Tek graphics audio is
not implemented. Muting suppresses subsequent tones; an already started short
tone can finish.

## Implementation and evidence

[Preferences](../../src/terminal-preferences.ts), [keyboard](../../src/terminal-keyboard.ts),
[audio](../../src/terminal-audio.ts), and [workstation controls](../../src/terminal-workstation.ts)
are small browser modules with explicit cleanup. The existing bridge is unchanged.
[Equipment descriptions](../../src/equipment.ts) are information, not authority.
No new runtime dependency or media/control endpoint was added.

See [capability inventory](terminal-personalities.md) and [M5.19](../lab/M5.19.md)
for fixture versus genuine evidence, the BSD first-screen limitation and resource
measurements. Automated audio checks establish event gating and browser API use;
they do not certify sound heard on a particular speaker or historical acoustics.
