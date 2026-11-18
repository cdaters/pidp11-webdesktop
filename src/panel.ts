import { paddleDefinitions, paddle, registerColor, setPaddle } from "./paddles.ts";
import type { PanelState, Command } from "./model.ts";
const panelLogo = new URL("./assets/digital-logo-bezel.svg", import.meta.url)
  .href;
const bits = (n: number) => Array.from({ length: n }, (_, i) => n - i - 1);
const x = (bit: number) => 105.5 + (21 - bit) * (719 / 21);
const color = (bit: number) =>
  Math.floor(bit / 3) % 2 ? "#b62d4b" : "#713452";
const controlWireNames: Record<string,string> = { load:"LOAD_ADRS", examine:"EXAM", deposit:"DEPOSIT", continue:"CONT", start:"START", "lamp-test":"LAMPTEST" };
const labelStrip = (bit: number) => {
  const left=x(bit)-17, right=x(bit)+17, l=bit===21 || bit%3===2 ? 6 : 0, r=bit===21 || bit%3===0 ? 6 : 0;
  return `<path d="M${left+l} 450H${right-r}Q${right} 450 ${right} ${450+r}V${494-r}Q${right} 494 ${right-r} 494H${left+l}Q${left} 494 ${left} ${494-l}V${450+l}Q${left} 450 ${left+l} 450Z" fill="${color(bit)}"/>`;
};
const lamp = (id: string, cx: number, cy: number, label = "") =>
  `<g class="lamp-group"><title>${label || id}</title><rect x="${cx - 10}" y="${cy - 12}" width="20" height="27" rx="2" fill="#141719"/><circle id="${id}" class="lamp" cx="${cx}" cy="${cy}" r="5.5"/>${
    label
      ? `<text x="${cx}" y="${cy - 25}" class="bit-label">${
          label.includes(" ")
            ? label
                .split(" ")
                .map(
                  (word, i) =>
                    `<tspan x="${cx}" dy="${i ? 9 : -8}">${word}</tspan>`,
                )
                .join("")
            : label
        }</text>`
      : ""
  }</g>`;
const controls = [
  ["load", "LOAD", "ADRS"],
  ["examine", "EXAM", ""],
  ["deposit", "DEP", ""],
  ["continue", "CONT", ""],
  ["halt", "ENABLE", "HALT"],
  ["bus-cycle", "S INST", "S BUS CYCLE"],
  ["start", "START", ""],
];
/** Original scalable artwork; calibration and historical references are recorded
 * in docs/panel-reference-notes.md. Markup contains no transport or control policy. */
export function panelMarkup() {
  return `<svg class="front-panel" viewBox="0 0 1200 688" role="group" aria-label="PDP-11/70 panel; photographic coordinate calibration, original SVG artwork">
<title>PDP-11/70 operator panel</title>${paddleDefinitions()}<rect width="1200" height="688" fill="#bdb9a7"/><rect x="21" y="36" width="1156" height="630" rx="13" fill="#c7c5b3" stroke="#aaa999" stroke-width="3"/>
<image href="${panelLogo}" x="83" y="58" width="110" height="33"/><rect x="48" y="128" width="1104" height="382" rx="28" fill="#202329" stroke="#85877c" stroke-width="5"/>
<text x="88" y="227" class="panel-model">pdp11/70</text>
${[
  ["parity-error", "PAR ERR"],
  ["address-error", "ADRS ERR"],
  ["run", "RUN"],
  ["pause", "PAUSE"],
  ["master", "MASTER"],
  ["user", "USER"],
  ["super", "SUPER"],
  ["kernel", "KERNEL"],
  ["space", "DATA"],
  ["width16", "16"],
  ["width18", "18"],
  ["width22", "22"],
]
  .map(([id, label], i) => lamp(id, 448 + i * (378 / 11), 218.5, label))
  .join("")}
<text x="791.5" y="172" class="panel-tag" text-anchor="middle">ADDRESSING</text>
${bits(22)
  .map(
    (b) =>
      `<rect x="${x(b) - 17}" y="253" width="34.3" height="17" fill="${color(b)}"/>`,
  )
  .join(
    "",
  )}<text x="831" y="265" class="bank-name" text-anchor="end">ADDRESS</text>
${bits(22)
  .map((b) => lamp(`address-${b}`, x(b), 310))
  .join("")}
${bits(16)
  .map(
    (b) =>
      `<rect x="${x(b) - 17}" y="350" width="34.3" height="18" fill="${color(b)}"/>`,
  )
  .join(
    "",
  )}<text x="831" y="363" class="bank-name" text-anchor="end">DATA</text>
${bits(16)
  .map((b) => lamp(`data-${b}`, x(b), 407))
  .join("")}
<text x="226" y="355" class="panel-tag" text-anchor="middle">PARITY</text>${lamp("parity-high", 209.5, 407, "HIGH")}${lamp("parity-low", 243.5, 407, "LOW")}
<text x="122" y="346" class="panel-tag" text-anchor="middle">POWER / LOCK</text><circle cx="122" cy="388" r="22" fill="#a3a393" stroke="#111719" stroke-width="7"/><path d="M111 403l24-31" stroke="#353934" stroke-width="7"/><text x="122" y="434" text-anchor="middle" class="panel-tag">OFF</text><title>Power key illustration only; host power is unavailable</title>
<g class="selector-art"><text x="900" y="232">USER D</text><text x="981" y="232">USER I</text><text x="900" y="252">SUPER D</text><text x="981" y="252">SUPER I</text><text x="900" y="272">KERNEL D</text><text x="981" y="272">KERNEL I</text><text x="900" y="292">CONS PHY</text><text x="981" y="292">PROG PHY</text><circle cx="1086" cy="263" r="27" fill="#12181b" stroke="#313838" stroke-width="3"/><path id="addr-knob" d="M1086 263l22-15" stroke="#c7c8b5" stroke-width="5"/></g>
<g class="selector-art"><text x="900" y="379">DATA PATHS</text><text x="900" y="400">BUS REG</text><text x="989" y="369">µADRS</text><text x="982" y="381">FPP / CPU</text><text x="981" y="401">DISPLAY REG</text><circle cx="1086" cy="387" r="27" fill="#12181b" stroke="#313838" stroke-width="3"/><path id="data-knob" d="M1086 387l22-15" stroke="#c7c8b5" stroke-width="5"/></g>
<rect x="87" y="498" width="1033" height="101" fill="#131112"/>
${bits(22)
  .map(
    (b) =>
      `<g class="register-switch" id="switch-${b}" role="switch" tabindex="0" aria-label="Switch register bit ${b}" aria-checked="false" data-bit="${b}"><rect class="switch-hit" x="${x(b) - 17}" y="447" width="34" height="157" fill="transparent"/>${labelStrip(b)}<text x="${x(b)}" y="478" class="historic-switch-label">${b}</text>${paddle(registerColor(b), "down", x(b) - 16, 506)}</g>`,
  )
  .join("")}
<g role="button" tabindex="0" aria-label="Lamp test pulse" data-action="lamp-test" class="panel-action up-action" id="action-lamp-test"><rect class="switch-hit" x="842" y="447" width="32" height="157" fill="transparent"/>${paddle("cream", "rest", 842, 506)}</g>
${controls.map(([action, top, bottom], i) => `<g role="${action === "halt" || action === "bus-cycle" ? "switch" : "button"}" tabindex="0" aria-label="${top} ${bottom}" ${action === "halt" || action === "bus-cycle" ? 'aria-checked="false"' : ""} data-action="${action}" id="action-${action}" class="panel-action ${action === "deposit" ? "up-action" : ""}"><rect class="switch-hit" x="${878 + i * 34.3}" y="447" width="34" height="157" fill="transparent"/><rect x="${878 + i * 34.3}" y="450" width="34" height="44" fill="${i % 2 ? "#713452" : "#b62d4b"}"/><text x="${895 + i * 34.3}" y="${bottom ? 469 : 476}" class="control-legend">${top}</text><text x="${895 + i * 34.3}" y="484" class="control-legend"${bottom === "S BUS CYCLE" ? ' textLength="31" lengthAdjust="spacingAndGlyphs"' : ""}>${bottom}</text>${paddle(i % 2 ? "purple" : "red", "rest", 879 + i * 34.3, 506)}</g>`).join("")}
</svg>`;
}
/** Bind once per newly created panel DOM. The owning view removes that DOM on
 * teardown; dispatch delegates authority and momentary/latch behavior to its adapter. */
export function bindPanel(
  container: HTMLElement,
  dispatch: (command: Command) => unknown,
) {
  container
    .querySelectorAll<SVGGElement>("[data-bit], [data-action]")
    .forEach((node) => {
      const invoke = () => {
        const type = node.dataset.action;
        void dispatch(
          type
            ? ({ type } as Command)
            : { type: "switch", bit: Number(node.dataset.bit) },
        );
      };
      node.addEventListener("click", invoke);
      if (node.tagName.toLowerCase() !== "button") node.addEventListener("keydown", (event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          invoke();
        }
      });
    });
}
export function displayedData(s: Readonly<PanelState>) {
  if (s.source !== "simulation") return s.data;
  return [s.cycles & 0xffff, 0, s.data, s.switchRegister & 0xffff][
    s.dataSelect
  ];
}
export function renderPanel(container: HTMLElement, s: Readonly<PanelState>) {
  const setLamp = (id: string, on: boolean) =>
    container.querySelector(`#${id}`)?.classList.toggle("on", s.lampTest || on);
  const address =
    s.source !== "simulation" || s.addressSelect === 4 || s.addressSelect === 7
      ? s.address
      : s.address & 0xffff;
  bits(22).forEach((b) => {
    setLamp(`address-${b}`, Boolean(address & (1 << b)));
    const node = container.querySelector(`#switch-${b}`)!;
    const on = Boolean(s.switchRegister & (1 << b));
    node.classList.toggle("up", on);
    setPaddle(node, on ? "up" : "down");
    node.setAttribute("aria-checked", String(on));
  });
  bits(16).forEach((b) =>
    setLamp(`data-${b}`, Boolean(displayedData(s) & (1 << b))),
  );
  setLamp("run", s.running);
  setLamp("master", !s.running);
  setLamp("kernel", true);
  setLamp("width22", true);
  for (const id of [
    "pause",
    "parity-high",
    "parity-low",
    "address-error",
    "parity-error",
    "user",
    "super",
    "space",
    "width16",
    "width18",
  ])
    setLamp(id, false);
  if (s.source !== "simulation" && s.indicators) {
    const names: Record<string, string> = {
      run: "RUN",
      master: "MASTER",
      pause: "PAUSE",
      "parity-high": "PARITY_HIGH",
      "parity-low": "PARITY_LOW",
      "address-error": "ADRS_ERR",
      "parity-error": "PAR_ERR",
      space: "DATA_SPACE",
      width16: "ADDRESSING_16",
      width18: "ADDRESSING_18",
      width22: "ADDRESSING_22",
    };
    for (const [id, name] of Object.entries(names))
      setLamp(id, !!s.indicators[name]);
    setLamp("kernel", s.indicators.MMR0_MODE === 0);
    setLamp("super", s.indicators.MMR0_MODE === 2);
    setLamp("user", s.indicators.MMR0_MODE === 3);
  }
  for (const [name, on] of [
    ["halt", s.halted],
    ["bus-cycle", s.busCycle],
  ] as const) {
    const node = container.querySelector(`#action-${name}`)!;
    node.classList.toggle("latched", on);
    node.setAttribute("aria-checked", String(on));
  }
  for (const node of container.querySelectorAll<SVGGElement>("[data-action]")) {
    const action = node.dataset.action;
    const active = s.controls && action && controlWireNames[action] ? !!s.controls[controlWireNames[action]] : action === s.momentary || (action === "lamp-test" && s.lampTest);
    node.classList.toggle("active-pulse", active);
    const latched = action === "halt" ? s.halted : action === "bus-cycle" ? s.busCycle : undefined;
    setPaddle(node, latched !== undefined ? (latched ? "down" : "up") : active ? (action === "deposit" || action === "lamp-test" ? "up" : "down") : "rest");
  }
  const addrAngles = [65, 40, 90, 15, -15, 115, -40, -65];
  container
    .querySelector("#addr-knob")
    ?.setAttribute(
      "transform",
      `rotate(${addrAngles[s.addressSelect]} 1086 263)`,
    );
  container
    .querySelector("#data-knob")
    ?.setAttribute(
      "transform",
      `rotate(${[70, 130, -20, 20][s.dataSelect]} 1086 387)`,
    );
}
