import { SimulatedPanelAdapter, octal } from './model.ts';
import type { Command, PanelAdapter } from './model.ts';
import { panelMarkup, bindPanel, renderPanel, displayedData } from './panel.ts';
import { RemotePanelAdapter } from './remote.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
<header class="topbar"><a class="wordmark" href="#panel" aria-label="PiDP-11 Web Desktop home"><span class="mark">11</span><span>PiDP-11 <span class="wordmark-sub">/ WEB DESKTOP</span></span></a><span class="mode"><span class="status-dot"></span> SIMULATION <span class="mode-detail">· MOCK SIGNALS ONLY</span></span></header>
<div class="workspace">
  <nav class="rail" aria-label="Workspace"><button class="nav-button active" data-view="panel" aria-current="page"><span class="nav-icon">▤</span>Panel</button><button class="nav-button" data-view="console"><span class="nav-icon">&gt;_</span>Console</button><button class="nav-button" data-view="library"><span class="nav-icon">▱</span>Library</button><span class="rail-bottom">11 / 70</span></nav>
  <main>
    <section id="view-panel" class="view">
      <div class="page-heading"><div><p class="eyebrow">OPERATOR WORKSPACE <span>/ 01</span></p><h1>A little mainframe.<br class="mobile-break"> A living front panel.</h1><p class="intro">PDP-11/70 · Explore the switches. Follow the lights.</p></div><button id="reset" class="quiet-button">↺ Reset demo</button></div>
      <div class="connection-bar"><span id="connection-status">Offline browser simulation</span><button id="acquire-control" class="quiet-button" hidden>Acquire mock control</button><button id="release-control" class="quiet-button" hidden>Release control</button><a id="offline-link" href="?" hidden>Open offline demo</a></div><div class="instrument-top"><span><span class="live-dot"></span> <span id="run-label">SYNTHETIC ACTIVITY</span></span><span id="rate-label">20 Hz display · simulated data</span></div>
      <p class="scroll-hint">Swipe the panel sideways to reach all 22 switches →</p><div class="panel-shell"><div id="panel" class="panel-scroll">${panelMarkup()}</div>
        <div class="operator-controls" aria-label="Operator controls">

          <div class="selector-row"><label>ADDRESS SELECT<select id="address-select"><option value="1">USER D</option><option value="3">SUPER D</option><option value="6">KERNEL D</option><option value="4" selected>CONS PHY</option><option value="0">USER I</option><option value="2">SUPER I</option><option value="5">KERNEL I</option><option value="7">PROG PHY</option></select></label><label>DATA SELECT<select id="data-select"><option value="2">DATA PATHS</option><option value="3">BUS REG</option><option value="0">µADRS FPP/CPU</option><option value="1">DISPLAY REGISTER</option></select></label><p class="selector-note">Selectors use illustrative demo values.<br>CPU/MMU and bus-cycle execution are not emulated.</p></div>
        </div>
      </div>
      <div class="readouts"><div><span class="readout-label">ADDRESS <small>22 BIT</small></span><output aria-live="off" id="address-value">00001000</output><span class="unit">OCT</span></div><div><span class="readout-label">DATA <small>16 BIT</small></span><output aria-live="off" id="data-value">012700</output><span class="unit">OCT</span></div><div><span class="readout-label">SWITCH REGISTER</span><output aria-live="off" id="sr-value">00001000</output><span class="unit">OCT</span></div><div class="ownership"><span class="readout-label">CONTROL SOURCE</span><strong id="owner-label"><span class="status-dot"></span> This browser</strong><span class="ownership-note">Isolated demonstration</span></div></div>
      <div id="notice" class="notice" role="status">Initially halted. To animate: select ENABLE, then press CONT. Memory controls work while halted.</div>
      <div class="bottom-grid"><section class="guide"><p class="eyebrow">TRY THE PANEL</p><h2>Deposit your first word.</h2><ol><li>Set <b>ENABLE / HALT</b> to HALT.</li><li>Choose an address with the switches, then <b>LOAD ADRS</b>.</li><li>Set a data word, press <b>DEP</b>, then <b>EXAM</b> to read it.</li></ol><p class="fine-print">Consecutive EXAM or DEP advances one word. ENABLE alone does not resume; press CONT.</p></section><section class="register-editor"><p class="eyebrow">DIRECT ENTRY</p><h2>Set the switch register.</h2><form id="register-form"><label for="register-input">Octal value · 0–17777777</label><div class="input-row"><input id="register-input" name="register" value="00001000" inputmode="numeric" autocomplete="off" maxlength="8" spellcheck="false" aria-describedby="register-help"><button class="primary-button" type="submit">Set switches <span>↵</span></button></div><p id="register-help" class="fine-print">Or select a paddle above. Tab, then Space or Enter, toggles it.</p></form></section></div>
    </section>
    <section id="view-console" class="view" hidden><div class="page-heading"><div><p class="eyebrow">OPERATOR WORKSPACE <span>/ 02</span></p><h1>A console for exploration.</h1><p class="intro">A local command demo, connected to the same simulated panel.</p></div><button id="clear-console" class="quiet-button">Clear output</button></div><div class="terminal-window"><div class="terminal-title"><span class="status-dot"></span> DEMO CONSOLE <span>NO SHELL · NO GUEST OS</span></div><pre id="terminal-output" tabindex="0" aria-label="Demo console output"></pre><form id="terminal-form"><label for="terminal-input">demo&gt;</label><input id="terminal-input" autocomplete="off" spellcheck="false" aria-label="Demo console command"><button type="submit" class="quiet-button">Send ↵</button></form></div><p class="console-hint">Try <code>help</code>, <code>halt</code>, <code>sr 1000</code>, <code>load</code>, <code>sr 12345</code>, <code>deposit</code>, <code>examine</code>. Arrow keys recall commands.</p></section>
    <section id="view-library" class="view" hidden><div class="page-heading"><div><p class="eyebrow">OPERATOR WORKSPACE <span>/ 03</span></p><h1>A home for historic systems.</h1><p class="intro">Planning catalog · illustrative profiles, no disk images attached.</p></div></div><div class="library-grid">${[['UNIX V6','Time-sharing, 1975','RK disk family','unix'],['RT-11','Single-user, real-time','RK / RL disk families','rt'],['RSX-11M+','Multi-user, real-time','Profile to be validated','rsx']].map(([name,desc,device,key])=>`<article class="system-card"><div class="disk-art" aria-hidden="true">◉</div><p class="eyebrow">PLANNED PROFILE</p><h2>${name}</h2><p>${desc}</p><dl><dt>Media</dt><dd>${device}</dd><dt>Availability</dt><dd>Not installed by this project</dd></dl><button class="quiet-button" data-profile="${key}">View profile notes →</button></article>`).join('')}</div><div id="profile-notes" class="profile-notes" role="status">Select a profile for integration notes. This catalog does not inspect the Raspberry Pi.</div></section>
    <footer><span>PiDP-11 Web Desktop <span class="footer-version">/ MOCK MILESTONE 0.2</span></span><span>Simulated panel · no emulator or GPIO connection</span></footer>
  </main>
</div>`;
const remoteMode = new URLSearchParams(location.search).get('backend') === 'mock';
let remote: RemotePanelAdapter | undefined;
const adapter: PanelAdapter = remoteMode ? (remote = new RemotePanelAdapter(status => {
  $('connection-status').textContent = status.message;
  $('owner-label').textContent = status.owns ? 'This browser' : status.owner ? 'Another browser' : 'Spectator';
  $<HTMLButtonElement>('acquire-control').disabled = !status.connected || !!status.owner;
  $<HTMLButtonElement>('release-control').disabled = !status.owns;
  panel.classList.toggle('read-only',!status.owns);
  panel.setAttribute('aria-disabled',String(!status.owns));
})) : new SimulatedPanelAdapter();
const panel = document.querySelector<HTMLElement>('#panel')!;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const notice = $('notice');
async function dispatch(command: Command) {
  const result = await adapter.dispatch(command);
  notice.textContent = result.message; notice.classList.toggle('error', !result.accepted);
  return result;
}
bindPanel(panel, dispatch);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

adapter.subscribe(s => {
  renderPanel(panel, s);
  $('address-value').textContent = octal(s.address);
  $('data-value').textContent = octal(displayedData(s), 6);
  $('sr-value').textContent = octal(s.switchRegister);
  $('run-label').textContent = s.running ? 'SYNTHETIC ACTIVITY' : s.halted ? 'HALTED · SCRATCH MEMORY READY' : 'STOPPED · ENABLE SELECTED';
  $<HTMLSelectElement>('address-select').value = String(s.addressSelect);
  $<HTMLSelectElement>('data-select').value = String(s.dataSelect);
});
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b => {
  b.addEventListener('click', () => dispatch({ type: b.dataset.command } as Command));
});
$('reset').addEventListener('click', () => {void dispatch({type:'reset'});});
$('register-form').addEventListener('submit', e => {
  e.preventDefault(); const value = $<HTMLInputElement>('register-input').value.trim();
  if (!/^[0-7]{1,8}$/.test(value)) { notice.textContent = 'Use only octal digits 0–7 (up to 17777777).'; notice.classList.add('error'); return; }
  dispatch({ type: 'register', value: parseInt(value, 8) });
});
(['address', 'data'] as const).forEach(name => {
  $(`${name}-select`).addEventListener('change', e => dispatch({ type: `${name}-select`, value: Number((e.target as HTMLSelectElement).value) }));
});
function showView(next: string) {
  if (!['panel', 'console', 'library'].includes(next)) next = 'panel';
  document.querySelectorAll<HTMLElement>('.view').forEach(s => { s.hidden = s.id !== `view-${next}`; });
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => {
    b.classList.toggle('active', b.dataset.view === next);
    if (b.dataset.view === next) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (next === 'console') $('terminal-input').focus();
}
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.view!; }));
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
showView(location.hash.slice(1) || 'panel');
// Only the offline adapter has a browser timer; the remote adapter owns no clock.
let timer: ReturnType<typeof setInterval> | undefined;
function schedule() {
  if (timer) clearInterval(timer);
  timer = undefined;
  if (!document.hidden && !remoteMode) timer = setInterval(() => adapter.tick(), 50);
}
document.addEventListener('visibilitychange', schedule); schedule();
reducedMotion.addEventListener('change', () => { if (reducedMotion.matches && !adapter.snapshot().halted) dispatch({ type: 'halt' }); });
window.addEventListener('pagehide', () => { if (timer) clearInterval(timer); });
window.addEventListener('pageshow', schedule);

const terminal = $('terminal-output');
let lines: string[] = [];
const history: string[] = []; let historyIndex = 0;
function print(line: string) { lines.push(line); lines = lines.slice(-200); terminal.textContent = lines.join('\n'); terminal.scrollTop = terminal.scrollHeight; }
print('PiDP-11 / simulated console\nNo guest operating system or host shell is running here.\nType help for available demonstration commands.\n');
async function consoleCommand(input: string) {
  const [name, arg, ...extra] = input.trim().toLowerCase().split(/\s+/);
  if (extra.length || (name !== 'sr' && arg !== undefined)) return 'Unexpected arguments. Type help.';
  if (name === 'help') return 'help | status | halt | run | step | sr OCTAL | load | examine | deposit | start | lamps | clear\nMemory: halt → sr 1000 → load → sr 12345 → deposit → examine\nThis is a command demo, not a VT terminal or PDP-11 emulator.';
  if (name === 'clear') { lines = []; terminal.textContent = ''; return ''; }
  if (name === 'status') { const s = adapter.snapshot(); return `${s.running ? 'RUNNING' : s.halted ? 'HALTED' : 'STOPPED'} (simulation)  ADDRESS ${octal(s.address)}  DATA ${octal(s.data, 6)}  SR ${octal(s.switchRegister)}\nScratch words: ${s.storedWords} / 1024`; }
  if (name === 'sr') {
    if (!arg || !/^[0-7]{1,8}$/.test(arg)) return 'Usage: sr OCTAL (0–17777777)';
    return (await dispatch({ type: 'register', value: parseInt(arg, 8) })).message;
  }
  if (name === 'halt' || name === 'run') {
    const halted = adapter.snapshot().halted;
    if (name==='halt' && halted) return `Already ${halted ? 'halted' : 'running'}.`;
    if(name==='halt')return (await dispatch({type:'halt'})).message;
    if(halted)await dispatch({type:'halt'});return (await dispatch({type:'continue'})).message;
  }
  const map: Record<string, Command> = { step: { type: 'continue' }, load: { type: 'load' }, examine: { type: 'examine' }, deposit: { type: 'deposit' }, start: { type: 'start' }, lamps: { type: 'lamp-test' } };
  if (name === 'step' && !adapter.snapshot().halted) return 'Use halt before step.';
  return Object.hasOwn(map, name) ? (await dispatch(map[name])).message : 'Unknown demo command. Type help.';
}
$('terminal-form').addEventListener('submit', async e => {
  e.preventDefault(); const input = $<HTMLInputElement>('terminal-input'); const command = input.value.trim().slice(0, 120);
  if (!command) return; print(`demo> ${command}`); history.push(command); if (history.length > 50) history.shift(); historyIndex = history.length;
  const result = await consoleCommand(command); if (result) print(result); input.value = '';
});
$('terminal-input').addEventListener('keydown', e => {
  const event = e as KeyboardEvent;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault(); historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
    $<HTMLInputElement>('terminal-input').value = history[historyIndex] ?? '';
  }
});
$('clear-console').addEventListener('click', () => { lines = []; terminal.textContent = ''; $('terminal-input').focus(); });
const notes: Record<string, string> = {
  unix: 'UNIX V6 · Future profile will reference validated boot configuration and exclusive working disk images. A clean guest shutdown is required before stopping the emulator. No image is bundled.',
  rt: 'RT-11 · Future profile must match the disk controller and image format supported by the selected SIMH configuration. Attach and detach will require a verified safe emulator state. No image is bundled.',
  rsx: 'RSX-11M+ · Future profile needs a validated guest version, controller configuration and orderly shutdown procedure. Existing installation files will be inventoried only in an authorized integration phase.'
};
document.querySelectorAll<HTMLButtonElement>('[data-profile]').forEach(b => b.addEventListener('click', () => { $('profile-notes').textContent = notes[b.dataset.profile!]; }));

if(remote){
  $('acquire-control').hidden=false;$('release-control').hidden=false;$('offline-link').hidden=false;
  $<HTMLButtonElement>('reset').disabled=true;
  $('acquire-control').addEventListener('click',async()=>{const result=await remote!.acquire();notice.textContent=result.message;});
  $('release-control').addEventListener('click',async()=>{const result=await remote!.release();notice.textContent=result.message;});
  window.addEventListener('pagehide',()=>remote!.close());
  window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
}
