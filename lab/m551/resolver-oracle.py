"""Execute only the original resolver in network-none Linux with a synthetic map.
Mount original getsel.sh as /fixtures/getsel.sh and the test map at its expected
absolute location. No scanner, launcher, GPIO, emulator or media is involved.
"""
import hashlib, json, os, pathlib, subprocess
assert set(os.listdir('/sys/class/net')) == {'lo'}
path='/fixtures/getsel.sh'
assert hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest() == 'eace06c57b37ffece8cff7bfedcf49f88c3cfc8b60fc8ef183472e95e29fdb71'
results=[]
for raw in [0,1,15,0x155555,0x2aaaaa,0x3c0000,0xc00000,0xffffff]:
    masked=subprocess.run(['expr',str(raw),'%','262144'],capture_output=True,text=True)
    assert masked.returncode in (0,1)
    octal=subprocess.check_output(['sh','-c','printf "%04o" "$1"','oracle',masked.stdout.strip()],text=True)
    profile=subprocess.check_output(['sh',path,octal],text=True).strip().replace('default','idled',1)
    expected={0:'idled',1:'rsx11mplus',15:'unix7-pilot'}.get(raw&0x3ffff,'idled')
    assert profile==expected
    results.append({'raw':raw,'selector':octal,'profile':profile})
print(json.dumps({'original_resolver':True,'synthetic_map':True,'hardware_executed':False,'results':results},indent=2))
