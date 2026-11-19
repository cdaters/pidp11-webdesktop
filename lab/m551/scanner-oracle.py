"""Mac-only original-C oracle with a fake GPIO library; no device access exists.

Supply the pinned source checkout. The scanner is copied byte-for-byte and linked
only to the synthetic inline library below. Never builds the real GPIO library.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

source = Path(sys.argv[1]) / 'src/11_pidp_server/scanswitch/scansw.c'
assert hashlib.sha256(source.read_bytes()).hexdigest() == 'de9457551b1c5eae6770b03242b5889f54625c25789d6d7a2de9ec938d617f34'
stub = r'''
#include <stdlib.h>
#define MAX_GPIO_PINS 32
#define GPIO_FSEL_INPUT 0
#define PULL_UP 1
#define DIR_OUTPUT 1
#define DIR_INPUT 0
#define DRIVE_LOW 0
static int selected = -1;
static int gpiolib_init(void) { return 32; }
static int gpiolib_mmap(void) { return 0; }
static void gpio_set_fsel(int pin,int value) { }
static void gpio_set_pull(int pin,int value) { }
static void gpio_set_dir(int pin,int value) {
 if(pin>=16 && pin<=18) selected=value==DIR_OUTPUT?pin-16:-1;
}
static void gpio_set_drive(int pin,int value) { }
static int gpio_get_level(int pin) {
 int cols[]={26,27,4,5,6,7,8,9,10,11,12,13};
 unsigned long bits=strtoul(getenv("SYNTHETIC_RAW"),0,10);
 if(selected<0 || selected>1) abort();
 for(int j=0;j<12;j++) if(cols[j]==pin) return !(bits & (1ul<<(selected*12+j)));
 abort();
}
'''
patterns = [0, 1, 15, 0x155555, 0x2aaaaa, 0x3c0000, 0xc00000, 0xffffff, 0, 1, 0]
with tempfile.TemporaryDirectory(prefix='m551-scanner-') as directory:
    root = Path(directory)
    (root/'pinctrl').mkdir()
    (root/'pinctrl/gpiolib.h').write_text(stub)
    shutil.copyfile(source, root/'scansw.c')
    subprocess.run(['cc', '-o', str(root/'oracle'), str(root/'scansw.c')], check=True)
    captures = []
    for raw in patterns:
        result = subprocess.run([str(root/'oracle')], env={'SYNTHETIC_RAW': str(raw)}, capture_output=True, text=True, timeout=2)
        assert result.stdout == str(raw)+'\n' and result.returncode == raw & 255 and result.stderr == ''
        captures.append({'stdout': result.stdout, 'exit_code': result.returncode})
    fixture = root/'captures.json'
    fixture.write_text(json.dumps(captures))
    result = subprocess.run(['go', 'run', './cmd/switchdiag', '-fixture', str(fixture), '-selections', 'internal/switchdiag/testdata/selections'], check=True, capture_output=True, text=True)
    rows = [json.loads(line) for line in result.stdout.splitlines()]
    assert [row['sample']['raw_decimal'] for row in rows[:-1]] == patterns
    fixture.write_text(json.dumps([{'stdout':'0\n','exit_code':1}]))
    failed=subprocess.run(['go','run','./cmd/switchdiag','-fixture',str(fixture),'-selections','internal/switchdiag/testdata/selections'],capture_output=True,text=True)
    assert failed.returncode != 0
    evidence=json.loads(failed.stdout)
    assert evidence['valid'] is False and evidence['capture']=={'stdout':'0\n','exit_code':1}
    print(json.dumps({'original_c_stubbed_gpio': True, 'patterns': patterns, 'matched_go_decoder': True, 'hardware_executed': False, 'invalid_capture_retained':True, 'summary': rows[-1]}, indent=2))
