import { test } from "node:test";
import assert from "node:assert/strict";
import { validateModem } from "../src/modem.ts";
const now = 10000;
const sample = {version:1,generation:"abcdef123456abcdef123456abcdef12-1",mode:"data",result:"CONNECT",reason:"",guest_connected:true,peer_connected:true,echo:false,guest_received:46,guest_written:44,peer_received:44,peer_written:46,sample_unix_ms:now,activity_unix_ms:now,profile:{guest:"UNIX V7",controller:"DC11",line:3,unit:0,guest_device:"/dev/tty03",simulator:"fixture-epoch",application:"cu",peer:"LOCAL",framing:"ascii7-raw-socket"}};
test("modem snapshot validates bounded observations and refuses stale claims",()=>{
 assert.equal(validateModem(sample,now).result,"CONNECT");
 for(const change of [{sample_unix_ms:now-3001},{peer_written:65537},{guest_connected:false},{mode:"carrier-detected"},{generation:"replacement"},{profile:{...sample.profile,line:2}},{reason:"bad\ntext"}]) assert.throws(()=>validateModem({...sample,...change},now));
});
