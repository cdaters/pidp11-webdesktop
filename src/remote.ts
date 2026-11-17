import { SimulatedPanelAdapter } from './model.ts';
import type { Command, CommandResult, PanelAdapter, PanelState } from './model.ts';
export interface RemoteState extends PanelState { controlRevision: number; epoch: number; owner: string; reason: string; blocked: boolean }
export interface RemoteStatus { connected: boolean; owns: boolean; owner: string; message: string }
interface Response { type: 'hello' | 'state' | 'ack'; session?: string; id?: number; accepted?: boolean; message?: string; state: RemoteState }
export function newer(current: RemoteState, incoming: RemoteState): boolean { return incoming.revision >= current.revision; }
export function requestFor(command: Command, state: RemoteState): {type: string; control: string; value?: number} | null {
  switch (command.type) {
    case 'switch': return {type:'set',control:'sr',value:state.switchRegister ^ (1 << command.bit)};
    case 'register': return {type:'set',control:'sr',value:command.value};
    case 'halt': return {type:'set',control:'halt',value:state.halted ? 0 : 1};
    case 'bus-cycle': return {type:'set',control:'bus-cycle',value:state.busCycle ? 0 : 1};
    case 'address-select': case 'data-select': return {type:'set',control:command.type,value:command.value};
    case 'continue': case 'start': case 'load': case 'examine': case 'deposit': case 'lamp-test': return {type:'pulse',control:command.type};
    case 'reset': return null;
  }
}
/** Only the current origin is reachable. Reconnect never acquires a lease or replays writes. */
export class RemotePanelAdapter implements PanelAdapter {
  private state: RemoteState = {...new SimulatedPanelAdapter().snapshot(),controlRevision:0,epoch:0,owner:'',reason:'Connecting to local mock server',blocked:false};
  private listeners = new Set<(state: Readonly<PanelState>) => void>();
  private socket?: WebSocket;
  private session = '';
  private id = 0;
  private connected = false;
  private closed = false;
  private delay = 250;
  private reconnect?: ReturnType<typeof setTimeout>;
  private heartbeat?: ReturnType<typeof setInterval>;
  private pending = new Map<number,{resolve:(r:CommandResult)=>void;timer:ReturnType<typeof setTimeout>}>();
  private onStatus: (status:RemoteStatus)=>void;
  constructor(onStatus:(status:RemoteStatus)=>void) {this.onStatus=onStatus;this.connect();}
  snapshot() {return Object.freeze({...this.state});}
  subscribe(fn:(state:Readonly<PanelState>)=>void) {this.listeners.add(fn);fn(this.snapshot());return ()=>{this.listeners.delete(fn);};}
  tick() {} // The server owns time; no local extrapolation of lamps.
  private status(message:string) {this.onStatus({connected:this.connected,owns:this.connected&&this.state.owner===this.session,owner:this.state.owner,message});}
  private publish() {for(const listener of this.listeners)listener(this.snapshot());}
  private connect() {
    if(this.closed)return;
    const url = new URL('/api/v1/ws',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';
    const socket = this.socket = new WebSocket(url);
    let lastMessage=Date.now();
    socket.onmessage=event=>{
      let response:Response;try{response=JSON.parse(event.data);}catch{socket.close();return;}
      if(!response.state||response.state.source!=='simulation'||!Number.isSafeInteger(response.state.revision)){socket.close();return;}
      lastMessage=Date.now();
      if(response.type==='hello') {this.session=response.session!;this.id=0;this.state=response.state;this.connected=true;this.delay=250;}
      else if(newer(this.state,response.state)) this.state=response.state;
      this.publish();
      if(response.type==='ack'&&response.id!==undefined){const pending=this.pending.get(response.id);if(pending){clearTimeout(pending.timer);this.pending.delete(response.id);pending.resolve({accepted:!!response.accepted,message:response.message??''});}}
      this.status(this.state.reason);
    };
    socket.onclose=()=>{
      this.connected=false;this.session='';if(this.heartbeat)clearInterval(this.heartbeat);
      for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.resolve({accepted:false,message:'Disconnected; command outcome uncertain. It will not be replayed.'});}this.pending.clear();
      this.status('Disconnected · controls disabled; reconnect starts as spectator');
      if(!this.closed){this.reconnect=setTimeout(()=>this.connect(),this.delay);this.delay=Math.min(4000,this.delay*2);}
    };
    socket.onerror=()=>socket.close();
    this.heartbeat=setInterval(()=>{
      if(Date.now()-lastMessage>3000){socket.close();return;}
      if(this.connected&&this.state.owner===this.session)void this.request({type:'renew'});
    },1000);
  }
  private request(body:Record<string,unknown>):Promise<CommandResult>{
    if(!this.connected||this.socket?.readyState!==WebSocket.OPEN)return Promise.resolve({accepted:false,message:'Waiting for a fresh server snapshot.'});
    if(this.pending.size>=8)return Promise.resolve({accepted:false,message:'Too many pending requests.'});
    const id=++this.id;
    return new Promise(resolve=>{const timer=setTimeout(()=>{this.pending.delete(id);resolve({accepted:false,message:'Acknowledgement timed out; command was not replayed.'});this.socket?.close();},2000);this.pending.set(id,{resolve,timer});this.socket!.send(JSON.stringify({id,epoch:this.state.epoch,expected:this.state.controlRevision,...body}));});
  }
  acquire() {return this.request({type:'acquire'});}
  release() {return this.request({type:'release'});}
  dispatch(command:Command):Promise<CommandResult>{
    if(!this.connected||this.state.owner!==this.session)return Promise.resolve({accepted:false,message:'Acquire mock control first; this browser is a spectator.'});
    const request=requestFor(command,this.state);return request?this.request(request):Promise.resolve({accepted:false,message:'Reset is available only in the offline demo.'});
  }
  close(){this.closed=true;if(this.reconnect)clearTimeout(this.reconnect);if(this.heartbeat)clearInterval(this.heartbeat);this.socket?.close();}
}
