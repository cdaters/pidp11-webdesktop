import type {
  PanelAdapter,
  PanelState,
  Command,
  CommandResult,
} from "./model.ts";
export interface ObservedSnapshot {
  source: "realcons-observation-lab";
  available: boolean;
  fresh: boolean;
  ageMs: number;
  frame: null | {
    boot: string;
    seq: number;
    capturedUnixMs: number;
    inputs: Record<string, number>;
    outputs: Record<string, number>;
  };
}
/** Read-only transport: no control/grant/terminal/media routes and no credential persistence. */
export class ObservedPanelAdapter implements PanelAdapter {
  private state: PanelState = {
    source: "observed-lab",
    revision: 0,
    address: 0,
    data: 0,
    switchRegister: 0,
    halted: false,
    running: false,
    busCycle: false,
    momentary: "",
    lampTest: false,
    addressSelect: 4,
    dataSelect: 2,
    cycles: 0,
    storedWords: 0,
  };
  private listeners = new Set<(s: Readonly<PanelState>) => void>();
  private socket: WebSocket | undefined;
  private reconnect: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setInterval>;
  private closed = false;
  private csrf = "";
  private last = 0;
  private boot = "";
  private seq = 0;
  available = false;
  fresh = false;
  age = 0;
  constructor(privateStatus: (message: string) => void) {
    this.status = privateStatus;
    this.watchdog = setInterval(() => {
      if (this.last && Date.now() - this.last + this.age > 350 && this.fresh) {
        this.fresh = false;
        this.status("Stale observation · last received state retained");
        this.publish();
      }
    }, 100);
  }
  private status: (message: string) => void;
  async login(token: string) {
    const r = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "same-origin",
    });
    if (!r.ok) throw Error("Observation login rejected");
    const session = await r.json();
    this.csrf = session.csrf;
    this.closed = false;
    clearTimeout(this.reconnect);
    if (this.socket) {
      const old = this.socket;
      this.socket = undefined;
      old.close();
    }
    this.connect();
  }
  async logout() {
    // Stop displaying a connected session even if the server cannot be reached.
    this.closed = true;
    clearTimeout(this.reconnect);
    this.socket?.close();
    this.fresh = false;
    this.status("Signed out · observation disconnected");
    this.publish();
    const r = await fetch("/api/v1/logout", { method: "POST", credentials: "same-origin", headers: { "X-CSRF-Token": this.csrf } });
    this.csrf = "";
    if (!r.ok) throw Error("Server logout was not acknowledged; session expiry/revocation still applies");
  }
  private connect() {
    if (this.closed) return;
    const u = new URL("/api/v1/observe/ws", location.href);
    u.protocol = location.protocol === "https:" ? "wss:" : "ws:";
    const ws = (this.socket = new WebSocket(u));
    ws.onmessage = (e) => {
      if (ws !== this.socket || this.closed || ws.readyState !== WebSocket.OPEN) return;
      try {
        const snapshot: ObservedSnapshot = JSON.parse(String(e.data));
        this.accept(snapshot);
        // A bounded server write cannot flush already buffered TCP/browser data.
        // Discard an old stream rather than reading minutes of stale snapshots.
        if (snapshot.fresh && this.age > 1000) ws.close();
      } catch {
        this.status("Invalid observation message");
      }
    };
    ws.onclose = () => {
      if (ws !== this.socket) return;
      this.fresh = false;
      this.status("Observer disconnected · controls remain unavailable");
      this.publish();
      if (!this.closed) this.reconnect = setTimeout(() => this.connect(), 1500);
    };
    ws.onerror = () => ws.close();
  }
  accept(s: ObservedSnapshot) {
    if (
      !s ||
      s.source !== "realcons-observation-lab" ||
      typeof s.available !== "boolean" ||
      typeof s.fresh !== "boolean" ||
      !Number.isFinite(s.ageMs) ||
      s.ageMs < 0
    )
      throw Error("Invalid observation");
    if (s.available !== !!s.frame || (s.fresh && !s.available))
      throw Error("Invalid observation availability");
    const f = s.frame;
    if (f) {
      if (
        !/^[0-9a-f]{16}$/.test(f.boot) ||
        !Number.isSafeInteger(f.seq) ||
        f.seq < 1 ||
        !Number.isSafeInteger(f.capturedUnixMs)
      )
        throw Error("Invalid sequence");
      const inputLimits: Record<string, number> = {
        SR: 0x3fffff,
        LAMPTEST: 1,
        LOAD_ADRS: 1,
        EXAM: 1,
        DEPOSIT: 1,
        CONT: 1,
        HALT: 1,
        S_BUS_CYCLE: 1,
        START: 1,
        POWER: 1,
        PANEL_LOCK: 1,
        ADDR_SELECT: 7,
        DATA_SELECT: 3,
      };
      const outputLimits: Record<string, number> = {
        ADDRESS: 0x3fffff,
        DATA: 0xffff,
        PARITY_HIGH: 1,
        PARITY_LOW: 1,
        PAR_ERR: 1,
        ADRS_ERR: 1,
        RUN: 1,
        PAUSE: 1,
        MASTER: 1,
        MMR0_MODE: 7,
        DATA_SPACE: 1,
        ADDRESSING_16: 1,
        ADDRESSING_18: 1,
        ADDRESSING_22: 1,
        ADDR_SELECT_FEEDBACK: 255,
        DATA_SELECT_FEEDBACK: 15,
      };
      for (const [values, limits] of [
        [f.inputs, inputLimits],
        [f.outputs, outputLimits],
      ])
        if (
          !values ||
          Object.keys(values).length !== Object.keys(limits).length ||
          Object.entries(limits).some(
            ([k, max]) =>
              !Number.isSafeInteger(values[k]) ||
              values[k] < 0 ||
              values[k] > max,
          )
        )
          throw Error("Incomplete observation bank");
      if (f.boot === this.boot && f.seq < this.seq) return;
    }
    this.last = Date.now();
    this.available = s.available;
    const transportAge = f ? Date.now() - f.capturedUnixMs : 0;
    this.age = Math.max(s.ageMs, transportAge);
    this.fresh = s.fresh && this.age <= 350 && transportAge >= -100;

    if (!f) {
      this.status("No observed machine data available");
      this.publish();
      return;
    }
    this.boot = f.boot;
    this.seq = f.seq;
    const i = f.inputs,
      o = f.outputs;
    this.state = {
      ...this.state,
      source: "observed-lab",
      revision: this.state.revision + 1,
      indicators: { ...o },
      controls: { ...i },
      address: o.ADDRESS,
      data: o.DATA,
      switchRegister: i.SR,
      halted: !!i.HALT,
      running: !!o.RUN,
      busCycle: !!i.S_BUS_CYCLE,
      addressSelect: i.ADDR_SELECT,
      dataSelect: i.DATA_SELECT,
      lampTest: !!i.LAMPTEST,
    };
    this.status(
      this.fresh
        ? `Observed REALCONS · read only · age ${this.age} ms`
        : `Stale observation · age ${this.age} ms (check clocks if persistent)`,
    );
    this.publish();
  }

  snapshot() {
    return Object.freeze({ ...this.state });
  }
  subscribe(listener: (s: Readonly<PanelState>) => void) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }
  private publish() {
    for (const listener of this.listeners) listener(this.snapshot());
  }
  dispatch(_command: Command): CommandResult {
    return {
      accepted: false,
      message: "Passive observation has no control capability.",
    };
  }
  tick() {}
  close() {
    this.closed = true;
    clearTimeout(this.reconnect);
    clearInterval(this.watchdog);
    this.socket?.close();
    this.fresh = false;
  }
}
