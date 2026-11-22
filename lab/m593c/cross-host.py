"""Mac-only disposable two-container network lab. Never contacts a physical Pi.
Build the lab image and ARM64 probes first; see README. Creates private keys under
.research/m593c/cross-host, never reuses owner SSH identities. Removes only its
named containers/network and task-owned SSH process on exit, retaining evidence.
"""
import json, os, pathlib, secrets, subprocess, time
root=pathlib.Path('.research/m593c/cross-host').resolve()
root.mkdir(mode=0o700)
model='pidp11-m593c-model'; client='pidp11-m593c-client'; network='pidp11-m593c-net'; control='pidp11-m593c-management'
results={}; tunnel=None; created=[]
def run(args,**kw):
 return subprocess.check_output(args,stderr=subprocess.STDOUT,timeout=kw.pop('timeout',40),**kw).decode()
def dex(host,*args): return run(['docker','exec',host,*args])
def background(host,command): dex(host,'sh','-c',command)
def sshargs(key,pin):
 return ['ssh','-N','-T','-p','2223','-i',str(root/key),'-o','IdentitiesOnly=yes','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+str(root/pin),'-o','ExitOnForwardFailure=yes','-o','ServerAliveInterval=2','-o','ServerAliveCountMax=1']
def forward_client():
 background(client,'ssh -N -T -p 2222 -i /root/m593c/client-key -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=/root/m593c/client-known -o ExitOnForwardFailure=yes -o ServerAliveInterval=2 -o ServerAliveCountMax=1 -L 127.0.0.1:11435:127.0.0.1:11436 root@'+model+' >/root/m593c/forward.log 2>&1 & echo $! >/root/m593c/forward.pid')
 time.sleep(1)
def gateway(): background(model,'/root/m593c/model-gateway -cert /root/m593c/cert.pem -key /root/m593c/key.pem -token-file /root/m593c/token -model gemma4:12b >/root/m593c/gateway.log 2>&1 & echo $! >/root/m593c/gateway.pid')
def curl(path='/v1/models',auth=True,extra=[]):
 args=['curl','--max-time','25','-sS','--cacert','/root/m593c/cert.pem']
 if auth: args+=['--config','/root/m593c/curl-secret']
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
 run(['openssl','req','-x509','-newkey','rsa:2048','-nodes','-keyout',str(root/'key.pem'),'-out',str(root/'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'])
 token=secrets.token_hex(24)
 (root/'token').write_text(token+'\n');(root/'curl-secret').write_text('header = "Authorization: Bearer '+token+'"\n')
 (root/'sshd.conf').write_text('''Port 2222
ListenAddress 0.0.0.0
HostKey /root/m593c/host-key
AuthorizedKeysFile /root/m593c/authorized_keys
PidFile /run/m593c-sshd.pid
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
  run(args+['pidp11-m593c-lab:local']);created.append(name)
  if name==model: run(['docker','network','connect',network,name])
  dex(name,'mkdir','-m','700','/root/m593c')
  # Distinct host keys: client never receives the model host's private key.
  names=['client-key','client-known','cert.pem','token','curl-secret'] if name==client else ['host-key','authorized_keys','sshd.conf','cert.pem','key.pem','token']
  for file in names:run(['docker','cp',str(root/file),name+':/root/m593c/'+file])
  binary='model-client' if name==client else 'model-gateway'
  run(['docker','cp',str(root.parent/binary),name+':/root/m593c/'+binary])
  dex(name,'chown','-R','root:root','/root/m593c')
 results['isolation']={h:{'hostname':dex(h,'hostname').strip(),'netns':dex(h,'readlink','/proc/self/ns/net').strip(),'pidns':dex(h,'readlink','/proc/self/ns/pid').strip()} for h in [model,client]}
 assert results['isolation'][model]['netns']!=results['isolation'][client]['netns']
 background(model,'/usr/sbin/sshd -D -e -f /root/m593c/sshd.conf >/root/m593c/sshd.log 2>&1 &')
 time.sleep(1)
 tunnel=subprocess.Popen(sshargs('reverse-key','mac-known')+['-R','127.0.0.1:11434:127.0.0.1:11434','root@127.0.0.1'],stdout=open(root/'reverse.log','w'),stderr=subprocess.STDOUT)
 gateway();forward_client()
 assert tunnel.poll() is None, 'reverse tunnel failed; inspect reverse.log'
 results['authorized_models']=expect(200)
 expect(401,auth=False);results['missing_token_refused']=True
 expect(401,auth=False,extra=['-H','Authorization: Bearer wrong']);results['wrong_token_refused']=True
 expect(404,path='/api/pull',extra=['-X','POST']);results['management_refused']=True
 expect(400,path='/v1/chat/completions',extra=['-H','Content-Type: application/json','-d',json.dumps({'model':'unapproved','messages':[{'role':'user','content':'test'}]})]);results['no_model_fallback']=True
 for label,args in [('wrong_tls_identity',['curl','--max-time','3','--cacert','/root/m593c/cert.pem','https://localhost:11435/v1/models']),('wrong_tls_root',['curl','--max-time','3','https://127.0.0.1:11435/v1/models']),('wrong_ssh_pin',['ssh','-N','-T','-p','2222','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile=/dev/null','root@'+model])]:
  try:dex(client,*args);raise AssertionError(label+' accepted')
  except subprocess.CalledProcessError as e:(root/(label+'.log')).write_bytes(e.output);results[label+'_refused']=True
 # Do not contend with the separately running qualification series.
 path=root.parent/'model-raw.jsonl'
 if path.exists():
  for _ in range(240):
   if len(path.read_text().splitlines())>=45:break
   time.sleep(1)
  else:raise AssertionError('qualification series still active; retry after it finishes')
 results['conversation']=json.loads(dex(client,'env','SSL_CERT_FILE=/root/m593c/cert.pem','/root/m593c/model-client'))
 # Killing the actual forward is required: closing a browser is not a test.
 dex(client,'sh','-c','kill "$(cat /root/m593c/forward.pid)"')
 time.sleep(.3)
 try:curl();raise AssertionError('tunnel remained usable')
 except subprocess.CalledProcessError:results['tunnel_loss_refused']=True
 forward_client();expect(200);results['explicit_tunnel_recovery']=True
 # Restart model host: neither gateway nor runner forward autostarts.
 run(['docker','restart',model]);time.sleep(1)
 try:curl();raise AssertionError('model host automatically recovered')
 except subprocess.CalledProcessError:results['host_restart_requires_manual_recovery']=True
 if tunnel.poll() is None:tunnel.terminate();tunnel.wait(timeout=5)
 background(model,'/usr/sbin/sshd -D -e -f /root/m593c/sshd.conf >/root/m593c/sshd-restart.log 2>&1 &');time.sleep(.5)
 tunnel=subprocess.Popen(sshargs('reverse-key','mac-known')+['-R','127.0.0.1:11434:127.0.0.1:11434','root@127.0.0.1'],stdout=open(root/'reverse-restart.log','w'),stderr=subprocess.STDOUT)
 gateway()
 run(['docker','restart',client]);forward_client();expect(200)
 results['client_restart_explicit_recovery']=True
 results['after_restarts']=json.loads(dex(client,'env','SSL_CERT_FILE=/root/m593c/cert.pem','/root/m593c/model-client'))
 # Pin and run the actual upstream application, tools OFF, in the client namespace.
 run(['docker','cp',str(root.parent/'replicant-upstream'),client+':/root/replicant'])
 run(['docker','cp',str(root.parent/'selection-adapter'),client+':/root/m593c/selection-adapter'])
 run(['docker','cp','lab/m593c/replicant-shim.mjs',client+':/root/m593c/shim.mjs'])
 background(client,'/root/m593c/selection-adapter >/root/m593c/adapter.log 2>&1 &')
 background(client,'node /root/m593c/shim.mjs >/root/m593c/shim.log 2>&1 &')
 def upstream(port,base):
  # Private token is expanded inside the disposable container, never logged.
  background(client,'cd /root/replicant && PORT='+str(port)+' LOCAL_BASE_URL='+base+' LOCAL_MODEL=gemma4:12b LOCAL_API_KEY="$(cat /root/m593c/token)" NODE_EXTRA_CA_CERTS=/root/m593c/cert.pem BOOTAPI_BASE=http://127.0.0.1:19001/api/pidp11 node server.js >/root/m593c/upstream-'+str(port)+'.log 2>&1 &')
 upstream(8100,'https://127.0.0.1:11435/v1');time.sleep(1)
 body=json.dumps({'messages':[{'role':'user','content':'In at most 40 words, explain why a guest terminal is different from the SIMH monitor.'}],'toolsEnabled':False,'backend':'local'})
 direct=dex(client,'curl','--max-time','25','-sS','-H','Content-Type: application/json','-d',body,'http://127.0.0.1:8100/api/chat')
 (root/'upstream-direct.sse').write_text(direct)
 assert 'HTTP 400' in direct, direct
 results['upstream_direct_prompt_rejected']=True
 # The shim handles only bounded prompt chunking and the unknown-status mismatch.
 upstream(8101,'http://127.0.0.1:19001/v1');time.sleep(.5)
 screen=dex(client,'curl','-sS','--config','/root/m593c/curl-secret','http://127.0.0.1:19002/api/pidp11/screen')
 assert json.loads(screen)['generation']=='fixture-generation-1'
 results['adapter_selected_readback']=json.loads(screen)
 status=dex(client,'curl','-sS','--config','/root/m593c/curl-secret','http://127.0.0.1:19002/api/pidp11/status')
 assert json.loads(status)['running'] is None
 results['adapter_status_unknown']=True
 denied=dex(client,'curl','-sS','-o','/dev/null','-w','%{http_code}','--config','/root/m593c/curl-secret','-X','POST','http://127.0.0.1:19002/api/pidp11/keys')
 assert denied=='403'
 results['adapter_keys_refused']=True
 adapted=dex(client,'curl','--max-time','25','-sS','-H','Content-Type: application/json','-d',body,'http://127.0.0.1:8101/api/chat')
 (root/'upstream-adapted.sse').write_text(adapted)
 events=[json.loads(line[6:]) for line in adapted.splitlines() if line.startswith('data: ')]
 assert any(event.get('type')=='done' and event.get('response') and event.get('actionLog')==[] for event in events),events
 results['upstream_adapted_events']=events
 results['upstream_revision']='6f8a2aca7786736e01bdf5ba9b44bf66a7f19349'
 results['upstream_tools_disabled']=True
 results['genuine_guest_acceptance']=False
 tunnel.terminate();tunnel.wait(timeout=5);time.sleep(.3)
 expect(502,path='/v1/chat/completions',extra=['-H','Content-Type: application/json','-d',json.dumps({'model':'gemma4:12b','messages':[{'role':'user','content':'test'}]})]);results['runner_loss_no_fallback']=True
 # Failure timing uses a separately labeled slow fixture, not Gemma output.
 dex(model,'sh','-c','kill "$(cat /root/m593c/gateway.pid)"');time.sleep(.5)
 run(['docker','cp',str(root.parent/'model-faults'),model+':/root/m593c/model-faults'])
 background(model,'/root/m593c/model-faults >/root/m593c/faults.log 2>&1 &')
 background(model,'/root/m593c/model-gateway -cert /root/m593c/cert.pem -key /root/m593c/key.pem -token-file /root/m593c/token -model gemma4:12b -runner http://127.0.0.1:19191/api/chat >/root/m593c/gateway-fixture.log 2>&1 &')
 time.sleep(.5)
 payload=json.dumps({'model':'gemma4:12b','messages':[{'role':'user','content':'SLOW TRANSPORT FIXTURE'}]})
 request=['docker','exec',client,'curl','--max-time','25','-sS','--cacert','/root/m593c/cert.pem','--config','/root/m593c/curl-secret','-H','Content-Type: application/json','-d',payload,'-w','\n%{http_code}','https://127.0.0.1:11435/v1/chat/completions']
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
 results['resource_snapshot']=run(['docker','stats','--no-stream','--format','{{.Name}} {{.MemUsage}} {{.CPUPerc}}',model,client])
 results['pass']=True
finally:
 if tunnel and tunnel.poll() is None:tunnel.terminate();tunnel.wait(timeout=5)
 for name in reversed(created):
  try:
   if name in [network,control]:run(['docker','network','rm',name])
   else:
    run(['docker','cp',name+':/root/m593c',str(root/(name+'-evidence'))])
    run(['docker','rm','-f',name])
  except subprocess.CalledProcessError as e:results.setdefault('cleanup_errors',[]).append(e.output.decode())
 (root/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
