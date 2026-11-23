import { mountEquipmentHistory } from "./equipment-history.ts";
import { mountDeviceObserver } from "./device-observer.ts";
import { mountLiveDevices } from "./live-devices.ts";

export type PeripheralKind = "lp11" | "pc11-punch";
export interface EquipmentView {
  update(): void;
  dispose(): void;
}

/** Explicit local mode selection. Replacing a view cancels its observation;
 * neither reopening nor switching modes selects a producer or grants authority.
 * The caller owns disposal; simulation state remains in the shared device model. */
export function mountEquipmentWorkspace(
  host: HTMLElement,
  kind: PeripheralKind,
  simulation: (content: HTMLElement) => EquipmentView,
): EquipmentView {
  host.classList.add("equipment-workspace");
  const controls = document.createElement("div");
  controls.className = "terminal-toolbar";
  controls.setAttribute("aria-label", "Equipment mode");
  const buttons = ["Local simulation", "Observe device", "Completed exports", "Job history"].map((label) => {
    const button = document.createElement("button");
    button.textContent = label;
    controls.append(button);
    return button;
  });
  host.replaceChildren(controls);
  let content: HTMLElement | undefined;
  let current: EquipmentView | undefined;
  const change = (mode: number) => {
    current?.dispose();
    content?.remove();
    content = document.createElement("div");
    host.append(content);
    buttons.forEach((button, index) => button.setAttribute("aria-pressed", String(index === mode)));
    if (mode === 0) current = simulation(content);
    else {
      const dispose = mode === 1
        ? mountLiveDevices(content, kind)
        : mode === 2 ? mountDeviceObserver(content, kind) : mountEquipmentHistory(content, kind);
      current = { update() {}, dispose };
    }
    current.update();
  };
  buttons.forEach((button, index) => { button.onclick = () => change(index); });
  change(0);
  return {
    update: () => current?.update(),
    dispose: () => { current?.dispose(); content?.remove(); },
  };
}
