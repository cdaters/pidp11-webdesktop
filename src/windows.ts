/** Geometry/preferences only. Never persists credentials, input ownership or machine state. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface DesktopWindow extends Rect {
  id: string;
  title: string;
  status?: string;
  minimized: boolean;
  maximized: boolean;
  restore?: Rect;
}
export const MAX_WINDOWS = 14;
export function clampRect(r: Rect, width: number, height: number): Rect {
  const w = Math.min(Math.max(280, r.width), Math.max(280, width));
  const h = Math.min(Math.max(190, r.height), Math.max(190, height));
  return {
    x: Math.max(0, Math.min(width - w, r.x)),
    y: Math.max(0, Math.min(height - h, r.y)),
    width: w,
    height: h,
  };
}
export class WindowStore {
  windows: DesktopWindow[] = [];
  open(id: string, title: string, r: Rect) {
    const existing = this.windows.find((w) => w.id === id);
    if (existing) {
      existing.minimized = false;
      this.focus(id);
      return existing;
    }
    if (this.windows.length >= MAX_WINDOWS) throw Error("Window limit reached");
    const win = { id, title, ...r, minimized: false, maximized: false };
    this.windows.push(win);
    return win;
  }
  focus(id: string) {
    const i = this.windows.findIndex((w) => w.id === id);
    if (i < 0) return;
    this.windows.push(...this.windows.splice(i, 1));
  }
  close(id: string) {
    this.windows = this.windows.filter((w) => w.id !== id);
  }
  minimize(id: string) {
    const w = this.windows.find((w) => w.id === id);
    if (w) w.minimized = true;
  }
  maximize(id: string, width: number, height: number) {
    const w = this.windows.find((w) => w.id === id);
    if (!w) return;
    if (w.maximized) {
      Object.assign(w, w.restore);
      delete w.restore;
      w.maximized = false;
    } else {
      w.restore = { x: w.x, y: w.y, width: w.width, height: w.height };
      Object.assign(w, { x: 0, y: 0, width, height, maximized: true });
    }
    this.focus(id);
  }
  preferences() {
    return this.windows.map(({ id, x, y, width, height }) => ({
      id,
      x,
      y,
      width,
      height,
    }));
  }
}
export function readPreferences(raw: string | null): Map<string, Rect> {
  const result = new Map<string, Rect>();
  if (!raw || raw.length > 6000) return result;
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows)) return result;
    for (const v of rows.slice(0, MAX_WINDOWS)) {
      if (!v || typeof v !== "object" || !("id" in v)) continue;
      const r = v as Record<string, unknown>;
      if (
        typeof r.id !== "string" ||
        !/^(panel|guest(?:-[2-4])?|companion|device-observer(?:-2)?|tek4010|disks|tapes|paper|printer|systems|sessions|diagnostics|about|terminal-[1-4])$/.test(
          r.id,
        )
      )
        continue;
      if (
        ["x", "y", "width", "height"].every(
          (k) =>
            typeof r[k] === "number" &&
            Number.isFinite(r[k]) &&
            Math.abs(r[k] as number) < 10000,
        )
      )
        result.set(r.id, {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        } as Rect);
    }
  } catch {
    /* Ignore corrupt/incompatible preferences. */
  }
  return result;
}
export class WindowManager {
  store = new WindowStore();
  private elements = new Map<string, HTMLElement>();
  private saved: Map<string, Rect>;
  onChange = () => {};
  constructor(privateHost: HTMLElement, privateTaskbar: HTMLElement) {
    this.host = privateHost;
    this.taskbar = privateTaskbar;
    let raw = null;
    try {
      raw = localStorage.getItem("pidp11.layout.v1");
    } catch {}
    this.saved = readPreferences(raw);
    window.addEventListener("resize", () => this.layout());
  }
  private host: HTMLElement;
  private taskbar: HTMLElement;
  open(
    id: string,
    title: string,
    content: HTMLElement,
    rect: Rect,
    onClose?: () => void,
  ) {
    if (this.elements.has(id)) {
      this.restore(id);
      return this.elements.get(id)!;
    }
    const bounds = this.bounds();
    const w = this.store.open(
      id,
      title,
      clampRect(this.saved.get(id) ?? rect, bounds.width, bounds.height),
    );
    const el = document.createElement("section");
    el.className = "desktop-window";
    el.dataset.window = id;
    el.setAttribute("aria-label", title);
    el.tabIndex = -1;
    const header = document.createElement("header");
    header.className = "window-titlebar";
    const caption = document.createElement("span");
    caption.className = "window-title";
    caption.textContent = title;
    header.append(caption);
    const state = document.createElement("span");
    state.className = "window-status";
    state.id = `window-status-${id}`;
    state.setAttribute("aria-live", "polite");
    header.append(state);
    const tools = document.createElement("div");
    tools.className = "window-tools";
    const button = (label: string, text: string, action: () => void) => {
      const b = document.createElement("button");
      b.type = "button";
      b.title = label;
      b.setAttribute("aria-label", `${label} ${title}`);
      b.textContent = text;
      b.onclick = action;
      tools.append(b);
    };
    button("Minimize", "−", () => {
      this.store.minimize(id);
      this.render();
    });
    button("Maximize / restore", "□", () => this.toggleMax(id));
    button("Fullscreen", "⛶", () => {
      void el.requestFullscreen?.().catch(() => {});
    });
    button("Close", "×", () => {
      this.store.close(id);
      el.remove();
      this.elements.delete(id);
      onClose?.();
      this.render();
    });
    header.append(tools);
    el.append(header, content);
    content.classList.add("window-body");
    const grip = document.createElement("button");
    grip.className = "resize-grip";
    grip.setAttribute("aria-label", `Resize ${title}`);
    grip.title = "Drag to resize, or use arrow keys";
    el.append(grip);
    const drag = (handle: HTMLElement, resize: boolean) =>
      handle.addEventListener("pointerdown", (e) => {
        if (
          (e.target as Element).closest(".window-tools") ||
          e.button !== 0 ||
          w.maximized
        )
          return;
        this.store.focus(id);
        this.render();
        const initial = { x: w.x, y: w.y, width: w.width, height: w.height },
          start = { x: e.clientX, y: e.clientY };
        handle.setPointerCapture(e.pointerId);
        const move = (p: PointerEvent) => {
          const dx = p.clientX - start.x,
            dy = p.clientY - start.y;
          Object.assign(
            w,
            clampRect(
              resize
                ? {
                    ...initial,
                    width: initial.width + dx,
                    height: initial.height + dy,
                  }
                : { ...initial, x: initial.x + dx, y: initial.y + dy },
              this.bounds().width,
              this.bounds().height,
            ),
          );
          this.render(false);
        };
        const end = () => {
          handle.removeEventListener("pointermove", move);
          handle.removeEventListener("pointerup", end);
          handle.removeEventListener("pointercancel", end);
          this.save();
        };
        handle.addEventListener("pointermove", move);
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
        e.preventDefault();
      });
    drag(header, false);
    drag(grip, true);
    grip.addEventListener("keydown", (e) => {
      if (!e.key.startsWith("Arrow")) return;
      e.preventDefault();
      const step = e.shiftKey ? 50 : 10;
      Object.assign(
        w,
        clampRect(
          {
            ...w,
            width:
              w.width +
              (e.key === "ArrowRight"
                ? step
                : e.key === "ArrowLeft"
                  ? -step
                  : 0),
            height:
              w.height +
              (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
          },
          this.bounds().width,
          this.bounds().height,
        ),
      );
      this.render();
    });
    header.addEventListener("dblclick", (e) => {
      if (!(e.target as Element).closest("button")) this.toggleMax(id);
    });
    el.addEventListener("focusin", () => {
      if (this.store.windows.at(-1)?.id !== id) {
        this.store.focus(id);
        this.render(false);
      }
    });
    el.addEventListener("pointerdown", () => {
      if (this.store.windows.at(-1)?.id !== id) {
        this.store.focus(id);
        this.render(false);
      }
    });
    this.elements.set(id, el);
    this.host.append(el);
    this.render();
    return el;
  }
  bounds() {
    return { width: this.host.clientWidth, height: this.host.clientHeight };
  }
  restore(id: string) {
    const w = this.store.windows.find((w) => w.id === id);
    if (w) {
      w.minimized = false;
      this.store.focus(id);
      this.render();
      this.elements.get(id)?.focus({ preventScroll: true });
    }
  }
  place(id: string, rect: Rect) {
    const w = this.store.windows.find((w) => w.id === id);
    if (!w) return;
    Object.assign(w, clampRect(rect, this.bounds().width, this.bounds().height), { minimized: false, maximized: false });
    delete w.restore;
    this.render();
  }
  /** Runtime labels are presentation only; never saved as connection authority. */
  setStatus(id: string, status: string) {
    const win = this.store.windows.find(w => w.id === id);
    if (!win || win.status === status) return;
    win.status = status.slice(0, 120);
    this.render(false);
  }
  /** Tile real-equipment windows; a narrow display uses the taskbar as tabs. */
  arrangeEquipment(): boolean {
    const equipment = this.store.windows.filter(w => /^(guest(?:-[2-4])?|device-observer(?:-2)?|companion|tek4010)$/.test(w.id));
    if (!equipment.length) return false;
    const {width, height} = this.bounds();
    for (const window of this.store.windows) window.minimized = !equipment.includes(window);
    if (width < 1000 || height < 650) {
      const active = equipment.at(-1)!;
      for (const window of equipment) {
        window.minimized = window !== active;
        Object.assign(window, {x:0, y:0, width, height, maximized:false});
        delete window.restore;
      }
    } else {
      const columns = equipment.length === 1 ? 1 : width >= 1800 && equipment.length > 4 ? 3 : 2;
      const rows = Math.ceil(equipment.length / columns);
      equipment.forEach((window, i) => {
        Object.assign(window, clampRect({x:(i%columns)*width/columns, y:Math.floor(i/columns)*height/rows, width:width/columns-8, height:height/rows-8}, width, height), {maximized:false});
        delete window.restore;
      });
    }
    this.render();
    return true;
  }
  arrangeTerminals() {
    const { width, height } = this.bounds();
    const wide = width >= 1150;
    const panelWidth = wide ? Math.min(720, width * .48) : width;
    const panelHeight = Math.min(height * (wide ? .72 : .48), 550);
    this.place("panel", { x: 0, y: 0, width: panelWidth, height: panelHeight });
    const terminals = this.store.windows.filter((w) => w.id.startsWith("terminal-"));
    const x = wide ? panelWidth + 8 : 0, y = wide ? 0 : panelHeight + 8;
    const columns = width - x >= 1100 && terminals.length > 2 ? 2 : 1;
    const rows = Math.ceil(terminals.length / columns) || 1;
    terminals.forEach((w, i) => this.place(w.id, {
      x: x + (i % columns) * (width - x) / columns,
      y: y + Math.floor(i / columns) * (height - y) / rows,
      width: (width - x) / columns - 4, height: (height - y) / rows - 4,
    }));
  }
  toggleMax(id: string) {
    this.store.maximize(id, this.bounds().width, this.bounds().height);
    this.render();
  }
  cycle() {
    const visible = this.store.windows.filter((w) => !w.minimized);
    if (visible.length) this.restore(visible[0].id);
  }
  layout() {
    const b = this.bounds();
    for (const w of this.store.windows)
      Object.assign(
        w,
        w.maximized ? { x: 0, y: 0, ...b } : clampRect(w, b.width, b.height),
      );
    this.render();
  }
  private save() {
    try {
      localStorage.setItem(
        "pidp11.layout.v1",
        JSON.stringify(this.store.preferences()),
      );
    } catch {}
  }
  private render(save = true) {
    this.taskbar.replaceChildren();
    this.store.windows.forEach((w, i) => {
      const el = this.elements.get(w.id)!;
      el.hidden = w.minimized;
      el.querySelector(".window-status")!.textContent = w.status ?? "";
      el.classList.toggle("maximized", w.maximized);
      el.classList.toggle("focused", i === this.store.windows.length - 1);
      Object.assign(el.style, {
        left: `${w.x}px`,
        top: `${w.y}px`,
        width: `${w.width}px`,
        height: `${w.height}px`,
        zIndex: String(i + 1),
      });
      const b = document.createElement("button");
      b.textContent = w.title + (w.status ? ` · ${w.status}` : "");
      b.setAttribute("aria-describedby", `window-status-${w.id}`);
      b.className = w.minimized ? "" : "task-open";
      b.setAttribute("aria-label", `Restore ${w.title}`);
      b.onclick = () => this.restore(w.id);
      this.taskbar.append(b);
    });
    if (save) this.save();
    this.onChange();
  }
}
