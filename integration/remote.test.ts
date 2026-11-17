import {test} from 'node:test';
import assert from 'node:assert/strict';
import {RemotePanelAdapter,type RemoteState,type RemoteStatus} from '../src/remote.ts';
import {SimulatedPanelAdapter} from '../src/model.ts';
// Deterministic browser-transport fixture; real HTTP/WebSocket interoperability lives in Go tests.
class SocketFixture {
 static OPEN=1;static sockets:SocketFixture[]=[];
 readyState=1;sent:string[]=[];
 onmessage:((event:{data:string})=>void)|null=null;
 onclose:(()=>void)|null=null;onerror:(()=>void)|null=null;
 readonly url:URL;
 constructor(url:URL){this.url=url;SocketFixture.sockets.push(this);}
 send(data:string){this.sent.push(data);}
 receive(value:unknown){this.onmessage?.({data:JSON.stringify(value)});}
 close(){if(this.readyState!==3){this.readyState=3;this.onclose?.();}}
}
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
test('remote adapter discards pending commands and ownership on reconnect; fresh epoch may reset sequence',async()=>{
 const oldSocket=Object.getOwnPropertyDescriptor(globalThis,'WebSocket');const oldLocation=Object.getOwnPropertyDescriptor(globalThis,'location');
 Object.defineProperty(globalThis,'location',{value:new URL('http://127.0.0.1:8080/?backend=mock'),configurable:true});
 Object.defineProperty(globalThis,'WebSocket',{value:SocketFixture,configurable:true});
 let status:RemoteStatus={connected:false,owns:false,owner:'',message:''};
 const adapter=new RemotePanelAdapter(s=>status=s);
 const state:RemoteState={...new SimulatedPanelAdapter().snapshot(),revision:10,controlRevision:3,epoch:2,owner:'',reason:'fixture',blocked:false};
 try{
  const first=SocketFixture.sockets[0];assert.equal(first.url.host,'127.0.0.1:8080');
  first.receive({type:'hello',session:'first',state});assert.equal(status.owns,false);
  const acquisition=adapter.acquire();const request=JSON.parse(first.sent.at(-1)!);
  first.receive({type:'ack',id:request.id,accepted:true,state:{...state,revision:11,owner:'first',epoch:3}});
  assert.equal((await acquisition).accepted,true);assert.equal(status.owns,true);
  first.receive({type:'state',state:{...state,revision:9,switchRegister:0}});assert.equal(adapter.snapshot().switchRegister,0o1000);
  const pending=adapter.dispatch({type:'start'});first.close();assert.equal((await pending).accepted,false);assert.equal(status.connected,false);
  const end=Date.now()+1500;while(SocketFixture.sockets.length<2&&Date.now()<end)await pause(10);
  assert.equal(SocketFixture.sockets.length,2);const second=SocketFixture.sockets[1];
  second.receive({type:'hello',session:'second',state:{...state,revision:0,epoch:0}});
  assert.equal(adapter.snapshot().revision,0);assert.equal(status.owns,false);assert.equal(second.sent.length,0);
  assert.equal((await adapter.dispatch({type:'continue'})).accepted,false);
 }finally{adapter.close();if(oldSocket)Object.defineProperty(globalThis,'WebSocket',oldSocket);if(oldLocation)Object.defineProperty(globalThis,'location',oldLocation);else Reflect.deleteProperty(globalThis,'location');}
});
