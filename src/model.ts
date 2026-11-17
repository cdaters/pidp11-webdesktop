/** Browser-only interaction model. This is not a PDP-11 CPU or REALCONS implementation. */
export const ADDRESS_MASK = 0x3fffff;
export const DATA_MASK = 0xffff;
export type Command =
  | { type: 'switch'; bit: number }
  | { type: 'register'; value: number }
  | { type: 'halt' | 'continue' | 'start' | 'load' | 'examine' | 'deposit' | 'lamp-test' | 'reset' | 'bus-cycle' }
  | { type: 'address-select' | 'data-select'; value: number };
export interface PanelState {
  source: 'simulation'; revision: number; address: number; data: number;
  switchRegister: number; halted: boolean; running: boolean; busCycle: boolean; momentary: string; lampTest: boolean;
  addressSelect: number; dataSelect: number; cycles: number; storedWords: number;
}
export interface CommandResult { accepted: boolean; message: string }
export interface PanelAdapter {
  snapshot(): Readonly<PanelState>;
  dispatch(command: Command): CommandResult | Promise<CommandResult>;
  subscribe(listener: (state: Readonly<PanelState>) => void): () => void;
  tick(): void;
}
const initial = (): PanelState => ({ source: 'simulation', revision: 0, address: 0o1000,
  data: 0o012700, switchRegister: 0o1000, halted: true, running: false, busCycle: false, momentary: '', lampTest: false,
  addressSelect: 4, dataSelect: 2, cycles: 0, storedWords: 0 });
export const octal = (value: number, width = 8) => value.toString(8).padStart(width, '0');
export class SimulatedPanelAdapter implements PanelAdapter {
  private state = initial();
  private loadedAddress=0o1000;
  private lastMemory="";
  private lampTicks=0;
  private memory = new Map<number, number>();
  private listeners = new Set<(state: Readonly<PanelState>) => void>();
  snapshot(): Readonly<PanelState> { return Object.freeze({ ...this.state }); }
  subscribe(listener: (state: Readonly<PanelState>) => void) {
    this.listeners.add(listener); listener(this.snapshot());
    return () => { this.listeners.delete(listener); };
  }
  private publish() {
    this.state.revision++;
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
  private word(address: number) {
    return this.memory.get(address) ?? ((Math.imul(address >>> 1, 109) ^ 0o012700) & DATA_MASK);
  }
  private advance() {
    this.state.address = (this.state.address + 2) & ADDRESS_MASK;
    this.state.data = this.word(this.state.address);
    this.state.cycles++;
  }
  tick() {
    if(this.lampTicks>0){this.lampTicks--;if(this.lampTicks===0){this.state.lampTest=false;this.publish();}}
    if (this.state.halted || !this.state.running) return;
    this.advance(); this.publish();
  }
  dispatch(command: Command): CommandResult {
    const s = this.state;
    let message = '';
    if (['load', 'examine', 'deposit'].includes(command.type) && !s.halted)
      return { accepted: false, message: 'Set ENABLE / HALT to HALT before using the memory controls.' };
    switch (command.type) {
      case 'switch':
        if (!Number.isInteger(command.bit) || command.bit < 0 || command.bit > 21)
          return { accepted: false, message: 'Switch bit must be 0–21.' };
        s.switchRegister ^= 1 << command.bit;
        message = `SR = ${octal(s.switchRegister)} octal`; break;
      case 'register':
        if (!Number.isInteger(command.value) || command.value < 0 || command.value > ADDRESS_MASK)
          return { accepted: false, message: 'Enter an octal value from 0 to 17777777.' };
        s.switchRegister = command.value; message = `SR = ${octal(s.switchRegister)} octal`; break;
      case 'halt':
        s.halted = !s.halted; if(s.halted)s.running=false;this.lastMemory="";
        message = s.halted ? 'HALT asserted. Scratch memory controls are available.' : 'ENABLE selected. Press CONT to resume.'; break;
      case 'continue':
        if (s.halted) { this.advance(); message = 'Single demonstration step (+2 address). HALT remains asserted.'; }
        else {s.running=true;message = 'Synthetic activity continues.';} this.lastMemory='';
        break;
      case 'start':
        if(s.running)return {accepted:false,message:'START ignored while running.'};
        s.address = this.loadedAddress; s.data = this.word(s.address); s.cycles = 0;s.running=!s.halted;this.lastMemory='';
        message = s.halted ? 'Demo initialized at loaded address. HALT remains asserted.' : 'Demo restarted at loaded address.'; break;
      case 'load':
        s.address = s.switchRegister & ~1; this.loadedAddress=s.address;this.lastMemory="";s.data = this.word(s.address);
        message = `Loaded word-aligned address ${octal(s.address)}.`; break;
      case 'examine':
        if(this.lastMemory==='examine')s.address=(s.address+2)&ADDRESS_MASK;this.lastMemory='examine';
        s.data = this.word(s.address);
        message = `Memory[${octal(s.address)}] = ${octal(s.data, 6)}. CONT advances one word.`; break;
      case 'deposit': {
        const target=this.lastMemory==='deposit'?(s.address+2)&ADDRESS_MASK:s.address;
        if (!this.memory.has(target) && this.memory.size >= 1024)
          return { accepted: false, message: 'Demo scratch memory is full (1,024 words). Reset the demo to clear it.' };
        s.address=target;this.lastMemory='deposit';
        s.data = s.switchRegister & DATA_MASK; this.memory.set(s.address, s.data);
        s.storedWords = this.memory.size;
        message = `Deposited ${octal(s.data, 6)} at ${octal(s.address)} in demo memory.`; break;
      }
      case 'lamp-test': s.lampTest=true;this.lampTicks=10;message='Local lamp test pulse (500 ms).';break;
      case 'bus-cycle':s.busCycle=!s.busCycle;message='Step mode latch changed; bus-cycle execution is not simulated.';break;
      case 'address-select':
      case 'data-select': {
        const max = command.type === 'address-select' ? 7 : 3;
        if (!Number.isInteger(command.value) || command.value < 0 || command.value > max)
          return { accepted: false, message: 'Invalid selector position.' };
        if (command.type === 'address-select') s.addressSelect = command.value;
        else s.dataSelect = command.value;
        message = 'Demo selector updated; no MMU or microcode is emulated.'; break;
      }
      case 'reset': this.memory.clear();this.loadedAddress=0o1000;this.lastMemory='';this.lampTicks=0; this.state = initial(); message = 'Demo reset. Scratch memory cleared.'; break;
    }
    this.publish(); return { accepted: true, message };
  }
}
