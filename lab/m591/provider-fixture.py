"""Deterministic local provider fixture; no model, credential or external network.
Only the two Ollama-shaped routes used by the explicit lab configuration exist.
"""
import http.server,json
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def send(self,payload):
  data=json.dumps(payload).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def do_GET(self):
  if self.path!='/api/tags':self.send_error(404);return
  self.send({'models':[{'name':'historical-fixture'}]})
 def do_POST(self):
  if self.path!='/api/chat':self.send_error(404);return
  size=int(self.headers.get('Content-Length','0'))
  if not 0<size<=24576:self.send_error(413);return
  request=json.loads(self.rfile.read(size))
  if request.get('model')!='historical-fixture':self.send_error(400);return
  self.send({'done':True,'message':{'content':'DETERMINISTIC HTTP FIXTURE — no model inference. UNIX V7 uses ls to list directories. Octal uses digits 0 through 7. This reply has no machine observations or execution authority.'}})
http.server.HTTPServer(('127.0.0.1',19191),Handler).serve_forever()
