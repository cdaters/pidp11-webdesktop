/** RAM-only peripheral prototypes. No host paths, RPC, network or guest disk access. */
export interface ImageEntry {
  id: string;
  name: string;
  family: "RK05" | "RL02" | "TU10";
  bytes: number;
  description: string;
}
export const imageLibrary: readonly ImageEntry[] = [
  {
    id: "unix-demo",
    name: "UNIX V6 · demonstration pack",
    family: "RK05",
    bytes: 2494464,
    description: "Illustrative profile. No licensed OS image is included.",
  },
  {
    id: "rt-demo",
    name: "RT-11 · demonstration pack",
    family: "RL02",
    bytes: 10485760,
    description: "Catalog metadata only; guest configuration unvalidated.",
  },
  {
    id: "rsx-demo",
    name: "RSX-11M+ · demonstration pack",
    family: "RL02",
    bytes: 10485760,
    description: "Future multiuser profile; no system is booted.",
  },
  {
    id: "tape-demo",
    name: "Operator archive · sample tape",
    family: "TU10",
    bytes: 4096,
    description: "Synthetic tape metadata; no SIMH tape image.",
  },
];
export interface Drive {
  id: string;
  family: ImageEntry["family"];
  mounted: string | null;
  readOnly: boolean;
  position: number;
}
export interface PrintJob {
  id: number;
  name: string;
  text: string;
  state: "queued" | "printed";
}
export class VirtualDevices {
  drives: Drive[] = [
    {
      id: "RK0",
      family: "RK05",
      mounted: "unix-demo",
      readOnly: true,
      position: 0,
    },
    { id: "RL0", family: "RL02", mounted: null, readOnly: true, position: 0 },
    { id: "MT0", family: "TU10", mounted: null, readOnly: true, position: 0 },
  ];
  running = false;
  profile = "None";
  jobs: PrintJob[] = [];
  paper = new Uint8Array();
  punched = new Uint8Array();
  logs: string[] = ["Local simulation initialized. No guest media is open."];
  private nextJob = 1;
  private log(s: string) {
    this.logs.push(s);
    this.logs = this.logs.slice(-100);
  }
  mount(id: string, image: string) {
    if (this.running)
      throw Error("Stop the simulated session before changing media.");
    const d = this.drives.find((d) => d.id === id),
      i = imageLibrary.find((i) => i.id === image);
    if (!d || !i || d.family !== i.family)
      throw Error("Image and controller are incompatible.");
    if (d.mounted) throw Error("Eject the existing pack first.");
    d.mounted = image;
    d.position = 0;
    this.log(`${id}: ${i.name} mounted in simulation.`);
  }
  eject(id: string) {
    if (this.running)
      throw Error("Stop the simulated session before ejecting media.");
    const d = this.drive(id);
    d.mounted = null;
    d.position = 0;
    this.log(`${id}: ejected.`);
  }
  protect(id: string) {
    if (this.running)
      throw Error(
        "Stop the simulated session before changing write protection.",
      );
    const d = this.drive(id);
    d.readOnly = !d.readOnly;
    this.log(
      `${id}: ${d.readOnly ? "write protected" : "writable (simulation only)"}.`,
    );
  }
  tape(action: "advance" | "rewind") {
    const d = this.drive("MT0");
    if (!d.mounted) throw Error("Mount a demonstration tape first.");
    d.position = action === "rewind" ? 0 : Math.min(100, d.position + 10);
    this.log(`MT0: block ${d.position} (synthetic).`);
  }
  boot(profile: string) {
    if (this.running) throw Error("Stop the current simulated session first.");
    if (!["UNIX V6", "RT-11", "RSX-11M+"].includes(profile))
      throw Error("Unknown profile.");
    const family = profile === "UNIX V6" ? "RK05" : "RL02";
    if (!this.drives.some((d) => d.family === family && d.mounted))
      throw Error(`Mount a ${family} demonstration pack first.`);
    this.running = true;
    this.profile = profile;
    this.log(`${profile}: simulated session started; no guest OS is running.`);
  }
  stop() {
    this.running = false;
    this.log("Simulated session stopped. No guest shutdown command sent.");
  }
  queue(name: string, text: string) {
    if (this.jobs.length >= 32) throw Error("Print queue full (32 jobs).");
    if (text.length > 16384) throw Error("Print job exceeds 16 KiB.");
    this.jobs.push({
      id: this.nextJob++,
      name: name.slice(0, 80),
      text,
      state: "queued",
    });
    this.log(`LP0: queued ${name}.`);
  }
  print() {
    for (const job of this.jobs) job.state = "printed";
    this.log("LP0: queue rendered to local spool.");
  }
  clear() {
    this.jobs = [];
    this.log("LP0: local queue cleared.");
  }
  spool() {
    return this.jobs
      .filter((j) => j.state === "printed")
      .map((j) => `--- ${j.name} ---\n${j.text}`)
      .join("\n\f\n");
  }
  loadPaper(bytes: Uint8Array) {
    if (bytes.byteLength > 8192)
      throw Error("Paper-tape prototype limit: 8 KiB.");
    this.paper = bytes.slice();
    this.log(`PTR: ${bytes.length} local bytes loaded.`);
  }
  punch(text: string) {
    const b = new TextEncoder().encode(text);
    if (b.length > 8192) throw Error("Paper-tape prototype limit: 8 KiB.");
    this.punched = b;
    this.log(`PTP: ${b.length} bytes punched locally.`);
  }
  drive(id: string) {
    const d = this.drives.find((d) => d.id === id);
    if (!d) throw Error("Unknown device.");
    return d;
  }
}
export class MockTerminalSession {
  readonly id: string;
  private owned = false;
  inputEpoch = 0;
  get inputOwner() { return this.owned; }
  set inputOwner(value: boolean) { if (value !== this.owned) this.inputEpoch++; this.owned = value; }
  history: string[] = [];
  profile = "VT100 / ANSI";
  constructor(id: string) {
    this.id = id;
  }
  command(line: string) {
    if (!this.inputOwner)
      return "READ ONLY: acquire this terminal keyboard first.";
    line = line.slice(0, 256);
    this.history.push(line);
    this.history = this.history.slice(-50);
    const cmd = line.trim().toUpperCase();
    if (cmd === "HELP")
      return "HELP  DIRECTORY  TYPE README  SHOW USERS  ANSI  CLEAR\r\nLocal terminal fixture. No shell, guest OS or panel commands.";
    if (cmd === "DIRECTORY" || cmd === "DIR")
      return "SY:[DEMO]\r\n README.TXT       1 block\r\n HELLO.MAC        2 blocks\r\nTotal 2 synthetic files.";
    if (cmd === "TYPE README")
      return `Welcome to ${this.id}. This independent session is a local fixture.\r\nPanel control and terminal keyboard ownership are separate.`;
    if (cmd === "SHOW USERS")
      return `${this.id}    DEMO       Independent keyboard lease`;
    if (cmd === "ANSI")
      return "\x1b[1mDEC terminal rendering\x1b[0m\r\n\x1b[32mGreen\x1b[0m  \x1b[33mAmber\x1b[0m  normal\r\nBox: ┌──────────┐\r\n     │ PDP-11   │\r\n     └──────────┘";
    if (cmd === "CLEAR") return "\x1b[2J\x1b[H";
    return cmd
      ? `? Unknown fixture command: ${line}\r\nType HELP. Commands never reach the panel or host.`
      : "";
  }
}
