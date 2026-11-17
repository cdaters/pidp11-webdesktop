import type { PanelState, Command } from './model.ts';
const bits = (n: number) => Array.from({ length: n }, (_, i) => n - i - 1);
const x = (bit: number) => 72 + (21 - bit) * 32;
const lamp = (id: string, cx: number, cy: number, label: string) => `<g class="lamp-group"><rect x="${cx-10}" y="${cy-12}" width="20" height="30" rx="3" fill="#1a1b1c"/><circle id="${id}" class="lamp" cx="${cx}" cy="${cy}" r="5"/><text x="${cx}" y="${cy-20}" class="bit-label">${label.includes(' ')?label.split(' ').map((word,i)=>`<tspan x="${cx}" dy="${i?8:-7}">${word}</tspan>`).join(''):label}</text></g>`;
const controls = [ ['load','LOAD','ADRS'],['examine','EXAM',''],['deposit','DEP',''],['continue','CONT',''],['halt','ENABLE','HALT'],['bus-cycle','S INST','S BUS CYCLE'],['start','START',''] ];
export function panelMarkup() {
  return `<svg class="front-panel" viewBox="0 0 1120 480" role="group" aria-label="Simulated PDP-11/70 panel with historically arranged status, address, data and switch banks">
  <title>PDP-11/70 simulated operator panel</title>
  <rect width="1120" height="480" rx="10" fill="#bcb6a3"/>
  <text x="40" y="36" class="bezel-logo">d i g i t a l</text><text x="1080" y="34" text-anchor="end" class="bezel-caption">PiDP-11 · SIMULATED CONSOLE</text>
  <rect x="22" y="57" width="1076" height="355" rx="19" fill="#242224" stroke="#6d685f" stroke-width="5"/>
  <text x="53" y="134" class="panel-model">pdp11/70</text>
  ${[['parity-error','PAR ERR'],['address-error','ADRS ERR'],['run','RUN'],['pause','PAUSE'],['master','MASTER'],['user','USER'],['super','SUPER'],['kernel','KERNEL'],['space','DATA'],['width16','16'],['width18','18'],['width22','22']].map(([id,label],i)=>lamp(id,365+i*34,127,label)).join('')}
  <text x="720" y="86" class="panel-tag" text-anchor="middle">ADDRESSING</text>
  <rect x="52" y="160" width="742" height="15" fill="#9e2c52"/>
  <text x="788" y="171" text-anchor="end" class="bank-name">ADDRESS</text>
  ${bits(22).map(b => lamp(`address-${b}`,x(b),204,String(b))).join('')}
  <rect x="244" y="235" width="550" height="15" fill="#9e2c52"/>
  <text x="788" y="246" text-anchor="end" class="bank-name">DATA</text>
  ${bits(16).map(b=>lamp(`data-${b}`,x(b),279,String(b))).join('')}
  <text x="187" y="239" class="panel-tag" text-anchor="middle">PARITY</text>
  ${lamp('parity-high',169,279,'HIGH')}${lamp('parity-low',209,279,'LOW')}
  <text x="79" y="242" text-anchor="middle" class="panel-tag">POWER / LOCK</text><circle cx="79" cy="279" r="17" fill="#77776b" stroke="#171919" stroke-width="5"/><path d="M68 287l21-16" stroke="#1d1e1d" stroke-width="6"/>
  <text x="79" y="309" text-anchor="middle" class="panel-tag">INERT</text>
  <g class="selector-art"><text x="870" y="135">USER D</text><text x="944" y="135">USER I</text><text x="870" y="153">SUPER D</text><text x="944" y="153">SUPER I</text><text x="870" y="171">KERNEL D</text><text x="944" y="171">KERNEL I</text><text x="870" y="189">CONS PHY</text><text x="944" y="189">PROG PHY</text><circle cx="1040" cy="164" r="25" fill="#151617" stroke="#363536" stroke-width="3"/><path id="addr-knob" d="M1040 164l20-13" stroke="#d3ccb7" stroke-width="4"/></g>
  <g class="selector-art"><text x="870" y="259">DATA PATHS</text><text x="870" y="281">BUS REG</text><text x="962" y="251">µADRS</text><text x="962" y="263">FPP / CPU</text><text x="962" y="282">DISPLAY REG</text><circle cx="1040" cy="278" r="25" fill="#151617" stroke="#363536" stroke-width="3"/><path id="data-knob" d="M1040 278l20-13" stroke="#d3ccb7" stroke-width="4"/></g>
  ${bits(22).map(b=>`<g class="register-switch" id="switch-${b}" role="switch" tabindex="0" aria-label="Switch register bit ${b}" aria-checked="false" data-bit="${b}"><rect class="switch-hit" x="${x(b)-15}" y="334" width="30" height="102" rx="2" fill="transparent"/><rect x="${x(b)-15}" y="337" width="30" height="29" rx="3" fill="${Math.floor(b/3)%2?'#8a294c':'#b53353'}"/><text x="${x(b)}" y="356" class="historic-switch-label">${b}</text><rect x="${x(b)-13}" y="379" width="26" height="48" rx="4" fill="#141517"/><path class="paddle ${Math.floor(b/3)%2?'rose':'red'}" d="M${x(b)-14} 380h28l-3 43h-22z"/><path class="paddle-line" d="M${x(b)-10} 390h20" stroke="#ffffff40"/></g>`).join('')}
  <g role="button" tabindex="0" aria-label="Lamp test pulse" data-action="lamp-test" class="panel-action" id="action-lamp-test"><rect class="switch-hit" x="773" y="334" width="27" height="102" fill="transparent"/><path class="action-paddle" d="M774 380h24l-2 43h-20z" fill="#e1d7c0"/></g>
  ${controls.map(([action,top,bottom],i)=>`<g role="${action==='halt'||action==='bus-cycle'?'switch':'button'}" tabindex="0" aria-label="${top} ${bottom}" ${action==='halt'||action==='bus-cycle'?'aria-checked="false"':''} data-action="${action}" id="action-${action}" class="panel-action ${action==='deposit'?'up-action':''}"><rect class="switch-hit" x="${806+i*39}" y="331" width="37" height="108" rx="3" fill="transparent"/><rect x="${806+i*39}" y="337" width="37" height="29" rx="3" fill="${i%2?'#9d3154':'#b53353'}"/><text x="${824+i*39}" y="${bottom?348:354}" class="control-legend">${top}</text><text x="${824+i*39}" y="360" class="control-legend">${bottom}</text><path class="action-paddle" d="M${808+i*39} 380h32l-3 43h-26z" fill="${i%2?'#aa3159':'#cb3554'}"/></g>`).join('')}
  <text x="55" y="458" class="bezel-caption">22-BIT SWITCH REGISTER</text><text x="1080" y="458" text-anchor="end" class="bezel-caption">ORIGINAL SVG · HISTORICAL LAYOUT STUDY</text>
  </svg>`;
}
export function bindPanel(container: HTMLElement, dispatch: (command:Command)=>unknown) {
  container.querySelectorAll<SVGGElement>('[data-bit], [data-action]').forEach(node=>{
    const invoke=()=>{const type=node.dataset.action;void dispatch(type?{type} as Command:{type:'switch',bit:Number(node.dataset.bit)});if(type&& !['halt','bus-cycle'].includes(type)){node.classList.add('pressed');setTimeout(()=>node.classList.remove('pressed'),150);}};
    node.addEventListener('click',invoke);
    node.addEventListener('keydown',event=>{if((event.key===' '||event.key==='Enter')&&!event.repeat){event.preventDefault();invoke();}});
  });
}
export function displayedData(s:Readonly<PanelState>){if(s.source==='realcons-lab')return s.data;return [s.cycles&0xffff,0,s.data,s.switchRegister&0xffff][s.dataSelect];}
export function renderPanel(container:HTMLElement,s:Readonly<PanelState>){
 const setLamp=(id:string,on:boolean)=>container.querySelector(`#${id}`)?.classList.toggle('on',s.lampTest||on);
 const address=s.addressSelect===4||s.addressSelect===7?s.address:s.address&0xffff;
 bits(22).forEach(b=>{setLamp(`address-${b}`,Boolean(address&(1<<b)));const node=container.querySelector(`#switch-${b}`)!;const on=Boolean(s.switchRegister&(1<<b));node.classList.toggle('up',on);node.setAttribute('aria-checked',String(on));});
 bits(16).forEach(b=>setLamp(`data-${b}`,Boolean(displayedData(s)&(1<<b))));
 setLamp('run',s.running);setLamp('master',!s.running);setLamp('kernel',true);setLamp('width22',true);
 for(const id of ['pause','parity-high','parity-low','address-error','parity-error','user','super','space','width16','width18'])setLamp(id,false);
 if(s.source==='realcons-lab'&&s.indicators){
  const names:Record<string,string>={'run':'RUN','master':'MASTER','pause':'PAUSE','parity-high':'PARITY_HIGH','parity-low':'PARITY_LOW','address-error':'ADRS_ERR','parity-error':'PAR_ERR','space':'DATA_SPACE','width16':'ADDRESSING_16','width18':'ADDRESSING_18','width22':'ADDRESSING_22'};
  for(const [id,name] of Object.entries(names))setLamp(id,!!s.indicators[name]);
  setLamp('kernel',s.indicators.MMR0_MODE===0);setLamp('super',s.indicators.MMR0_MODE===2);setLamp('user',s.indicators.MMR0_MODE===3);
 }
 for(const [name,on] of [['halt',s.halted],['bus-cycle',s.busCycle]] as const){const node=container.querySelector(`#action-${name}`)!;node.classList.toggle('latched',on);node.setAttribute('aria-checked',String(on));}
 for(const node of container.querySelectorAll<SVGGElement>('[data-action]'))node.classList.toggle('active-pulse',node.dataset.action===s.momentary||(node.dataset.action==='lamp-test'&&s.lampTest));
 const addrAngles=[65,40,90,15,-15,115,-40,-65];
 container.querySelector('#addr-knob')?.setAttribute('transform',`rotate(${addrAngles[s.addressSelect]} 1040 164)`);
 container.querySelector('#data-knob')?.setAttribute('transform',`rotate(${[70,130,-20,20][s.dataSelect]} 1040 278)`);
}
