import { PrinterApp } from "./printer-app.ts";
import { APP_MILESTONE } from "./version.ts";
import {
  SimulatedPanelAdapter,
  octal,
  type Command,
  type PanelAdapter,
} from "./model.ts";
import { panelMarkup, bindPanel, renderPanel, displayedData } from "./panel.ts";
import { RemotePanelAdapter } from "./remote.ts";
import { ObservedPanelAdapter } from "./observed.ts";
import { WindowManager } from "./windows.ts";
import {
  VirtualDevices,
  MockTerminalSession,
  imageLibrary,
} from "./devices.ts";
import logo from "./assets/digital-logo-offWht.svg?url";
import redLogo from "./assets/digital-logo-red.svg?url";

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const icons: Record<string, string> = {
  panel:
    '<rect x="2" y="5" width="28" height="19" rx="2"/><path d="M6 10h20M6 15h20M6 20h2m4 0h2m4 0h2m4 0h2"/>',
  terminal:
    '<rect x="2" y="3" width="28" height="22" rx="2"/><path d="m7 9 4 4-4 4m8 0h7M10 29h12"/>',
  disks:
    '<rect x="5" y="2" width="22" height="28" rx="2"/><path d="M5 9h22M5 22h22"/><circle cx="16" cy="16" r="4"/>',
  tapes:
    '<circle cx="9" cy="12" r="7"/><circle cx="24" cy="12" r="7"/><circle cx="9" cy="12" r="2"/><circle cx="24" cy="12" r="2"/><path d="M3 25h26M9 19v5m15-5v5"/>',
  paper:
    '<path d="M7 2h19v28H7zM11 7h2m5 0h4m-11 5h2m5 0h4m-11 5h2m5 0h4m-11 5h2m5 0h4"/>',
  printer: '<path d="M8 11V2h16v9M8 25H3V11h26v14h-5M8 20h16v10H8zM7 15h3"/>',
  systems: '<path d="M3 7h10l3-4h13v25H3zM3 12h26M10 18h12m-12 5h8"/>',
  sessions:
    '<rect x="2" y="4" width="20" height="16"/><path d="M9 24h21V10M12 28h12M8 24v-4"/>',
  diagnostics: '<path d="M2 27h28M5 22V12h5v10m6 0V3h5v19m5 0v-7h4v7"/>',
  about: '<circle cx="16" cy="16" r="13"/><path d="M16 14v10m0-17v3"/>',
};
const icon = (id: string) =>
  `<svg viewBox="0 0 32 32" aria-hidden="true">${icons[id] ?? icons.terminal}</svg>`;
const apps = [
  ["panel", "Front panel", "PDP-11/70"],
  ["terminal", "Terminal", "Independent mock session"],
  ["guest", "Guest terminal", "Authenticated real guest line · laboratory"],
  ["disks", "Disk drives", "RK05 / RL02"],
  ["tapes", "Magnetic tape", "TU10 transport"],
  ["paper", "Paper tape", "Reader & punch"],
  ["printer", "Line printer", "LP0 spool"],
  ["systems", "Systems", "Operating-system library"],
  ["sessions", "Terminals", "Lines & keyboards"],
  ["diagnostics", "Diagnostics", "State & connection"],
  ["about", "About", "References & shortcuts"],
];
const root = document.querySelector<HTMLDivElement>("#app")!;
root.innerHTML = `<header class="desktop-top"><img src="${logo}" class="digital-brand" alt="DIGITAL"><span class="desktop-name">PiDP-11 <b>Web Desktop</b></span><span class="top-source" id="source-badge">LOCAL SIMULATION</span><button id="arrange-workspace">Arrange terminals</button><button id="reset-layout" title="Reset saved window geometry">Reset layout</button><time id="clock"></time></header><div class="desktop-layout"><nav class="launcher" aria-label="Applications">${apps.map(([id, name, desc]) => `<button data-app="${id}" title="${desc}" aria-label="Open ${name}">${icon(id)}<span>${name}</span></button>`).join("")}</nav><main id="desktop" aria-label="PiDP-11 desktop workspace"><div class="wallpaper" aria-hidden="true"><span>pdp11/70</span><small>THE COMPUTER IS STILL THE COMPUTER.</small></div></main></div><footer class="taskbar"><span class="taskbar-label">WORKSPACE</span><div id="tasks" aria-label="Open windows"></div><span class="local-label">${APP_MILESTONE} · LOCAL LAB</span></footer><div id="toast" role="status" aria-live="polite"></div>`;
const $ = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const manager = new WindowManager($("desktop"), $("tasks"));
const devices = new VirtualDevices();
const terminals = new Map<string, MockTerminalSession>();
let panelEl: HTMLElement | undefined;
let remote: RemotePanelAdapter | undefined;
const mode = new URLSearchParams(location.search).get("backend");
const observeMode = mode === "observe";
let observed: ObservedPanelAdapter | undefined;
const remoteMode = mode === "mock";
let owns = !remoteMode && !observeMode,
  connected = !remoteMode && !observeMode,
  connectionText = remoteMode
    ? "Connecting to local mock backend…"
    : "Browser simulation · no emulator connection";
const adapter: PanelAdapter = observeMode
  ? (observed = new ObservedPanelAdapter((message) => {
      connectionText = message;
      connected = !!observed?.fresh;
      updatePanel();
    }))
  : remoteMode
    ? (remote = new RemotePanelAdapter((status) => {
        owns = status.owns;
        connected = status.connected;
        connectionText = status.message;
        updatePanel();
      }))
    : new SimulatedPanelAdapter();
let current = adapter.snapshot();
function notify(message: string, error = false) {
  const el = $("toast");
  el.textContent = message;
  el.classList.toggle("error", error);
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 5000);
}
let toastTimer: ReturnType<typeof setTimeout>;
const body = (html: string) => {
  const el = document.createElement("div");
  el.innerHTML = html;
  return el;
};
function safe(action: () => void) {
  try {
    action();
    refreshApps();
  } catch (e) {
    notify((e as Error).message, true);
  }
}
function download(name: string, data: string | Uint8Array) {
  const blob = new Blob(
    [typeof data === "string" ? data : new Uint8Array(data)],
    {
      type:
        typeof data === "string"
          ? "text/plain;charset=utf-8"
          : "application/octet-stream",
    },
  );
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function dispatch(command: Command) {
  if (!owns) {
    notify(
      "This panel is read-only. Acquire control on the mock connection first.",
      true,
    );
    return;
  }
  const result = await adapter.dispatch(command);
  notify(result.message, !result.accepted);
  updatePanel();
}
function updatePanel() {
  if (!panelEl) return;
  renderPanel(panelEl, current);
  panelEl.classList.toggle("read-only", !owns);
  panelEl
    .querySelectorAll<HTMLElement>("[data-bit],[data-action]")
    .forEach((el) => {
      el.setAttribute("aria-disabled", String(!owns));
      if (el.dataset.bit !== undefined)
        el.setAttribute(
          "aria-checked",
          String(
            Boolean(current.switchRegister & (1 << Number(el.dataset.bit))),
          ),
        );
    });
  const local = current.source === "simulation";
  const label = observeMode
    ? observed?.fresh
      ? "OBSERVED · READ ONLY"
      : observed?.available
        ? "STALE OBSERVATION"
        : "OBSERVATION UNAVAILABLE"
    : local
      ? "SIMULATED PANEL"
      : "ISOLATED REALCONS";
  $("source-badge").textContent = label;
  $("panel-source").textContent = label;
  $("panel-connection").textContent = connectionText;
  $("run-state").textContent = !connected
    ? "DISCONNECTED"
    : current.running
      ? "RUN"
      : current.halted
        ? "HALT"
        : "STOPPED / ENABLE";
  $("address-value").textContent = octal(current.address);
  $("data-value").textContent = octal(displayedData(current), 6);
  $("sr-value").textContent = octal(current.switchRegister);
  if (observeMode && !observed?.available) {
    for (const id of ["address-value", "data-value", "sr-value"])
      $(id).textContent = "—";
    panelEl.classList.add("unavailable");
  } else panelEl.classList.remove("unavailable");
  $("panel-owner").textContent = owns
    ? "This browser has panel control"
    : "Read-only observer";
  for (const name of ["address", "data"] as const) {
    const select = panelEl.querySelector<HTMLSelectElement>(`#${name}-select`);
    if (select) {
      select.value = String(
        name === "address" ? current.addressSelect : current.dataSelect,
      );
      select.disabled = !owns;
    }
  }
  const acquire = panelEl.querySelector<HTMLButtonElement>("#acquire");
  if (acquire) acquire.disabled = !connected || owns;
  const release = panelEl.querySelector<HTMLButtonElement>("#release");
  if (release) release.disabled = !owns;
}
function openPanel() {
  if (manager.store.windows.some((w) => w.id === "panel")) {
    manager.restore("panel");
    return;
  }
  panelEl = body(
    `<div class="panel-toolbar"><span class="source-tag" id="panel-source">SIMULATED PANEL</span><span id="run-state"></span><button id="panel-mode">Full panel</button><button id="panel-compact">Compact</button><label class="panel-zoom-label">Scale <select id="panel-zoom" aria-label="Panel zoom"><option value="fit">Fit</option><option value="600">50%</option><option value="900">75%</option><option value="1200">Reference 100%</option><option value="1500">125%</option><option value="1800">150%</option><option value="2400">200%</option></select></label>${observeMode ? '<button id="observe-login">Sign in to observe</button><button id="observe-logout">Sign out</button>' : ""}${remoteMode ? '<button id="acquire">Acquire panel</button><button id="release">Release</button>' : ""}</div><div class="panel-viewport">${panelMarkup()}</div><div class="panel-readouts"><span>ADDRESS <output id="address-value"></output></span><span>DATA <output id="data-value"></output></span><span>SWITCH REGISTER <output id="sr-value"></output></span></div><div class="panel-options"><label>Address<select id="address-select"><option value="0">USER I</option><option value="1">USER D</option><option value="2">SUPER I</option><option value="3">SUPER D</option><option value="4">CONS PHY</option><option value="5">KERNEL I</option><option value="6">KERNEL D</option><option value="7">PROG PHY</option></select></label><label>Data<select id="data-select"><option value="0">µADRS FPP / CPU</option><option value="1">DISPLAY REGISTER</option><option value="2">DATA PATHS</option><option value="3">BUS REG</option></select></label><form id="register-form"><label>SR octal<input id="register-input" value="00001000" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="Octal switch register"></label><button>Set</button></form></div><details class="touch-controls"><summary>Touch / accessible controls</summary><div class="touch-bits">${Array.from(
      { length: 22 },
      (_, i) => 21 - i,
    )
      .map(
        (bit) =>
          `<button role="switch" aria-checked="false" aria-label="Touch switch register bit ${bit}" data-bit="${bit}">${bit}</button>`,
      )
      .join("")}</div><div class="touch-actions">${[
      ["halt", "HALT / ENABLE"],
      ["load", "LOAD ADRS"],
      ["examine", "EXAM"],
      ["deposit", "DEP"],
      ["continue", "CONT"],
      ["start", "START"],
      ["bus-cycle", "S INST / BUS"],
      ["lamp-test", "LAMP TEST"],
    ]
      .map(
        ([action, label]) =>
          `<button data-action="${action}">${label}</button>`,
      )
      .join(
        "",
      )}</div></details><div class="panel-foot"><span id="panel-owner"></span><span id="panel-connection"></span></div>`,
  );
  panelEl.classList.add("panel-app");
  const node = panelEl;
  manager.open(
    "panel",
    "PDP-11/70 · front panel",
    node,
    { x: 26, y: 22, width: 1050, height: 690 },
    () => {
      panelEl = undefined;
    },
  );
  bindPanel(node, dispatch);
  $("panel-mode").onclick = () => {
    node.classList.toggle("authentic-mode");
    $("panel-mode").textContent = node.classList.contains("authentic-mode")
      ? "Desktop panel"
      : "Full panel";
    manager.toggleMax("panel");
  };
  $("panel-zoom").onchange = () => {
    const value = $<HTMLSelectElement>("panel-zoom").value;
    node.classList.toggle("fixed-scale", value !== "fit");
    node.querySelector<SVGSVGElement>(".front-panel")!.style.width = value === "fit" ? "" : `${value}px`;
  };
  $("panel-compact").onclick = () => {
    node.classList.remove("authentic-mode");
    $("panel-mode").textContent = "Full panel";
    manager.place("panel", { x: 10, y: 10, width: 760, height: 550 });
  };
  $("register-form").onsubmit = (e) => {
    e.preventDefault();
    const v = $<HTMLInputElement>("register-input").value;
    if (!/^[0-7]{1,8}$/.test(v)) return notify("Enter octal digits 0–7.", true);
    void dispatch({ type: "register", value: parseInt(v, 8) });
  };
  for (const name of ["address", "data"] as const)
    $(`${name}-select`).onchange = (e) =>
      void dispatch({
        type: `${name}-select`,
        value: Number((e.target as HTMLSelectElement).value),
      });
  if (observeMode) {
    $("observe-logout").onclick = () => void observed!.logout().catch((e) => notify(String(e), true));
    $("observe-login").onclick = () => {
      if (manager.store.windows.some((w) => w.id === "login")) {
        manager.restore("login");
        return;
      }
      if (manager.store.windows.length >= 14) {
        notify("Close a window before signing in.");
        return;
      }
      const form = body(
        '<h2>Observe the isolated lab</h2><p>Read-only capability. Enter a locally provisioned observation token.</p><form><label>Observation token<input type="password" autocomplete="off" aria-label="Observation token"></label><button>Sign in</button><p role="status"></p></form>',
      );
      form.classList.add("utility-app");
      manager.open("login", "Observation sign-in", form, {
        x: 100,
        y: 70,
        width: 420,
        height: 250,
      });
      form.querySelector("form")!.onsubmit = async (e) => {
        e.preventDefault();
        const input = form.querySelector("input")!;
        const token = input.value;
        input.value = "";
        try {
          await observed!.login(token);
          form.querySelector("[role=status]")!.textContent =
            "Authorized for observation only.";
        } catch (err) {
          form.querySelector("[role=status]")!.textContent = (
            err as Error
          ).message;
        }
      };
    };
  }
  if (remote) {
    $("acquire").onclick = async () => {
      const r = await remote!.acquire();
      notify(r.message, !r.accepted);
    };
    $("release").onclick = async () => {
      const r = await remote!.release();
      notify(r.message, !r.accepted);
    };
  }
  updatePanel();
}
function openTerminal() {
  if (manager.store.windows.length >= 14) {
    notify("Close a window before opening another.");
    return;
  }
  const n = [1, 2, 3, 4].find((n) => !terminals.has(`terminal-${n}`));
  if (!n) {
    notify("Four terminal windows are already open.");
    return;
  }
  const id = `terminal-${n}`,
    session = new MockTerminalSession(`DZ${n - 1}`);
  terminals.set(id, session);
  const el = body(
    `<div class="terminal-toolbar"><span class="source-tag">MOCK · ${session.id}</span><button data-keyboard>Acquire keyboard</button><select aria-label="Terminal profile"><option>VT100 / ANSI · tested subset</option><option disabled>VT52 · not validated</option><option disabled>VT220 · partial renderer only</option></select></div><div class="terminal-host" aria-label="${session.id} terminal"></div><div class="terminal-foot">Independent session · read-only until keyboard acquired · no shell or guest OS</div>`,
  );
  el.classList.add("terminal-app");
  let dispose = () => {};
  manager.open(
    id,
    `${session.id} · DEC terminal`,
    el,
    {
      x: Math.max(40, manager.bounds().width - 650) - n * 12,
      y: Math.max(260, manager.bounds().height - 360) + n * 10,
      width: 620,
      height: 330,
    },
    () => {
      dispose();
      session.inputOwner = false;
      terminals.delete(id);
      refreshApps();
    },
  );
  el.querySelector<HTMLButtonElement>("[data-keyboard]")!.onclick = (e) => {
    session.inputOwner = !session.inputOwner;
    (e.target as HTMLElement).textContent = session.inputOwner
      ? "Release keyboard"
      : "Acquire keyboard";
    el.querySelector(".terminal-foot")!.textContent = session.inputOwner
      ? "Keyboard owned by this window · panel ownership unchanged"
      : "Read-only terminal · output preserved";
    refreshApps();
  };
  void import("./terminal.ts")
    .then(({ mountTerminal }) =>
      mountTerminal(el.querySelector(".terminal-host")!, session),
    )
    .then((cleanup) => {
      if (el.isConnected) dispose = cleanup;
      else cleanup();
    })
    .catch((e) => {
      el.querySelector(".terminal-host")!.textContent =
        "Terminal renderer unavailable: " + String(e);
    });
  refreshApps();
}
function mediaHTML(tape = false) {
  const ds = devices.drives.filter((d) =>
    tape ? d.family === "TU10" : d.family !== "TU10",
  );
  return `<div class="app-heading"><div><h2>${tape ? "Magnetic tape" : "Disk drives"}</h2><p>RAM-only media prototype · no image files are mounted.</p></div><span class="source-tag">SIMULATION</span></div>${ds
    .map((d) => {
      const image = imageLibrary.find((i) => i.id === d.mounted);
      return `<article class="drive-card"><div class="drive-visual ${tape ? "reels" : ""}">${icon(tape ? "tapes" : "disks")}<b>${d.id}</b><span class="drive-lights" aria-hidden="true"><span><i class="${d.mounted ? "lit" : ""}"></i> READY</span><span><i class="${d.readOnly ? "lit" : ""}"></i> PROTECT</span></span></div><div class="drive-details"><h3>${d.family} <span>${d.mounted ? "PACK LOADED" : "EMPTY"}</span></h3><p>${image ? escape(image.name) : "No demonstration media attached"}</p><small>${image ? `${(image.bytes / 1048576).toFixed(2)} MiB · catalog metadata` : "Choose a compatible profile below"}</small><div class="device-actions"><select aria-label="${d.id} media">${imageLibrary
        .filter((i) => i.family === d.family)
        .map((i) => `<option value="${i.id}">${escape(i.name)}</option>`)
        .join(
          "",
        )}</select><button data-mount="${d.id}" ${d.mounted ? "disabled" : ""}>Mount</button><button data-eject="${d.id}" ${!d.mounted ? "disabled" : ""}>Eject</button><button data-protect="${d.id}">${d.readOnly ? "Write protected" : "Writable · mock"}</button></div>${tape ? `<div class="tape-position"><span>Synthetic block ${d.position}</span><progress value="${d.position}" max="100"></progress><button data-tape="rewind">Rewind</button><button data-tape="advance">Advance</button></div>` : ""}</div></article>`;
    })
    .join(
      "",
    )}<p class="app-note">Stop the simulated system before mounting, ejecting, or changing write protection. Conventional PiDP-11 utilities remain independent.</p>`;
}
function wireMedia(el: HTMLElement) {
  el.querySelectorAll<HTMLButtonElement>("[data-mount]").forEach(
    (b) =>
      (b.onclick = () =>
        safe(() =>
          devices.mount(
            b.dataset.mount!,
            b.parentElement!.querySelector("select")!.value,
          ),
        )),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-eject]").forEach(
    (b) => (b.onclick = () => safe(() => devices.eject(b.dataset.eject!))),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-protect]").forEach(
    (b) => (b.onclick = () => safe(() => devices.protect(b.dataset.protect!))),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-tape]").forEach(
    (b) =>
      (b.onclick = () =>
        safe(() => devices.tape(b.dataset.tape as "rewind" | "advance"))),
  );
}
function systemsHTML() {
  return `<div class="app-heading"><div><h2>Operating systems</h2><p>Explore boot profiles. No guest OS or disk image is included.</p></div><span class="source-tag">SIMULATION</span></div><div class="system-state">${devices.running ? `Simulated session: ${devices.profile}` : "Simulated session stopped"} <button data-stop ${devices.running ? "" : "disabled"}>Stop simulation</button></div>${[
    ["UNIX V6", "1975 · time-sharing", "RK05", "RK0 · PDP-11/70 · 256 KiB"],
    [
      "RT-11",
      "Single-user · real-time",
      "RL02",
      "RL0 · profile pending validation",
    ],
    [
      "RSX-11M+",
      "Multiuser · real-time",
      "RL02",
      "RL0 · guest serial lines require OS configuration",
    ],
  ]
    .map(
      ([name, desc, media, config]) =>
        `<article class="system-profile"><span class="system-initial">${name === "UNIX V6" ? "U" : name === "RT-11" ? "R" : "M+"}</span><div><h3>${name}</h3><p>${desc}</p><small>${config}<br>${media} demonstration pack required; actual guest shutdown is not implemented.</small></div><button data-boot="${name}" ${devices.running ? "disabled" : ""}>Start demo</button></article>`,
    )
    .join(
      "",
    )}<a class="reference-link" href="https://obsolescence.dev/pidp11/PiDP-11_Manual.pdf" target="_blank" rel="noreferrer">Official PiDP-11 manual ↗</a>`;
}
const printerApps = new WeakMap<HTMLElement, PrinterApp>();
function paperHTML() {
  return `<div class="app-heading"><div><h2>Paper tape</h2><p>Read and punch local bytes · 8 KiB per tape.</p></div><span class="source-tag">SIMULATION</span></div><div class="paper-columns"><section><h3>Reader / PTR</h3><label class="file-label">Load local tape<input type="file" data-paper-file aria-label="Load local paper tape"></label><p>${devices.paper.length} bytes loaded</p><div class="punched-strip" aria-label="First 32 bytes as punched holes">${Array.from(
    devices.paper.slice(0, 32),
  )
    .map(
      (b) =>
        `<span>${Array.from({ length: 8 }, (_, i) => `<i class="${b & (1 << i) ? "hole" : ""}"></i>`).join("")}</span>`,
    )
    .join("")}</div><pre class="hex-preview">${
    Array.from(devices.paper.slice(0, 128))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(" ") || "No tape loaded."
  }</pre><button data-paper-download>Save loaded bytes</button></section><section><h3>Punch / PTP</h3><label>Text to punch<textarea data-punch-input maxlength="8192" rows="6">HELLO FROM THE PDP-11\n</textarea></label><button data-punch>Punch text</button><button data-punch-download>Save punched tape</button><p>${devices.punched.length} output bytes</p></section></div>`;
}
function sessionsHTML() {
  return `<div class="app-heading"><div><h2>Terminal manager</h2><p>Each keyboard lease belongs to one terminal, never to the panel.</p></div><button data-new-terminal>New terminal</button></div><table><thead><tr><th>Line</th><th>Profile</th><th>Keyboard</th><th>Session</th></tr></thead><tbody>${
    Array.from(terminals.entries())
      .map(
        ([id, s]) =>
          `<tr><td>${s.id}</td><td>${s.profile}</td><td>${s.inputOwner ? "Owned by its window" : "Read-only"}</td><td><button data-focus="${id}">Open window</button></td></tr>`,
      )
      .join("") || '<tr><td colspan="4">No terminal windows open.</td></tr>'
  }</tbody></table><p class="app-note">Mock sessions are independent. SSH, Screen, real serial terminals and guest network logins are never attached or taken over by this prototype.</p>`;
}
function diagnosticsHTML() {
  return `<div class="app-heading"><div><h2>Diagnostics</h2><p>Source and availability are explicit.</p></div><span class="source-tag">${remoteMode ? "LOCAL BACKEND" : "BROWSER ONLY"}</span></div><dl class="diagnostic-grid"><dt>Panel source</dt><dd>${current.source === "simulation" ? "Simulated data" : "Isolated REALCONS data"}</dd><dt>Connection</dt><dd>${escape(connectionText)}</dd><dt>Panel ownership</dt><dd>${owns ? "This browser" : "Observer"}</dd><dt>Terminal keyboards</dt><dd>${[...terminals.values()].filter((t) => t.inputOwner).length} independent owners</dd><dt>Host CPU / memory</dt><dd>Unavailable · no host telemetry connected</dd><dt>Temperature / throttling</dt><dd>Unavailable · no Pi access</dd><dt>RPC</dt><dd>${current.source === "simulation" ? "Not connected" : "Isolated laboratory only"}</dd><dt>Guest OS</dt><dd>Not connected · mock profiles only</dd><dt>Desktop windows</dt><dd>${manager.store.windows.length} / 14</dd></dl><h3>Local prototype log</h3><pre class="diagnostic-log">${escape(devices.logs.slice(-30).join("\n"))}</pre>`;
}
function refreshApps() {
  for (const id of [
    "disks",
    "tapes",
    "systems",
    "printer",
    "sessions",
    "diagnostics",
  ]) {
    const el = document.querySelector<HTMLElement>(
      `[data-window="${id}"] .window-body`,
    );
    if (el) renderApp(id, el);
  }
}
function renderApp(id: string, el: HTMLElement) {
  if (id === "printer") {
    let app = printerApps.get(el);
    if (!app) { app = new PrinterApp(el, devices, safe, download); printerApps.set(el, app); }
    app.update(devices);
    return;
  }
  const html: Record<string, () => string> = {
    disks: () => mediaHTML(),
    tapes: () => mediaHTML(true),
    systems: systemsHTML,
    paper: paperHTML,
    sessions: sessionsHTML,
    diagnostics: diagnosticsHTML,
  };
  if (html[id]) el.innerHTML = html[id]();
  if (id === "disks" || id === "tapes") wireMedia(el);
  el.querySelector<HTMLButtonElement>("[data-stop]")?.addEventListener(
    "click",
    () => safe(() => devices.stop()),
  );
  el.querySelectorAll<HTMLButtonElement>("[data-boot]").forEach(
    (b) =>
      (b.onclick = () =>
        safe(() => {
          devices.boot(b.dataset.boot!);
          notify(`${b.dataset.boot}: simulation started. No guest OS booted.`);
        })),
  );
  el.querySelector<HTMLInputElement>("[data-paper-file]")?.addEventListener(
    "change",
    async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 8192) return notify("Paper-tape limit is 8 KiB.", true);
      devices.loadPaper(new Uint8Array(await file.arrayBuffer()));
      renderApp("paper", el);
      refreshApps();
    },
  );
  el.querySelector<HTMLButtonElement>(
    "[data-paper-download]",
  )?.addEventListener("click", () => download("reader-demo.pt", devices.paper));
  el.querySelector<HTMLButtonElement>(
    "[data-punch-download]",
  )?.addEventListener("click", () =>
    download("punch-demo.pt", devices.punched),
  );
  el.querySelector<HTMLButtonElement>("[data-punch]")?.addEventListener(
    "click",
    () =>
      safe(() => {
        devices.punch(
          el.querySelector<HTMLTextAreaElement>("[data-punch-input]")!.value,
        );
        renderApp("paper", el);
      }),
  );
  el.querySelector<HTMLButtonElement>("[data-new-terminal]")?.addEventListener(
    "click",
    openTerminal,
  );
  el.querySelectorAll<HTMLButtonElement>("[data-focus]").forEach(
    (b) => (b.onclick = () => manager.restore(b.dataset.focus!)),
  );
}
function openGuestTerminal() {
  if (manager.store.windows.some(w => w.id === "guest")) { manager.restore("guest"); return; }
  if (manager.store.windows.length >= 14) { notify("Close a window first."); return; }
  const el = body("Loading guest terminal…"); el.classList.add("guest-terminal-app");
  let dispose = () => {};
  manager.open("guest", "Real guest · VT100 laboratory", el, { x: 80, y: 40, width: 1000, height: 690 }, () => dispose());
  void import("./guest-terminal.ts").then(m => m.mountGuestTerminal(el)).then(cleanup => {
    if (el.isConnected) dispose = cleanup; else cleanup();
  }).catch(() => { el.textContent = "Guest terminal renderer unavailable"; });
}
function openApp(id: string) {
  if (id === "guest") return openGuestTerminal();
  if (id === "panel") return openPanel();
  if (id === "terminal") return openTerminal();
  if (manager.store.windows.some((w) => w.id === id)) {
    manager.restore(id);
    return;
  }
  if (manager.store.windows.length >= 14) {
    notify("Close a window before opening another.");
    return;
  }
  const title = apps.find((a) => a[0] === id)?.[1];
  if (!title) return;
  const el = body("");
  el.classList.add("utility-app");
  if (id === "about")
    el.innerHTML = `<div class="about-brand"><img src="${redLogo}" alt="DIGITAL historical logo"><h2>PiDP-11 Web Desktop</h2><p>An independent companion project.<br>Not an official Digital Equipment Corporation product.</p></div><p><span data-app-version>${APP_MILESTONE}</span> · Go backend with a TypeScript/HTML5/SVG desktop, inspired by The High Nibble's IMSAI 8080 interface.</p><p>Built as an optional companion to Oscar Vermeulen's PiDP-11, with SIMH and Jörg Hoppe's BlinkenBone/REALCONS informing the isolated laboratory work. Terminal rendering uses xterm.js.</p><p>${observeMode ? 'The panel is in passive laboratory-observation mode; its connection status is shown separately.' : 'This demonstration uses simulated panel data. No real PiDP-11 is connected.'} The four mock terminals and in-memory media demonstrations are local fixtures, not guest OS sessions or SIMH-mounted disks. The separate Guest terminal connects to genuine guest lines only through the authenticated isolated-lab service.</p><h3>Keyboard</h3><dl class="diagnostic-grid"><dt>Alt + 1</dt><dd>Front panel</dd><dt>Alt + 2</dt><dd>New terminal</dd><dt>Alt + \x60</dt><dd>Cycle windows</dd><dt>Titlebar double-click</dt><dd>Maximize / restore</dd><dt>Resize handle + arrows</dt><dd>Keyboard resize (Shift = larger step)</dd><dt>Panel Tab + Space</dt><dd>Operate a focused switch</dd></dl><p class="app-note">Only window geometry is saved locally. Credentials, control leases, guest state and media contents are not persisted.</p>`;
  else renderApp(id, el);
  manager.open(id, title, el, {
    x: 90 + (manager.store.windows.length % 4) * 35,
    y: 70 + (manager.store.windows.length % 3) * 30,
    width: id === "printer" ? 960 : id === "paper" ? 760 : 680,
    height: id === "printer" ? 740 : id === "about" ? 680 : 470,
  }, () => { printerApps.get(el)?.dispose(); printerApps.delete(el); });
}
$("arrange-workspace").onclick = () => {
  openPanel();
  panelEl?.classList.remove("authentic-mode");
  $("panel-mode").textContent = "Full panel";
  manager.arrangeTerminals();
};
root
  .querySelectorAll<HTMLButtonElement>("[data-app]")
  .forEach((b) => (b.onclick = () => openApp(b.dataset.app!)));
manager.onChange = () => {
  const el = document.querySelector<HTMLElement>(
    '[data-window="diagnostics"] .window-body',
  );
  if (el) renderApp("diagnostics", el);
};
adapter.subscribe((state) => {
  current = state;
  updatePanel();
});
$("reset-layout").onclick = () => {
  try {
    localStorage.removeItem("pidp11.layout.v1");
  } catch {}
  location.reload();
};
window.addEventListener("keydown", (e) => {
  if (!e.altKey) return;
  if (e.key === "1") {
    e.preventDefault();
    openPanel();
  }
  if (e.key === "2") {
    e.preventDefault();
    openTerminal();
  }
  if (e.key === "`") {
    e.preventDefault();
    manager.cycle();
  }
});
let timer: ReturnType<typeof setInterval> | undefined;
function schedule() {
  clearInterval(timer);
  if (!document.hidden && !remoteMode && !observeMode)
    timer = setInterval(() => adapter.tick(), 50);
}
document.addEventListener("visibilitychange", schedule);
schedule();
const clockTick = () => {
  $("clock").textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};
clockTick();
const clock = setInterval(clockTick, 1000);
window.addEventListener("pagehide", () => {
  clearInterval(timer);
  clearInterval(clock);
  remote?.close();
  observed?.close();
  for (const t of terminals.values()) t.inputOwner = false;
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
openPanel();
if (innerWidth > 900) openTerminal();
