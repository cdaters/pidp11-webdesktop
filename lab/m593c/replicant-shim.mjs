// Disposable compatibility shim. No host/guest operations. It splits the pinned
// upstream tutor prompt into bounded messages; production gateway limits remain
// unchanged. Native adapter status stays unknown, never inferred from Screen.
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFileSync } from 'node:fs';
const token = readFileSync('/root/m593c/token', 'utf8').trim();
const ca = readFileSync('/root/m593c/cert.pem');
createServer((req, res) => {
  if (req.url?.startsWith('/api/pidp11/')) {
    if (req.url.endsWith('/keys')) { res.writeHead(403); return res.end('Automatic keys disabled'); }
    if (req.url.endsWith('/status')) {
      // Upstream 6f8a2ac treats running:null as false (stopped). JSON null instead
      // reaches its existing unknown-status catch. This is a lab translation,
      // not a change to the truthful public adapter shape.
      res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end('null');
    }
    const upstream = httpRequest({hostname:'127.0.0.1',port:19002,path:req.url,method:'GET',headers:{Authorization:'Bearer '+token}}, reply => {res.writeHead(reply.statusCode);reply.pipe(res);});
    upstream.on('error',()=>{res.writeHead(502);res.end();});
    res.on('close',()=>upstream.destroy());upstream.end();return;
  }
  if (req.method !== 'POST' || req.url !== '/v1/chat/completions') { res.writeHead(404); return res.end(); }
  let bytes = 0, chunks = [];
  req.on('data', chunk => { bytes += chunk.length; if(bytes > 24576) req.destroy(); else chunks.push(chunk); });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks));
      if (body.tools || body.tool_choice || body.stream || body.model !== 'gemma4:12b' || !Array.isArray(body.messages)) throw Error('unsupported');
      body.messages = body.messages.flatMap(message => {
        if (message.role !== 'system') return [message];
        if (typeof message.content !== 'string' || Buffer.byteLength(message.content)>8192) throw Error('system bound');
        const parts = []; let text = '';
        for (const character of message.content) {
          if(Buffer.byteLength(text+character)>4096) {parts.push({role:'system',content:text});text='';}
          text+=character;
        }
        if(text)parts.push({role:'system',content:text});
        return parts;
      });
    } catch {res.writeHead(400);res.end('Unsupported bounded request');return;}
    const upstream=httpsRequest({hostname:'127.0.0.1',port:11435,path:'/v1/chat/completions',method:'POST',ca,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'}}, reply=>{res.writeHead(reply.statusCode);reply.pipe(res);});
    upstream.setTimeout(22000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    res.on('close',()=>upstream.destroy());
    upstream.end(JSON.stringify(body));
  });
}).listen(19001,'127.0.0.1');
