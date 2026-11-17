"""Passive publisher hooks in an original disposable copy; no CPU-loop patch."""
from pathlib import Path
import sys
p=Path(sys.argv[1])/'REALCONS/realcons.c';s=p.read_text()
def replace(a,b):
 global s
 assert s.count(a)==1,(a,s.count(a));s=s.replace(a,b)
replace('#include "realcons.h"','#include "realcons.h"\n#include "publisher.c"')
replace('\t///// Time for next service operation /////','\t///// Time for next service operation /////\n    obs_begin();')
replace('\t// 2 options','    if (_this->connected) obs_publish(_this->console_model);\n\t// 2 options')
p.write_text(s)
