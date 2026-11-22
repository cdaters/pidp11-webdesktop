"""Reproduce the named security assertions without a Pi, guest or model.

Run from the repository root after npm ci. Default validates the manifest only;
--run executes the exact named Go cases and independent JavaScript suites.
Results go to a new private directory, never replace earlier evidence.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--run', action='store_true')
parser.add_argument('--output', type=Path)
args = parser.parse_args()
manifest = json.loads(Path('docs/security/m516/invariants.json').read_text())
packages = {}
for claim in manifest['claims']:
    for field in ['promise', 'source', 'goPackage', 'tests', 'limitations', 'invalidatedBy']:
        assert claim[field], (claim['id'], field)
    for source in claim['source']:
        assert Path(source).is_file(), source
    package = claim['goPackage']
    available = '\n'.join(p.read_text() for p in Path(package).glob('*_test.go'))
    for name in claim['tests']:
        assert re.search(r'func\s+' + re.escape(name) + r'\s*\(', available), (package, name)
    packages.setdefault(package, set()).update(claim['tests'])
print(f"Validated {len(manifest['claims'])} invariants and {sum(map(len,packages.values()))} named tests")
if not args.run:
    raise SystemExit(0)
if not args.output or not args.output.is_absolute():
    parser.error('--run requires an absolute, fresh --output directory')
args.output.mkdir(mode=0o700)
commands = [['go', 'test', '-race', '-count=1', package, '-run', '^(' + '|'.join(sorted(names)) + ')$', '-v']
            for package, names in sorted(packages.items())]
commands += [['npm', 'run', 'test:selection-contract'], ['npm', 'run', 'test:replicant']]
results = []
for index, command in enumerate(commands):
    with (args.output / f'{index}.log').open('x') as log:
        completed = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, timeout=180)
    results.append({'command':command,'exitCode':completed.returncode})
    (args.output / 'results.json').write_text(json.dumps(results,indent=2)+'\n')
    if completed.returncode:
        raise SystemExit('Check failed; inspect the retained log before continuing')
print('Named fixture checks passed; Linux ownership/process checks and TLS remain separately identified')
