/** Small descriptive contract, not a device driver or an authority grant.
 * Providers retain their own lifecycle/approval checks. Unknown generations must
 * remain unknown; rendering a declaration cannot attach, mount or control anything. */
export interface EquipmentDescription {
  identity: string;
  role: string;
  protocol: string;
  environments: string;
  provider: string;
  direction: "local" | "output" | "input/output";
  attachment: string;
  authority: "simulation" | "observation" | "supervised interaction";
  generation: string;
  failure: string;
  operations: string;
  limitations: string;
}
/** Render trusted labels and untrusted provider values as text, never markup. */
export function renderEquipmentDescription(host: HTMLElement, equipment: EquipmentDescription): void {
  const rows = Object.entries(equipment).flatMap(([key, value]) => {
    const title = document.createElement("dt");
    title.textContent = key[0].toUpperCase() + key.slice(1);
    const description = document.createElement("dd");
    description.textContent = value;
    return [title, description];
  });
  host.replaceChildren(...rows);
}
