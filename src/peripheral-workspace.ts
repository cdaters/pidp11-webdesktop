import { mountDeviceObserver } from "./device-observer.ts";
import { mountLiveDevices } from "./live-devices.ts";

/** One equipment window, two deliberately different evidence/lifecycle modes. */
export function mountPeripheralWorkspace(host: HTMLElement): () => void {
  const controls = document.createElement("div");
  controls.className = "terminal-toolbar";
  const completed = document.createElement("button"),
    live = document.createElement("button");
  completed.textContent = "Completed exports";
  live.textContent = "Live activity";
  controls.append(completed, live);
  const content = document.createElement("div");
  host.replaceChildren(controls, content);
  let dispose = mountDeviceObserver(content);
  const change = (
    active: HTMLButtonElement,
    mount: typeof mountDeviceObserver,
  ) => {
    dispose();
    content.replaceChildren();
    content.className = "";
    completed.setAttribute("aria-pressed", String(active === completed));
    live.setAttribute("aria-pressed", String(active === live));
    dispose = mount(content);
  };
  completed.setAttribute("aria-pressed", "true");
  live.setAttribute("aria-pressed", "false");
  completed.onclick = () => change(completed, mountDeviceObserver);
  live.onclick = () => change(live, mountLiveDevices);
  return () => dispose();
}
