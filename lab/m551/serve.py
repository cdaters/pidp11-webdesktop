"""Genuine disposable V7 with the optional service, network-none Docker only.

The lab owns the guest. The tested service never owns its process or media.
Control files are private harness IPC, not public application routes.
"""
import json, os, pathlib, select, signal, socket, subprocess, sys, time
sys.path.insert(0, '/lab')
from integration import Simh
if os.environ.get('PIDP11_ISOLATED_LAB') != '1' or set(os.listdir('/sys/class/net')) != {'lo'}:
    raise SystemExit('network-none isolated lab required')
root=pathlib.Path('/work');os.umask(0o077)
service='/fixtures/webdesktop-service'
subprocess.run([service,'provision','-directory','/tmp/m551-config','-listen','127.0.0.1:8445','-origin','https://127.0.0.1:8445'],check=True)
config_path=pathlib.Path('/tmp/m551-config/config.json');config=json.loads(config_path.read_text())
config['control']='/tmp/m551-control/control.sock'
config['endpoints']=[{'id':'v7-dc0','label':'Disposable UNIX V7 tty00','address':'127.0.0.1:40100','kind':'raw-guest-line'},{'id':'v7-dc2','label':'Disposable UNIX V7 tty02','address':'127.0.0.1:40102','kind':'raw-guest-line'}]
# Optional reviewed laboratory additions; never accept general process or monitor hooks.
if len(sys.argv) == 3:
    options_path=pathlib.Path(sys.argv[2]).resolve()
    assert root in options_path.parents
    options=json.loads(options_path.read_text())
    assert set(options) <= {'device_exports','companion','allow_readonly_command_proposals'}
    config.update(options)
config_path.write_text(json.dumps(config));pathlib.Path('/tmp/m551-control').mkdir(mode=0o700)
for name in ['writer.token','observer.token']:(root/name).write_bytes((config_path.parent/name).read_bytes())
sim=None;bridge=None;traditional=None

def start_bridge():
    p=subprocess.Popen([service,'serve','-config',str(config_path)],stdout=subprocess.DEVNULL,stderr=open(root/'service.log','a'))
    time.sleep(.3);assert p.poll() is None
    return p

def control(op='status',identifier=None):
    args=[service,'status','-socket',config['control']]
    status=json.loads(subprocess.check_output(args))
    if op=='status':return status
    line=next(x for x in status['lines'] if x['id']==identifier)
    return json.loads(subprocess.check_output([service,op,'-socket',config['control'],'-instance',status['instance'],'-id',identifier,'-revision',str(line['revision']),'-guest-and-line-verified']))

def stop_bridge():
    global bridge
    if bridge:bridge.terminate();bridge.wait(timeout=4);bridge=None

def console(data,wait=.7):os.write(sim.master,data.encode('ascii'));return sim.read(wait)
def receive(sock,wait=.7):
    end=time.monotonic()+wait;out=b''
    while time.monotonic()<end:
        ready,_,_=select.select([sock],[],[],max(0,end-time.monotonic()))
        if ready:
            chunk=sock.recv(65536)
            if not chunk:break
            out+=chunk
    return out.decode('ascii',errors='replace')
try:
    bridge=start_bridge();assert all(l['state']=='detached' for l in control()['lines'])
    (root/'detached-no-guest.json').write_text(json.dumps(control()))
    sim=Simh()
    profile = pathlib.Path(sys.argv[1] if len(sys.argv) >= 2 else '/lab/m50/guest.ini').resolve()
    assert pathlib.Path('/lab') in profile.parents, 'Only reviewed mounted lab profiles are accepted'
    for line in profile.read_text().splitlines():
        if line and not line.startswith(';'):sim.command(line)
    console('boot\r',1);console('hp(0,0)unix\r',2);assert '# ' in sim.log[-1000:]
    console('\x04',2);console('dmr\r',1);assert '$ ' in console('echo M551_OPERATOR_READY\r',1)
    traditional=socket.create_connection(('127.0.0.1',40101));receive(traditional);traditional.sendall(b'\r');receive(traditional);traditional.sendall(b'dmr\r');assert '$ ' in receive(traditional)
    (root/'ready.json').write_text(json.dumps({'simh_pid':sim.p.pid,'bridge_pid':bridge.pid,'state':'detached','original_binary':True}))
    print('Genuine disposable UNIX V7 ready; optional desktop remains detached',flush=True)
    while True:
        sim.read(.05);request=root/'request.json'
        if not request.exists():continue
        message=json.loads(request.read_text());request.unlink();op=message['op'];data=message.get('data','');out=''
        if op=='status':out=control()
        elif op in ('attach','detach'):out=control(op,data)
        elif op=='console':out=console(data,message.get('wait',.7))
        elif op=='traditional':traditional.sendall(data.encode('ascii'));out=receive(traditional)
        elif op=='bridge-stop':stop_bridge();out='stopped'
        elif op=='bridge-start':bridge=start_bridge();out=control()
        elif op=='shutdown':
            stop_bridge();traditional.close();traditional=None
            out=console('sync\r',.5)+console('sync\r',.5)+console('sync\r',1)
            sim.p.send_signal(signal.SIGINT);out+=sim.read(.7);assert 'sim> ' in out
            out+=sim.command('quit');(root/'response.json').write_text(json.dumps({'id':message['id'],'output':out}));break
        else:raise ValueError('unknown harness action')
        (root/'response.json').write_text(json.dumps({'id':message['id'],'output':out}))
finally:
    stop_bridge()
    if traditional:traditional.close()
    if sim:(root/'operator-private.log').write_text(sim.log);sim.stop()
