"""Mac-only fixed TLS forwarding through docker exec into network-none lab.
No published container ports, arbitrary targets, shell, or credential inspection.
This test adapter is not part of the deployment architecture.
"""
import socketserver,subprocess,threading
CODE="""import socket,sys,threading
s=socket.create_connection(('127.0.0.1',8445))
def upload():
 try:
  while b:=sys.stdin.buffer.read1(16384):s.sendall(b)
 finally:
  try:s.shutdown(socket.SHUT_WR)
  except OSError:pass
threading.Thread(target=upload,daemon=True).start()
try:
 while b:=s.recv(16384):sys.stdout.buffer.write(b);sys.stdout.buffer.flush()
finally:s.close()
"""

class Handler(socketserver.BaseRequestHandler):
 def handle(self):
  p=subprocess.Popen(['docker','--context','orbstack','exec','-i','pidp11-m526-v7','python3','-u','-c',CODE],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL)
  def incoming():
   try:
    while data:=self.request.recv(16384):p.stdin.write(data);p.stdin.flush()
   except (OSError,BrokenPipeError):pass
   finally:
    try:p.stdin.close()
    except OSError:pass
  threading.Thread(target=incoming,daemon=True).start()
  try:
   while data:=p.stdout.read1(16384):self.request.sendall(data)
  except (OSError,BrokenPipeError):pass
  finally:
   p.terminate()
   try:p.wait(timeout=2)
   except subprocess.TimeoutExpired:p.kill();p.wait()
class Server(socketserver.ThreadingTCPServer):
 allow_reuse_address=True;daemon_threads=True
 slots=threading.BoundedSemaphore(32)
 def process_request(self,request,address):
  if not self.slots.acquire(blocking=False):self.shutdown_request(request);return
  try:super().process_request(request,address)
  except BaseException:self.slots.release();raise
 def process_request_thread(self,request,address):
  try:super().process_request_thread(request,address)
  finally:self.slots.release()
with Server(('127.0.0.1',8445),Handler) as server:server.serve_forever()
