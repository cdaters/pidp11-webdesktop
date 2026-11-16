import type { PanelState, Command } from './model.ts';
const bits = (n: number) => Array.from({ length: n }, (_, i) => n - i - 1);
const x = (bit: number) => 92 + (21 - bit) * 36;
const lamp = (id: string, cx: number, cy: number, label: string) => `<g class="lamp-group"><circle id="${id}" class="lamp" cx="${cx}" cy="${cy}" r="6"/><text x="${cx}" y="${cy - 17}" class="bit-label">${label}</text></g>`;
export function panelMarkup() {
  return `<svg class="front-panel" viewBox="0 0 1120 405" role="group" aria-label="Simulated PDP-11/70 panel with address lamps, data lamps and interactive switches">
  <title>PDP-11/70 simulated operator panel</title>
  <defs><linearGradient id="metal" x2="0" y2="1"><stop stop-color="#b9b8ae"/><stop offset=".5" stop-color="#767972"/><stop offset="1" stop-color="#999d94"/></linearGradient></defs>
  <rect x="0" y="0" width="1120" height="405" rx="8" fill="url(#metal)"/>
  <rect x="17" y="15" width="1086" height="375" rx="3" fill="#252729"/>
  <rect x="17" y="15" width="1086" height="58" fill="#84284e"/>
  <text x="42" y="54" class="panel-brand">digital</text><text x="174" y="54" class="panel-model">pdp11/70</text>
  <text x="1075" y="49" class="panel-tag" text-anchor="end">VIRTUAL OPERATOR CONSOLE</text>
  <path d="M38 88H1082M38 171H1082M38 236H1082" stroke="#71716b" stroke-width="1"/>
  <text x="42" y="110" class="row-label">ADDRESS</text>
  ${bits(22).map(b => lamp(`address-${b}`, x(b), 139, String(b))).join('')}
  <text x="959" y="112" class="row-label">PARITY</text>
  ${lamp('parity-high', 983, 139, 'HIGH')}${lamp('parity-low', 1045, 139, 'LOW')}
  <text x="42" y="192" class="row-label">DATA</text>
  ${bits(16).map(b => lamp(`data-${b}`, x(b), 210, String(b))).join('')}
  ${lamp('run', 103, 210, 'RUN')}${lamp('pause', 172, 210, 'PAUSE')}${lamp('master', 241, 210, 'MASTER')}
  ${lamp('address-error', 983, 210, 'ADRS ERR')}${lamp('parity-error', 1045, 210, 'PAR ERR')}
  <rect x="38" y="248" width="834" height="71" fill="#d4cab4" rx="2"/>
  ${bits(22).map(b => `<g class="register-switch" id="switch-${b}" role="switch" tabindex="0" aria-label="Switch register bit ${b}" aria-checked="false" data-bit="${b}">
    <rect class="switch-hit" x="${x(b)-17}" y="249" width="34" height="70" rx="2" fill="transparent"/>
    <text x="${x(b)}" y="264" class="switch-label">${b}</text>
    <rect x="${x(b)-12}" y="272" width="24" height="35" rx="3" fill="#292829"/>
    <path class="paddle ${Math.floor(b/3)%2 === 0 ? 'rose' : 'cream'}" d="M${x(b)-13} 280h26l-2 24h-22z"/>
    <path class="paddle-line" d="M${x(b)-9} 287h18" stroke="#ffffff60"/>
  </g>`).join('')}
  <text x="43" y="339" class="row-label">SWITCH REGISTER</text>
  <text x="869" y="339" text-anchor="end" class="panel-tag">22-BIT · OCTAL GROUPS</text>
  <rect x="891" y="248" width="191" height="71" rx="2" fill="#3b3d3c"/>
  <text x="986" y="270" class="panel-tag" text-anchor="middle">ADDRESSING</text>
  ${lamp('width16', 931, 298, '16')}${lamp('width18', 987, 298, '18')}${lamp('width22', 1043, 298, '22')}
  <text x="42" y="370" class="panel-foot">PiDP-11 WEB DESKTOP</text><text x="1077" y="370" class="panel-foot" text-anchor="end">SIMULATED SIGNALS / LOCAL CONTROLS</text>
  ${[[8,25],[1111,25],[8,380],[1111,380]].map(([cx,cy]) => `<circle cx="${cx}" cy="${cy}" r="4" fill="#444944"/><path d="M${cx-2} ${cy}h4" stroke="#b0b4a9"/>`).join('')}
  </svg>`;
}
export function bindPanel(container: HTMLElement, dispatch: (command: Command) => void) {
  container.querySelectorAll<SVGGElement>('[data-bit]').forEach(node => {
    const toggle = () => dispatch({ type: 'switch', bit: Number(node.dataset.bit) });
    node.addEventListener('click', toggle);
    node.addEventListener('keydown', event => {
      if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); toggle(); }
    });
  });
}
export function renderPanel(container: HTMLElement, s: Readonly<PanelState>) {
  const setLamp = (id: string, on: boolean) => container.querySelector(`#${id}`)?.classList.toggle('on', s.lampTest || on);
  bits(22).forEach(b => {
    setLamp(`address-${b}`, Boolean(s.address & (1 << b)));
    const node = container.querySelector(`#switch-${b}`)!;
    const on = Boolean(s.switchRegister & (1 << b));
    node.classList.toggle('up', on); node.setAttribute('aria-checked', String(on));
  });
  const data = [s.data, s.switchRegister & 0xffff, s.cycles & 0xffff, 0][s.dataSelect];
  bits(16).forEach(b => setLamp(`data-${b}`, Boolean(data & (1 << b))));
  setLamp('run', !s.halted); setLamp('pause', false); setLamp('master', s.halted);
  setLamp('parity-high', false); setLamp('parity-low', false);
  setLamp('address-error', false); setLamp('parity-error', false);
  setLamp('width16', s.addressSelect < 3 || s.addressSelect > 3 && s.addressSelect < 7);
  setLamp('width18', false); setLamp('width22', s.addressSelect === 3 || s.addressSelect === 7);
}
