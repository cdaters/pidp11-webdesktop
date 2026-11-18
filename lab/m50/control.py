"""Mac shell helper for the private, sequential lab harness (never a web API)."""
import argparse,json,os,pathlib,secrets,time
p=argparse.ArgumentParser();p.add_argument('operation',choices=['console','traditional','measure','bridge-stop','bridge-start','shutdown']);p.add_argument('data',nargs='?',default='');a=p.parse_args()
root=pathlib.Path(os.environ.get('PIDP50_WORK','.research/m50'))
if (root/'request.json').exists():raise SystemExit('A harness request is already pending; do not run helpers concurrently.')
identity=secrets.token_hex(8)
tmp=root/'request.tmp';tmp.write_text(json.dumps({'id':identity,'op':a.operation,'data':a.data,'wait':1}));tmp.replace(root/'request.json')
for _ in range(150):
 time.sleep(.1)
 try:r=json.loads((root/'response.json').read_text())
 except (FileNotFoundError,json.JSONDecodeError):continue
 if r['id']==identity:print(r['output']);break
else:raise SystemExit('Harness did not respond. Stop here; inspect private logs before proceeding.')
