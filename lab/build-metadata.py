"""Record host/toolchain/image provenance for the subsequent isolated run."""
import pathlib,subprocess,json,hashlib,os
root=pathlib.Path(__file__).resolve().parents[1]
def output(*args):return subprocess.check_output(args,cwd=root,text=True).strip()
files=['realcons-lab-linux-arm64','lab-browser-probe-linux-arm64']
record={'go':output('go','version'),'node':output('node','--version'),'git_head':output('git','rev-parse','HEAD'),'working_tree_dirty':bool(output('git','status','--porcelain')),'image_id':output('docker','--context','orbstack','image','inspect','pidp11-realcons-lab:local','--format','{{.Id}}'),'binaries':{name:{'bytes':(root/'bin'/name).stat().st_size,'sha256':hashlib.sha256((root/'bin'/name).read_bytes()).hexdigest()} for name in files}}
(root/os.getenv('PIDP11_RESULTS_DIR','.research/lab-results')/'build-metadata.json').write_text(json.dumps(record,indent=2)+'\n')
