---
title: 'The build & the road ahead'
kicker: 'PiDP-11 · from a kit to a workbench'
summary: 'How this project found its way out of the box, and what I would like to do with it next.'
status: 'An ongoing hobby project'
updated: '2026-11-22'
visible: false
hero:
    display: false
metadata:
    description: 'The personal PiDP-11 timeline: an April kit purchase, time after July, November assembly, and the roadmap for an optional vintage-computing Web Desktop.'
---

<nav aria-label="On this page" style="margin:1rem 0; line-height:2"><strong>On this page:</strong> <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#hardware-detour">Hardware detour</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#software-progress">Software</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#phase-d">Phase D</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#m510">M5.10 refresh</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#source-alpha">Source Alpha 1</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#source-alpha-2">Source Alpha 2</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#m519">M5.19 terminals</a> • <a style="display:inline-block; padding:.25rem 0; max-width:100%" href="#road-ahead">The road ahead</a></nav>

[div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:1.25rem; margin:1.5rem 0;"]

[div]
[lightbox image="7402004.jpg" height="75vh" gallery="pidp-history" title="<span style='display:inline-block;background:#111;color:#fff;padding:4px 8px'>DEC PDP-10 at CERN, 1974</span>" desc="<div style='background:#111;color:#fff;padding:12px'>ERASME was an instrument developed at CERN for the analysis of the 70 mm film from the 3.7 m bubble chamber, BEBC, but was also used at an early stage with the 50 mm film from the 2 m bubble chamber. Not a fully automated instrument, it could perform the full sequence of operations (scanning and measurement) making large use of the operator intervention in both stages. There were at the end five ERASME units each one with its own PDP-11 computer, with 8 K words of 16-bit memory, linked to a common PDP-10 by an interface. (See CERN Courier 14 (1974) p. 48.)<br /><br />Photo: CERN PhotoLab / © CERN.</div>"]
![A DEC PDP-10 computer at CERN’s ERASME facility](7402004.jpg?resize=560,452&style=border-radius:8px;margin:0;width:100%;height:auto)
[/lightbox]
[div style="font-size:0.8em; line-height:1.45; margin-top:0.5rem;"]
DEC PDP-10 at CERN’s ERASME facility, 1974. Photo: [CERN PhotoLab](https://cds.cern.ch/record/916840?target=_blank&rel=noopener) / © CERN.
[/div]
[/div]

[div]
[lightbox image="PDP-11-70.webp" height="75vh" gallery="pidp-history" title="<span style='display:inline-block;background:#111;color:#fff;padding:4px 8px'>A PDP-11/70 system</span>" desc="<div style='background:#111;color:#fff;padding:12px'>This PDP-11/70 system included two nine-track tape drives, two disk drives, a high speed line printer, a DECwriter dot-matrix keyboard printing terminal and a cathode ray tube terminal, all installed in a climate-controlled machine room.<br /><br />Photo: Kozan / Public Domain.</div>"]
![A PDP-11/70 system](PDP-11-70.webp?resize=560,452&style=border-radius:8px;margin:0;width:100%;height:auto)
[/lightbox]
[div style="font-size:0.8em; line-height:1.45; margin-top:0.5rem;"]
A PDP-11/70 system. Photo: [Kozan](https://commons.wikimedia.org/wiki/File:PDP-11-70.JPG?target=_blank&rel=noopener) / Public Domain.
[/div]
[/div]

[/div]

## April: Bring home a minicomputer

I ordered my PiDP-11/70 kit in April 2026, although the story of how I ended up ordering one actually began with another project entirely.

I had been exploring the idea of developing [TerpVault](/projects/terpvault), a plugin for the Grav CMS that would integrate classic Interactive Fiction (IF) into RetroRealm.org. As part of that effort, I started researching the original *Colossal Cave Adventure* (usually just called *Adventure*), with the idea of porting it and making it one of my initial releases, alongside the newly released source code for *Zork I, II,* and *III*.

That research led me down a rather interesting rabbit hole. Many of those early text adventures had their origins on the mainframes and minicomputers of the 1970s, particularly systems such as DEC's PDP-10 and PDP-11. These were machines from an era when a computer might occupy an entire cabinet, communicate through a teletype terminal, and have a front panel covered in switches and blinking lights.

Naturally, I wanted to know more.

Somewhere along the way, I stumbled across YouTube videos of people assembling Oscar Vermeulen's PiDP-11/70 replica kits. Here was a way to experience a piece of that computing history firsthand, complete with a physical PDP-11/70 front panel and the ability to run historical operating systems through SIMH.

Well, that was pretty hard to resist!

So I ordered the kit. And, as sometimes happens with my projects, it arrived, found a comfortable corner, and proceeded to sit there for several months.

## July: Time for the projects that were waiting

When AlphaGraphics CPS ceased operations in July, I suddenly found myself with considerably more free time than I'd anticipated.

That wasn't exactly how I'd planned to make room for my hobbies, but it did give me an opportunity to revisit projects I'd been putting off.

The PiDP-11 was certainly on that list, along with several other things I'd been wanting to build, experiment with, or learn more about.

Of course, having more time doesn't necessarily mean having fewer projects competing for it. The PiDP-11 continued to wait patiently while I occupied myself with other ideas and of course, checking off "honey-do" list items for my honey!

It wouldn't be until November that I finally got serious about putting it together.

## November: The software got there first

By November, the PiDP-11 kit had been sitting in the back of my mind long enough. It was time to get it off the shelf and onto the workbench.

But there was another idea I'd been kicking around.

I had previously seen The High Nibble's [IMSAI 8080 replica](https://thehighnibble.com/imsai8080/), and I remembered that it offered a rather clever browser-based desktop for interacting with the machine. Instead of being limited to a conventional terminal connection, you could open a browser and interact with virtual equipment in a desktop-like environment.

That got me thinking: **Why couldn't we do something similar for the PiDP-11?**

I began preparing the Raspberry Pi, exploring Oscar's software, and experimenting with what would eventually become our own **PiDP-11 Web Desktop**.

As often happens when I start experimenting with something interesting, one idea led to another. What began as a virtual front-panel prototype gradually turned into a collection of terminal windows, disk and tape interfaces, a continuous-form printer, and other pieces of vintage computing equipment.

The really exciting moment came when we moved beyond simulated terminals and managed to connect a browser terminal to a **genuine UNIX Version 7 operating system running under SIMH**.

That was a pretty satisfying milestone. We weren't simply displaying a mock terminal anymore. Commands entered into the browser were actually being processed by a PDP-11 operating system.

Meanwhile, I was also assembling the physical kit, soldering components, testing LEDs and switches, and getting acquainted with the hardware.

By November 19, the physical PiDP-11/70 was assembled and running. I had successfully booted RT-11 using the front-panel switch register and was exploring the operating system through its original console.

I also introduced myself and the project to the [PiDP-11 Google Group](https://groups.google.com/g/pidp-11/c/2LzVyxvgLHI), sharing screenshots of both the assembled machine and our browser-based UNIX V7 terminal.

We now had two things working independently: the physical PiDP-11 and the Web Desktop. The next challenge was making them work together reliably.

<h3 id="hardware-detour" style="scroll-margin-top:6rem">A little hardware detour</h3>

Of course, it wouldn't be a proper electronics project without running into a few unexpected problems!

While testing how the Web Desktop could coexist with the physical front panel, we discovered that switch **SR0**, the lowest bit of the switch register, was constantly registering as ON, regardless of its physical position.

This was particularly troublesome because the PiDP-11 uses those switches to select which operating system to start. With every switch DOWN, the machine should select its default IDLED program. Instead, it was selecting RSX-11M-PLUS.

That led to quite a bit of troubleshooting.

We tested the original switch-scanning software, compared readings through SIMH and REALCONS, and even used the physical ADDRESS lamps to confirm what the emulator was seeing. The results were consistent: SR0 remained asserted, while neighboring switches behaved normally.

Eventually, I broke out the multimeter and started tracing the problem directly on the PCB.

After a considerable amount of testing, I desoldered SR0 and removed it from the board. Testing the switch independently revealed abnormal contact behavior, making the switch itself the leading suspect.

Unfortunately, getting one of those little purple toggle switches out of a fully soldered PCB proved to be considerably more challenging than I'd anticipated. In the process, I also managed to melt part of the housing on the neighboring white momentary switch.

Oops. Another lesson learned!

I've since emailed Oscar to ask about obtaining replacement switches.

So, for the moment, the PiDP-11 is back in pieces on my workbench, awaiting a little hardware surgery.

Fortunately, the Web Desktop doesn't require the physical kit to be assembled. Development continues on my Mac, using isolated environments running genuine PDP-11 operating systems.

The software isn't going to sit around waiting for a purple toggle switch!

<h2 id="software-progress" style="scroll-margin-top:6rem">November 21: The software keeps moving</h2>

While the kit waits for replacement switches, the Mac laboratory has become a rather busy little equipment room. Genuine UNIX V7 sessions now sit alongside Tektronix graphics, and 2.11BSD has been through full-screen `vi` and `more` checks. VT100, initial VT52 and VT220 behavior, and a teletype presentation have all had practical guest tests. That does not make every terminal feature complete, but it is quite a step beyond drawing a convincing window.

The printer and paper tape have moved forward too. I can observe genuine LP11 and PC11 activity from programs running on an emulated PDP-11. Those device tests use a separate simulator from the V7 text and graphics session. I am not yet claiming that V7 is driving the printer through its own operating-system driver. The [equipment report](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.9.2.md) and [gallery](/projects/pidp-11/gallery) show the distinction.

The optional tutor now offers an offline historical reference desk, exact local calculations and actual conversations with a local model. Phase C also demonstrated Rolf’s Hacker Replicant talking through the model gateway in an isolated lab, with its tools off and a small compatibility layer in between. Selected-text readback was tested separately with synthetic text; it was not a live guest-sharing demonstration in Rolf’s interface.

The [Phase C report](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.9.3-C.md) records that earlier step. The next round has now finished too.

<h3 id="phase-d" style="scroll-margin-top:6rem">Phase D: A better reference desk, with limits</h3>

One of my favorite additions is also one of the simplest: I can ask for an established fact and get a source-backed statement without asking a language model to compose an answer. The source names its edition and section. The exact calculator works the same way it did before, independently of the model. Octal is quite confusing enough without an assistant inventing the arithmetic!

The historical notes now include some carefully scoped RSTS/E and RSX commands. That is useful reference material, not evidence that those operating systems have been connected to my browser terminal. There are still gaps, including the matching RT-11 V5.3 manual.

The model has improved in some of the questions we tested, but it still made mistakes about MOVB and arithmetic. The claim checker recognizes a few more fragments; it does not certify a whole answer, and it missed those two errors in the fresh responses. I would rather know where the limits are than have a reassuring badge that promises too much.

There is now an optional read-only integration with an explicitly modified copy of Rolf’s Hacker Replicant. It opens separately, asks for its own sign-in and lets me approve a pasted excerpt for a particular question. The laboratory tests used genuine model replies and clearly labeled synthetic text, with machine controls unavailable and machine state shown as unknown. Nothing in that demonstration read a live guest terminal.

That is progress I can build on. The next step is independent historical and security review, followed by tests that tie a shared excerpt to a genuinely supervised guest session. For now, the adapter relies on identity supplied by the operator; it cannot prove which guest is running. The [architecture page](/projects/pidp-11/architecture#independent-companion) explains how those pieces stay separate. My physical kit is still waiting for its hardware repair.

<h3 id="m510" style="scroll-margin-top:6rem">M5.10: Bringing the pictures up to date</h3>

The software had rather overtaken its own photographs. M5.10 catches the screenshots and documentation up with the tested Phase D runtime, rather than turning it into a different machine. The [new gallery](/projects/pidp-11/gallery) shows a real BSD editing session, genuine V7 graphics and printer output from an emulated PDP-11 CPU program. The equipment-room picture has completed device observations below the V7 windows; the separate printer capture shows the earlier, still-growing output.

I have kept the Phase D reference-desk and model captures at their original dates. Rolf’s independently authored Hacker Replicant gets its own clearly labeled example of our modified, read-only laboratory integration. An actual model reply is still an experiment, and synthetic shared text is still synthetic. A nicer set of pictures does not change either of those things.

The documentation now separates the local demo, guest connections and candidate Pi installation more clearly. The alpha package has been prepared locally and the source is published; that is not a hosted binary release or an accepted installation on my kit. The hardware repair, memory setup and renewed coexistence checks are still ahead of me. The [M5.10 report](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.10.md) and [alpha-readiness notes](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/releases/alpha-readiness.md) record the evidence and remaining work.

<h2 id="source-alpha" style="scroll-margin-top:6rem">November 22: The first public source alpha</h2>

Today I published [v0.5.13-source-alpha.1](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.13-source-alpha.1), the first public experimental source alpha of PiDP-11 Web Desktop. That feels like a milestone worth recording. The physical machine is still on my workbench awaiting replacement switches, but the software is ready for other curious people to try within its stated limits.

This is source only, for local browser demonstrations and controlled laboratories—not an approved installer for physical PiDP-11 hardware. The [source-alpha quick start](https://github.com/cdaters/pidp11-webdesktop/blob/1929d99fb3a140f19c40d26d7a4a069de58fae18/docs/getting-started/source-alpha.md) begins with a simulated desktop on your own computer; connecting a genuine historical guest is a separate laboratory exercise. External security review and reliable guest identity verification are still ahead, and physical integration has not been accepted.

For the current alpha's capabilities and remaining limits, follow the release notes. There is plenty left to do, but it is nice to have something I can finally point people to!

<h2 id="source-alpha-2" style="scroll-margin-top:6rem">November 22: Source Alpha 2 is out!</h2>

I've now published [Source Alpha 2](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.17-source-alpha.2). The first alpha got the software out into the world; this one brings together several more rounds of improvements. Setup and provisioning are more dependable, approved text sharing and cancellation have received more attention, and the diagnostics give me a better chance of finding out what went wrong. A little less guesswork is always welcome!

Laboratory testing has continued with genuine UNIX V7 and 2.11BSD sessions, RSX-11M-PLUS browser terminals, and experimental RT-11 application terminals. That last one means application input and output, not an independent RT-11 browser command shell. The original ARM64 setup failures and plotting timeout still need answers; the new release does not make those concerns disappear.

This is still experimental source software for local browser demonstrations and controlled laboratories. The [Alpha 2 quick start](https://github.com/cdaters/pidp11-webdesktop/blob/7753caa7327e2dca60c44900e19d525c0ede9044/docs/getting-started/source-alpha-2.md) is the place to begin, and the release notes carry the detailed results and remaining limits. My PiDP-11 is still waiting for replacement switches on the workbench, and the Web Desktop has not been accepted for installation on it. The software is getting ahead of the soldering iron again.

With the second alpha out, I want to return to the idea that started this: a whole virtual computer room. The terminals need to be pleasant to use, and the equipment around them should gradually do real work with the emulated machine. That became the brief for M5.19: make the direction explicit and put actual terminal usability first. The completed development work now has its own entry below.

<h2 id="m519" style="scroll-margin-top:6rem">November 22: Making the terminal a place to work</h2>

M5.19 is now complete on the development branch. [Source Alpha 2](https://github.com/cdaters/pidp11-webdesktop/releases/tag/v0.5.17-source-alpha.2) remains the latest public source release; its download is unchanged and does **not** include these newer improvements. This is another step in the workshop, not another release announcement.

I wanted the genuine terminal to be somewhere I could comfortably spend an afternoon. I can now search retained output, move to the previous or next match, select and copy text, and return to the latest output. Phosphor, brightness, text size, cursor, scanlines and glow each have a preference. The optional browser bell responds to received BEL characters, starts muted and needs an explicit user gesture before it can sound. It is a synthesized tone, not a recording of a mechanical terminal.

The keyboard has received attention too: VT52 keypad behavior, VT100 identification replies and VT220 function keys sit alongside on-screen Esc, LF, PF and keypad controls. Connection information now makes keyboard authority, observer status and changes of connection generation easier to follow. That record still relies on operator-attested guest identity; it does not prove which operating system is running.

These checks used genuine guest traffic. UNIX V7 ran shell commands and `hangman`; 2.11BSD exercised `vi` and `more`; RSX-11M-PLUS went through EDT editing, saving and PIP read-back. RT-11 remains a narrower result: application input/output and AST input tests, not an independent browser command shell or a full diagnostic pass.

One visible limitation deserves its own sentence: **BSD `robots` needed an initial Ctrl-L redraw in all three tested browser engines to restore the complete board.** That is useful evidence, but it is not an unqualified full-screen compatibility pass. The [M5.19 engineering report](https://github.com/cdaters/pidp11-webdesktop/blob/0451e51f0fe14e2df60bf06a07fb72be164d3caf/docs/lab/M5.19.md) records the individual tests and remaining questions.

None of this round accessed the physical PiDP-11, SSH or GPIO. My kit is still waiting for replacement switches. Independent security review, reliable guest identity verification and physical integration acceptance remain unfinished; simulated equipment is still simulated.

Next I want genuine printer output, paper-tape reader input and punch output driven by guest workflows, using disposable media and bytes we can verify. The [computer-room roadmap](https://github.com/cdaters/pidp11-webdesktop/blob/0451e51f0fe14e2df60bf06a07fb72be164d3caf/docs/product/virtual-computer-room.md) keeps the wider room in view. And the browser remains optional: physical switches, the original console, SSH, Screen, appropriate serial access and independently operated SIMH must remain usable without it.

<h2 id="m520-m529" style="scroll-margin-top:6rem">November 24: Peripherals, communications and an isolated network</h2>

The terminal work led into genuine RSX and RT-11 printer and paper-tape workflows, retained job history and captured disk/tape observations. V7 then completed serial and bounded local-modem text exchanges with an independent peer. In M5.28, 2.11BSD sent genuine ARP, ping and TCP traffic through a separately built original-source SIMH and DEUNA interface, entirely inside an isolated laboratory. No traffic was routed to the Internet or my real LAN, and none of this work accessed the physical Pi.

These are specific tested paths, not universal peripheral support. Ordinary storage views remain snapshots; the separate passive TM11 activity experiment is not a production feature. Ethernet has retained packet evidence, not a live browser control panel. [M5.28 report](https://github.com/cdaters/pidp11-webdesktop/blob/b7b485f129d2b689c9f78a95df099f29024f198b/docs/lab/M5.28.md) and [current capability matrix](https://github.com/cdaters/pidp11-webdesktop/blob/main/docs/capabilities.md).

M5.29 is catching the documentation and real screenshots up and qualifying an exact **Source Alpha 3 candidate for owner review**. It has not published another release. Source Alpha 2 remains the public download; hardware repair, memory protection, guest identity and independent review remain separate gates. The earlier dated entries below and above keep their original milestone context.

## What I want the finished experience to feel like

The goal isn't to replace the traditional PiDP-11 experience. Quite the opposite.

I want to be able to turn on the PiDP-11, use its original switches and controls, select an operating system, and interact with it just as someone would have decades ago.

But I'd also like the freedom to open a browser on my Mac, a Linux or Windows computer, or even a tablet, and have an entire virtual computing workbench available.

Open a VT100 terminal and explore UNIX V7. Bring up a teletype. Watch a line printer produce a listing. Experiment with disks, tapes, graphics terminals, and the other equipment that made these machines interesting.

And when I'm finished, I should be able to close the browser without interrupting the PDP-11 itself.

The physical machine, its original console, SSH access, and conventional terminal connections should all remain independently usable. The Web Desktop is simply another way to enjoy the experience.

And I want someone running ordinary SIMH, without a physical PiDP-11 at all, to be able to enjoy that same room eventually. The replica is what brought me here; owning one should not be a requirement for exploring the software.

I'd also like it to be approachable. Someone shouldn't need to read an engineering report just to understand how to open a terminal or which virtual devices are genuinely connected to the emulator.

There should be enough explanation to get started, but plenty of room to explore and learn along the way.

<h2 id="road-ahead" style="scroll-margin-top:6rem">The road ahead</h2>

**Make the basics dependable.** Finish repairing the physical switch register, repeat the coexistence tests, and get the optional Web Desktop service installed and running reliably on the Raspberry Pi. Then work toward an installation process that other PiDP-11 owners can actually follow.

**Make the terminals feel authentic.** Build on the tested VT100, initial VT52/VT220 and teletype behavior, and the genuine V7 Tektronix plotting already demonstrated. I want these to behave like their historical counterparts, not simply look the part.

**Explore more operating systems.** UNIX V7, tested 2.11BSD applications and RSX-11M-PLUS now have laboratory browser-terminal results. RT-11 testing covers application input and output, not an independent browser command shell. RSTS/E and broader terminal support still need their own checks; booting a system through the original console does not establish a browser connection.

**Put the peripherals to work.** Build on the qualified RSX/RT-11 printer and paper-tape subsets, captured storage and V7 communications. Wider driver coverage, live storage activity and safe media handling still need their own evidence. The browser must remain optional and must not gain authority by displaying a device.

**Make the optional tutor more dependable.** Keep source-backed facts and exact calculations easy to reach, and get independent review of the generated explanations and their limited checks. Rolf Peters’ [Hacker Replicant](https://github.com/rolfpeters-droid/pidp11-hacker-replicant) remains a separate project. The modified read-only integration has now shared genuine V7 text in a supervised laboratory; reliable guest identity, production qualification and any upstream design agreement remain separate steps.

**Make it accessible to other enthusiasts.** Keep the [local demo and installation paths](https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/getting-started/installation-paths.md) clear. The browser demonstration can be tried without the physical kit. The ARM64 companion package is still a laboratory candidate, and the fresh-card Trixie guide has not had a complete replay. Physical repair and the Pi’s memory-controller prerequisite remain outstanding.

These are directions I want to explore, not promised features or release dates. Half the fun of a project like this is discovering where it takes you.

<details>
<summary>For the technically curious: what the early tests established</summary>

<p>On November 16, M3 validated interoperability with the original generated C RPC interfaces over UDP and TCP, including rpcbind discovery, panel descriptors, switches and lamps. The original REALCONS controller exercised START, HALT, CONT, LOAD ADRS, EXAM, DEP and selector behavior. M4 then explored coexistence and exposed a delayed START-release safety limitation. Neither test contacted the physical Raspberry Pi.</p>

<p>Later experiments demonstrated genuine UNIX V7 browser terminals running on the actual Pi, including successful coexistence with the original physical front panel and conventional console. A subsequent boot-selection test unexpectedly started RSX-11M-PLUS instead of the expected IDLED program. The original media survived unchanged, but overall physical integration acceptance remained blocked.</p>

<p>Follow-up diagnostics reproduced an SR0 signal that remained asserted regardless of switch position. Both the standalone scanner and the original REALCONS/front-panel path reported the same behavior. Independent electrical testing after removing the switch revealed abnormal contact behavior. Physical repair and renewed coexistence testing remain outstanding.</p>

<p>For the complete technical history, see the <a href="https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/timeline.md">development timeline</a>, <a href="https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M3.md">M3 report</a>, <a href="https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M4.md">M4 report</a>, <a href="https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.5-physical-pilot.md">physical-pilot findings</a>, and <a href="https://github.com/cdaters/pidp11-webdesktop/blob/05d23c6890ed22825f8815bcdb294cd3702852cb/docs/lab/M5.7.2.md">ADDRESS-lamp comparison</a>.</p>
</details>

## Back to the workbench

The [project story](/projects/pidp-11) explains why I started down this particular rabbit hole, the [architecture](/projects/pidp-11/architecture) describes how the pieces fit together, and the [gallery](/projects/pidp-11/gallery) shows what we've built so far.

For the latest developments, source code, documentation and experiments, visit the [PiDP-11 Web Desktop repository](https://github.com/cdaters/pidp11-webdesktop).
