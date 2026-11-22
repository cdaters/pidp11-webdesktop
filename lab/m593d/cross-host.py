"""Mac-only disposable two-container network lab. Never contacts a physical Pi.
Build the lab image and ARM64 probes first; see README. Creates private keys under
.research/m593d/cross-host, never reuses owner SSH identities. Removes only its
named containers/network and task-owned SSH process on exit, retaining evidence.
"""
import json, os, pathlib, secrets, subprocess, time
root=pathlib.Path('.research/m593d/cross-host').resolve()
root.mkdir(mode=0o700)
model='pidp11-m593d-model'; client='pidp11-m593d-client'; network='pidp11-m593d-net'; control='pidp11-m593d-management'
results={}; tunnel=None; created=[]
def run(args,**kw):
 try:return subprocess.check_output(args,stderr=subprocess.STDOUT,timeout=kw.pop('timeout',40),**kw).decode()
 except subprocess.CalledProcessError as error:
  (root/'last-failure.log').write_bytes(error.output);raise
def dex(host,*args): return run(['docker','exec',host,*args])
def background(host,command): dex(host,'sh','-c',command)
def sshargs(key,pin):
 return ['ssh','-N','-T','-p','2223','-i',str(root/key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(root/pin),'-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=2','-o','ServerAliveCountMax=1']
def forward_client():
 background(client,'ssh -N -T -p 2222 -i /root/m593d/client-key -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/root/m593d/client-known -o ExitOnForwardFailure=yes -o ServerAliveInterval=2 -o ServerAliveCountMax=1 -L 127.0.0.1:11435:127.0.0.1:11436 root@'+model+' >/root/m593d/forward.log 2>&1 & echo $! >/root/m593d/forward.pid')
 time.sleep(1)
def gateway(): background(model,'/root/m593d/model-gateway -cert /root/m593d/cert.pem -key /root/m593d/key.pem -token-file /root/m593d/token -model gemma4:12b >/root/m593d/gateway.log 2>&1 & echo $! >/root/m593d/gateway.pid')
def curl(path='/v1/models',auth=True,extra=[]):
 args=['curl','--max-time','25','-sS','--cacert','/root/m593d/cert.pem']
 if auth: args+=['--config','/root/m593d/curl-secret']
 return dex(client,*args,*extra,'-w','\n%{http_code}','https://127.0.0.1:11435'+path)
def expect(code,**kw):
 value=curl(**kw);assert value.endswith(str(code)),value;return value
try:
 for name in ['host-key','client-key','reverse-key']:
  run(['ssh-keygen','-q','-t','ed25519','-N','','-f',str(root/name)])
 hostpub=(root/'host-key.pub').read_text()
 (root/'mac-known').write_text('[127.0.0.1]:2223 '+hostpub)
 (root/'client-known').write_text('['+model+']:2222 '+hostpub)
 (root/'authorized_keys').write_text('restrict,port-forwarding,permitopen="127.0.0.1:11436",permitlisten="127.0.0.1:1",command="/bin/false" '+(root/'client-key.pub').read_text()+'restrict,port-forwarding,permitopen="127.0.0.1:1",permitlisten="127.0.0.1:11434",command="/bin/false" '+(root/'reverse-key.pub').read_text())
 run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(root/'key.pem'),'-out',str(root/'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1,DNS:localhost'])
 token=secrets.token_hex(24)
 (root/'token').write_text(token+'\n');(root/'curl-secret').write_text('header = "Authorization: Bearer '+token+'"\n')
 for name in ['read-token','share-token','login-token']:(root/name).write_text(secrets.token_hex(24)+'\n')
 (root/'sshd.conf').write_text('''Port 2222
ListenAddress 0.0.0.0
HostKey /root/m593d/host-key
AuthorizedKeysFile /root/m593d/authorized_keys
PidFile /run/m593d-sshd.pid
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitRootLogin prohibit-password
PermitTTY no
AllowAgentForwarding no
X11Forwarding no
AllowTcpForwarding yes
AllowStreamLocalForwarding no
PermitOpen 127.0.0.1:11436
PermitListen 127.0.0.1:11434
ForceCommand /bin/false
StrictModes yes
''')
 for p in root.iterdir(): p.chmod(0o600)
 run(['docker','network','create','--internal',network]);created.append(network)
 run(['docker','network','create',control]);created.append(control)
 for name in [model,client]:
  args=['docker','run','-d','--name',name,'--hostname',name,'--network',control if name==model else network,'--memory','256m','--memory-swap','256m','--cpus','1']
  if name==model:args+=['-p','127.0.0.1:2223:2222']
  else:args+=['-p','127.0.0.1:8510:8510']
  run(args+['pidp11-m593d-lab:local']);created.append(name)
  if name==model: run(['docker','network','connect',network,name])
  else:run(['docker','network','connect',control,name])
  dex(name,'mkdir','-m','700','/root/m593d')
  # Distinct host keys: client never receives the model host's private key.
  names=['client-key','client-known','cert.pem','key.pem','token','curl-secret','read-token','share-token','login-token'] if name==client else ['host-key','authorized_keys','sshd.conf','cert.pem','key.pem','token']
  for file in names:run(['docker','cp',str(root/file),name+':/root/m593d/'+file])
  binary='model-client' if name==client else 'model-gateway'
  run(['docker','cp',str(root.parent/binary),name+':/root/m593d/'+binary])
  dex(name,'chown','-R','root:root','/root/m593d')
 results['isolation']={h:{'hostname':dex(h,'hostname').strip(),'netns':dex(h,'readlink','/proc/self/ns/net').strip(),'pidns':dex(h,'readlink','/proc/self/ns/pid').strip()} for h in [model,client]}
 assert results['isolation'][model]['netns']!=results['isolation'][client]['netns']
 background(model,'/usr/sbin/sshd -D -e -f /root/m593d/sshd.conf >/root/m593d/sshd.log 2>&1 &')
 time.sleep(1)
 tunnel=subprocess.Popen(sshargs('reverse-key','mac-known')+['-R','127.0.0.1:11434:127.0.0.1:11434','root@127.0.0.1'],stdout=open(root/'reverse.log','w'),stderr=subprocess.STDOUT)
 gateway();forward_client()
 assert tunnel.poll() is None, 'reverse tunnel failed; inspect reverse.log'
 results['authorized_models']=expect(200)
 expect(401,auth=False);results['missing_token_refused']=True
 expect(401,auth=False,extra=['-H','Authorization: Bearer wrong']);results['wrong_token_refused']=True
 expect(404,path='/api/pull',extra=['-X','POST']);results['management_refused']=True
 expect(400,path='/v1/chat/completions',extra=['-H','Content-Type: application/json','-d',json.dumps({'model':'unapproved','messages':[{'role':'user','content':'test'}]})]);results['no_model_fallback']=True
 for label,args in [('wrong_tls_identity',['curl','--max-time','3','--cacert','/root/m593d/cert.pem','--resolve','wrong.invalid:11435:127.0.0.1','https://wrong.invalid:11435/v1/models']),('wrong_tls_root',['curl','--max-time','3','https://127.0.0.1:11435/v1/models']),('wrong_ssh_pin',['ssh','-N','-T','-p','2222','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile=/dev/null','root@'+model])]:
  try:dex(client,*args);raise AssertionError(label+' accepted')
  except subprocess.CalledProcessError as e:(root/(label+'.log')).write_bytes(e.output);results[label+'_refused']=True
 # Do not contend with the separately running qualification series.
 path=root.parent/'model-raw.jsonl'
 if path.exists():
  for _ in range(240):
   if len(path.read_text().splitlines())>=45:break
   time.sleep(1)
  else:raise AssertionError('qualification series still active; retry after it finishes')
 results['conversation']=json.loads(dex(client,'env','SSL_CERT_FILE=/root/m593d/cert.pem','/root/m593d/model-client'))
 # Killing the actual forward is required: closing a browser is not a test.
 dex(client,'sh','-c','kill "$(cat /root/m593d/forward.pid)"')
 time.sleep(.3)
 try:curl();raise AssertionError('tunnel remained usable')
 except subprocess.CalledProcessError:results['tunnel_loss_refused']=True
 forward_client();expect(200);results['explicit_tunnel_recovery']=True
 # Restart model host: neither gateway nor runner forward autostarts.
 run(['docker','restart',model]);time.sleep(1)
 try:curl();raise AssertionError('model host automatically recovered')
 except subprocess.CalledProcessError:results['host_restart_requires_manual_recovery']=True
 if tunnel.poll() is None:tunnel.terminate();tunnel.wait(timeout=5)
 background(model,'/usr/sbin/sshd -D -e -f /root/m593d/sshd.conf >/root/m593d/sshd-restart.log 2>&1 &');time.sleep(.5)
 tunnel=subprocess.Popen(sshargs('reverse-key','mac-known')+['-R','127.0.0.1:11434:127.0.0.1:11434','root@127.0.0.1'],stdout=open(root/'reverse-restart.log','w'),stderr=subprocess.STDOUT)
 gateway()
 run(['docker','restart',client]);forward_client();expect(200)
 results['client_restart_explicit_recovery']=True
 results['after_restarts']=json.loads(dex(client,'env','SSL_CERT_FILE=/root/m593d/cert.pem','/root/m593d/model-client'))
 # Actual pinned application with the documented optional read-only mode.
 run(['docker','cp',str(root.parent/'upstream'),client+':/root/replicant'])
 run(['docker','cp',str(root.parent/'selection-adapter'),client+':/root/m593d/selection-adapter'])
 background(client,'/root/m593d/selection-adapter -cert /root/m593d/cert.pem -key /root/m593d/key.pem -read-token-file /root/m593d/read-token -share-token-file /root/m593d/share-token -identity-file /root/m593d/identity.json >/root/m593d/adapter.log 2>&1 &')
 environment='PIDP11_READONLY=1 PORT=8101 COMPANION_ORIGIN=https://localhost:8510 COMPANION_CERT=/root/m593d/cert.pem COMPANION_KEY=/root/m593d/key.pem COMPANION_LOGIN_FILE=/root/m593d/login-token ADAPTER_READ_FILE=/root/m593d/read-token ADAPTER_SHARE_FILE=/root/m593d/share-token MODEL_TOKEN_FILE=/root/m593d/token ADAPTER_URL=https://127.0.0.1:19002/api/pidp11 LOCAL_BASE_URL=https://127.0.0.1:11435/v1 LOCAL_MODEL=gemma4:12b NODE_EXTRA_CA_CERTS=/root/m593d/cert.pem'
 background(client,'cd /root/replicant && '+environment+' node server.js >/root/m593d/upstream.log 2>&1 &')
 # Lab-only TCP relay exposes TLS bytes to Mac loopback; it conveys no credentials.
 relay="require('net').createServer(s=>{const u=require('net').connect(8101,'127.0.0.1');s.setTimeout(30000,()=>s.destroy());u.on('error',()=>s.destroy());s.on('error',()=>u.destroy());s.on('close',()=>u.destroy());s.pipe(u);u.pipe(s)}).listen(8510,'0.0.0.0')"
 background(client,"node -e "+__import__('shlex').quote(relay)+' >/root/m593d/relay.log 2>&1 &')
 time.sleep(1)
 # Browser harness renews only a synthetic owner manifest, never a guest identity.
 browser=run(['node','lab/m593d/replicant-browser.mjs'],timeout=100)
 (root/'browser-progress.log').write_text(browser)
 results['upstream_application']=json.loads((root/'browser-results.json').read_text())
 results['upstream_revision']='6f8a2aca7786736e01bdf5ba9b44bf66a7f19349'
 results['upstream_modified_optional_mode']=True
 results['genuine_guest_acceptance']=False
 tunnel.terminate();tunnel.wait(timeout=5);time.sleep(.3)
 expect(502,path='/v1/chat/completions',extra=['-H','Content-Type: application/json','-d',json.dumps({'model':'gemma4:12b','messages':[{'role':'user','content':'test'}]})]);results['runner_loss_no_fallback']=True
 # Failure timing uses a separately labeled slow fixture, not Gemma output.
 dex(model,'sh','-c','kill "$(cat /root/m593d/gateway.pid)"');time.sleep(.5)
 run(['docker','cp',str(root.parent/'model-faults'),model+':/root/m593d/model-faults'])
 background(model,'/root/m593d/model-faults >/root/m593d/faults.log 2>&1 &')
 background(model,'/root/m593d/model-gateway -cert /root/m593d/cert.pem -key /root/m593d/key.pem -token-file /root/m593d/token -model gemma4:12b -runner http://127.0.0.1:19191/api/chat >/root/m593d/gateway-fixture.log 2>&1 &')
 time.sleep(.5)
 payload=json.dumps({'model':'gemma4:12b','messages':[{'role':'user','content':'SLOW TRANSPORT FIXTURE'}]})
 request=['docker','exec',client,'curl','--max-time','25','-sS','--cacert','/root/m593d/cert.pem','--config','/root/m593d/curl-secret','-H','Content-Type: application/json','-d',payload,'-w','\n%{http_code}','https://127.0.0.1:11435/v1/chat/completions']
 started=time.monotonic()
 pending=subprocess.Popen(request,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 for _ in range(50):
  state=json.loads(dex(model,'curl','-sS','http://127.0.0.1:19191/state'))
  if state['entered']>=1:break
  time.sleep(.1)
 else:raise AssertionError('fixture not entered')
 expect(429,path='/v1/chat/completions',extra=['-H','Content-Type: application/json','-d',payload])
 answer,errors=pending.communicate(timeout=25)
 assert pending.returncode==0 and answer.endswith(b'502'),(answer,errors)
 results['fixture_timeout_seconds']=time.monotonic()-started
 results['fixture_concurrent_refused']=True
 cancelled=request.copy();cancelled[cancelled.index('--max-time')+1]='1'
 attempt=subprocess.run(cancelled,capture_output=True,timeout=5)
 assert attempt.returncode==28
 for _ in range(50):
  state=json.loads(dex(model,'curl','-sS','http://127.0.0.1:19191/state'))
  if state['cancelled']>=2:break
  time.sleep(.1)
 else:raise AssertionError('cancellation did not propagate')
 results['fixture_cancellation_state']=state
 run(['node','lab/m593d/replicant-cancellation.mjs'],timeout=30)
 results['upstream_cancellation']=json.loads((root/'replicant-cancellation.json').read_text())
 results['resource_snapshot']=run(['docker','stats','--no-stream','--format','{{.Name}} {{.MemUsage}} {{.CPUPerc}}',model,client])
 results['pass']=True
finally:
 if tunnel and tunnel.poll() is None:tunnel.terminate();tunnel.wait(timeout=5)
 for name in reversed(created):
  try:
   if name in [network,control]:run(['docker','network','rm',name])
   else:
    run(['docker','cp',name+':/root/m593d',str(root/(name+'-evidence'))])
    run(['docker','rm','-f',name])
  except subprocess.CalledProcessError as e:results.setdefault('cleanup_errors',[]).append(e.output.decode())
 (root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
