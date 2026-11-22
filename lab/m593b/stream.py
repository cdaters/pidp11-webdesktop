"""Explicit loopback streaming timing probe; no runner startup or model download.
Use only after inspecting idle state; never run concurrently with qualification.
"""
import json,time,urllib.request,sys,os
assert os.environ.get('PIDP11_LOCAL_MODEL_TEST') == '1'
assert sys.argv[1] == 'gemma4:12b'
model=sys.argv[1];think=False if len(sys.argv)>2 else None
payload={'model':model,'messages':[{'role':'user','content':'In one sentence, convert octal 177776 to decimal and hexadecimal.'}],'stream':True,'options':{'num_predict':128,'num_ctx':4096,'temperature':0},'keep_alive':'3m'}
if think is not None:payload['think']=think
start=time.monotonic();first=None;text='';final={}
req=urllib.request.Request('http://127.0.0.1:11434/api/chat',data=json.dumps(payload).encode(),headers={'Content-Type':'application/json'})
with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(req,timeout=25) as r:
 for line in r:
  d=json.loads(line);content=d.get('message',{}).get('content','')
  if content and first is None:first=time.monotonic()-start
  text+=content
  if d.get('done'):final={k:d.get(k) for k in ['done_reason','eval_count','eval_duration','prompt_eval_count','load_duration']}
  if time.monotonic()-start>25:break
print(json.dumps({'model':model,'think':think,'first_content_seconds':first,'seconds':time.monotonic()-start,'answer':text,'metrics':final}))
