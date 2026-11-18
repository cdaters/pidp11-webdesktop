import { decKey } from "./terminal-protocol.ts";
import { terminalDocument } from "./terminal.ts";
import type { Terminal } from "@xterm/xterm";

/** Require a reviewed ASCII line without Return; submitting it is a separate action. */
export function safeGuestPaste(text: string): string {
  if (!text.length || text.length > 256 || /[^\x20-\x7e\t]/.test(text)) throw Error("Paste one ASCII line, at most 256 characters, without Return or control characters.");
  return text;
}
/** Mount one viewer of a configured guest line, initially without keyboard ownership.
 * The caller owns host and must invoke the returned cleanup when its window closes.
 * This view owns xterm, its socket and renewal timer; it never owns guest lifecycle. */
export async function mountGuestTerminal(host: HTMLElement) {
  const [{Terminal}] = await Promise.all([import("@xterm/xterm"),import("@xterm/xterm/css/xterm.css")]);
  if (!host.isConnected) return () => {};
  host.innerHTML = `<div class="guest-heading"><strong>Real guest terminal · isolated laboratory</strong><span class="source-tag">NOT CONNECTED</span></div>
    <form class="guest-login"><label>Terminal access token <input type="password" autocomplete="off" aria-label="Terminal access token"></label><button>Sign in</button></form>
    <div class="terminal-toolbar"><select aria-label="Guest endpoint" disabled></select><button data-connect disabled>Connect</button><button data-disconnect disabled>Disconnect</button><button data-acquire disabled>Acquire keyboard</button><button data-release disabled>Release keyboard</button><button data-logout disabled>Sign out</button></div>
    <div class="guest-status" role="status">Sign in to list configured guest lines. No automatic keyboard takeover.</div>
    <div class="guest-screen"><div class="guest-xterm" aria-label="Real guest VT100 terminal"></div></div>
    <details class="guest-paste"><summary>Review paste</summary><label>One line, without Return <input type="text" maxlength="256" aria-label="Reviewed guest paste" autocomplete="off"></label><button data-paste disabled>Send reviewed paste</button></details>
    <label class="guest-erase">Backspace <select aria-label="Backspace encoding"><option value="127">DEL · VT100</option><option value="8">BS</option><option value="35"># · UNIX V7 erase</option></select></label>
    <div class="terminal-foot">VT100-style subset · ASCII7 · fixed 80 × 24 · Backspace encoding is explicit · shared guest line may already be logged in. Panel and mock peripherals remain separate.</div>`;
  const $=<T extends HTMLElement>(selector:string)=>host.querySelector<T>(selector)!;
  const status=$(".guest-status"),badge=$(".source-tag"),selector=$<HTMLSelectElement>("select");
  const makeTerminal=()=>new Terminal({documentOverride:terminalDocument(),cols:80,rows:24,scrollback:300,fontFamily:'Menlo, Consolas, monospace',fontSize:13,lineHeight:1.15,cursorBlink:false,screenReaderMode:true,convertEol:false,allowProposedApi:false,theme:{background:'#101d1b',foreground:'#c4d8bc',cursor:'#e1ddb3'}});
  let term:Terminal=makeTerminal();
  term.open($(".guest-xterm"));
  let socket:WebSocket|undefined, owner=false,connected=false,epoch=0,seq=0,canInput=false,csrf="",disposed=false,queued=0;
  const controls=()=>{
    const open=socket?.readyState===WebSocket.OPEN;
    $<HTMLButtonElement>("[data-connect]").disabled=!selector.options.length || !!socket;
    $<HTMLButtonElement>("[data-disconnect]").disabled=!socket;
    $<HTMLButtonElement>("[data-acquire]").disabled=!open || !connected || !canInput || owner;
    $<HTMLButtonElement>("[data-release]").disabled=!owner;
    $<HTMLButtonElement>("[data-paste]").disabled=!owner;
    selector.disabled=!!socket || !selector.options.length;
    badge.textContent=connected ? owner ? "KEYBOARD OWNER" : "REAL GUEST · READ-ONLY" : "DISCONNECTED";
  };
  const send = (message: object) => {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    if (socket.bufferedAmount > 8192) {
      disconnect('Input backlog; disconnected, no replay');
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  };
  // Invalidate the socket before closing it so late callbacks cannot update a new view.
  const disconnect = (message = 'Disconnected · guest continues independently') => {
    const old = socket;
    socket = undefined;
    owner = false;
    connected = false;
    old?.close();
    status.textContent = message;
    controls();
  };
  const input=(data:string)=>{
    if(!owner || !connected)return;
    if(!data.length || data.length>256 || /[^\x00-\x7f]/.test(data)){status.textContent='Input rejected: ASCII7, at most 256 bytes per event';return;}
    if(send({type:'input',epoch,seq:seq+1,data:btoa(data)}))seq++;
  };
  const configureKeys=()=>term.attachCustomKeyEventHandler(e=>{
    if(e.type!=='keydown'||e.altKey||e.ctrlKey||e.metaKey)return true;
    const encoded= e.code==='Backspace'?String.fromCharCode(Number($<HTMLSelectElement>('[aria-label="Backspace encoding"]').value)):decKey(e.code,term.modes.applicationKeypadMode,term.modes.applicationCursorKeysMode);
    if(encoded===undefined)return true;e.preventDefault();term.input(encoded,true);return false;
  });
  configureKeys();
  let handler=term.onData(input);
  // Stop native clipboard paste before xterm; nothing is sent until explicit review.
  const paste=(e:ClipboardEvent)=>{e.preventDefault();e.stopImmediatePropagation();const value=e.clipboardData?.getData('text/plain')??'';const box=$<HTMLInputElement>('.guest-paste input');try { box.value=safeGuestPaste(value); status.textContent='Paste captured for review; nothing sent'; } catch (error) { box.value=''; status.textContent=(error as Error).message; } $<HTMLDetailsElement>('.guest-paste').open=true;box.focus();};
  $(".guest-screen").addEventListener('paste',paste,true);
  $<HTMLButtonElement>('[data-paste]').onclick=()=>{try{input(safeGuestPaste($<HTMLInputElement>('.guest-paste input').value));$<HTMLInputElement>('.guest-paste input').value='';term.focus();}catch(e){status.textContent=String((e as Error).message);}};
  const list=async()=>{const [session,endpoints]=await Promise.all([fetch('/api/v1/session'),fetch('/api/v1/terminals')]);if(!session.ok||!endpoints.ok)throw Error('Guest terminal service unavailable or sign-in required');const s=await session.json();const rows=await endpoints.json();if(disposed)return;csrf=s.csrf;canInput=!!s.capabilities['terminal.input'];selector.replaceChildren(...rows.map((e:{id:string,label:string})=>{const o=document.createElement('option');o.value=e.id;o.textContent=e.label;return o;}));$<HTMLButtonElement>('[data-logout]').disabled=false;status.textContent='Authenticated. Select a guest line and connect read-only.';controls();};
  $<HTMLFormElement>('form').onsubmit=async e=>{e.preventDefault();const box=$<HTMLInputElement>('input[type=password]'),token=box.value;box.value='';try{const r=await fetch('/api/v1/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});if(!r.ok)throw Error('Terminal sign-in rejected');await list();}catch(e){status.textContent=(e as Error).message;}};
  $<HTMLButtonElement>('[data-connect]').onclick=()=>{
    if(socket || !selector.value)return;
    const url=new URL(`/api/v1/terminals/${encodeURIComponent(selector.value)}/ws`,location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    // A fresh parser prevents a partial escape sequence from the old connection
    // consuming new output. Keyboard authority and input sequence also start fresh.
    const ws = new WebSocket(url);
    socket = ws;
    seq = 0;
    owner = false;
    connected = false;
    queued = 0;
    handler.dispose();
    term.dispose();
    term = makeTerminal();
    term.open($(".guest-xterm"));
    configureKeys();
    handler = term.onData(input);
    status.textContent = 'Connecting · fresh display; no terminal history replay';
    controls();
    ws.onmessage=e=>{
      if(socket!==ws)return;
      try{const f=JSON.parse(e.data);
        if(f.type==='state'){owner=!!f.owner;connected=!!f.connected;epoch=f.epoch;status.textContent=f.message || (connected ? owner ? 'Connected · this window owns the guest keyboard' : f.busy ? 'Connected read-only · another viewer owns the keyboard' : 'Connected read-only · acquire keyboard explicitly' : 'Guest line unavailable · operator must reconnect it');controls();}
        else if(f.type==='output'){
          const raw=atob(f.data);if(queued+raw.length>65536)throw Error('Renderer backlog');queued+=raw.length;
          const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
          // Preserve parser state across chunks on this connection. Return server
          // credit only after xterm consumes the bytes, and never to a newer socket.
          term.write(bytes, () => {
            if (socket === ws) {
              queued -= bytes.length;
              send({ type: 'ack', bytes: bytes.length });
            }
          });
        }else throw Error('Invalid terminal frame');
      }catch{disconnect('Terminal protocol or output limit error; no replay');}
    };
    ws.onclose=()=>{if(socket===ws)disconnect('Disconnected · reconnect explicitly; guest state is not inferred');};
    ws.onerror=()=>{if(socket===ws)disconnect('Connection unavailable · guest may still be running');};
  };
  $<HTMLButtonElement>('[data-acquire]').onclick=()=>{send({type:'acquire'});term.focus();};
  $<HTMLButtonElement>('[data-release]').onclick=()=>{send({type:'release'});owner=false;controls();};
  $<HTMLButtonElement>('[data-disconnect]').onclick=()=>disconnect();
  $<HTMLButtonElement>('[data-logout]').onclick=async()=>{disconnect('Signed out locally');selector.replaceChildren();canInput=false;controls();const r=await fetch('/api/v1/logout',{method:'POST',headers:{'X-CSRF-Token':csrf}});csrf='';$<HTMLButtonElement>('[data-logout]').disabled=true;if(!r.ok)status.textContent='Local disconnect; server logout unconfirmed, session expiry still applies';};
  const heartbeat=setInterval(()=>{if(owner)send({type:'renew',epoch});},2000);
  const hide=()=>disconnect('Page closed · guest connection remains independent');window.addEventListener('pagehide',hide);
  // Session inspection is read-only. It never connects to a line or grants input.
  void list().catch(()=>{});
  return () => {
    disposed = true;
    clearInterval(heartbeat);
    window.removeEventListener('pagehide', hide);
    disconnect();
    handler.dispose();
    term.dispose();
  };
}
