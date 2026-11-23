"""Isolated local operator: save named terminal records, independently reread each.
No simulator access, media writes or authority restoration.
"""
import json
import os
from pathlib import Path
import subprocess
import sys

assert os.environ.get('PIDP11_ISOLATED_LAB') == '1'
root = Path('/work')
command = ['/work/runtime/equipment-records', '-config', '/work/records-config.json']
rows = json.loads(subprocess.check_output(command + ['-action', 'list']))
requested = set(sys.argv[1:])
assert requested and len(requested) <= 5
selected = [row for row in rows if row['job'] in requested]
assert len(selected) == len(requested), 'Missing or duplicated job identity'
for row in selected:
    assert row['state'] in ('completed', 'expired', 'interrupted', 'incomplete')
    subprocess.run(command + ['-action', 'save', '-id', row['id']], check=True)
print(json.dumps(selected, indent=2))
