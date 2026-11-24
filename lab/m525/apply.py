"""Apply the laboratory-only TM0 READ completion hook to a verified owned copy.
Never invoke on the original checkout. The source hash and one-shot sentinels fail
closed. Real controller calculations, calls, interrupts and return values stay intact.
"""
from pathlib import Path
import hashlib
import sys
root = Path(sys.argv[1])
assert '/m525/instrumented/' in str(root) and root.name == 'src'
p = root/'PDP11/pdp11_tm.c'
assert hashlib.sha256(p.read_bytes()).hexdigest() == 'cdcd0cdcaa2ab4d8d52ea2e4390f12b86caf4213807b27476bc3aaea724979fc'
s = p.read_text()
assert 'm525_' not in s
s = '#include "events.h"\n' + s
s = s.replace('uint32 xma;\nt_mtrlnt tbc, cbc;', 'uint32 xma;\nuint32 m525_requested, m525_completed = 0;\nt_mtrlnt tbc, cbc;', 1)
s = s.replace('cbc = 0200000 - tm_bc;                                  /* get bc */', 'cbc = 0200000 - tm_bc;                                  /* get bc */\nm525_requested = cbc;', 1)
needle='tm_bc = (tm_bc + cbc) & 0177777;                /* inc byte cnt */'
assert s.count(needle)==1
s=s.replace(needle,needle+'\n        m525_completed = cbc;',1)
needle='return r;\n}\n\n/* Update controller status */'
assert s.count(needle)==1
s=s.replace(needle,'''if (u == 0 && f == MTC_READ)
    m525_complete(m525_service_time(), m525_requested, m525_completed, tm_sta, tm_cmd,
                   (int_req[IPL_TM] & INT_TM) != 0);
'''+needle)
needle='r = sim_tape_attach (uptr, cptr);'
s=s.replace(needle,'if (u == 0) m525_generation(); /* Retire even a failed replacement attempt. */\n'+needle,1)
needle='return sim_tape_detach (uptr);'
s=s.replace(needle,'if (u == 0) m525_generation();\n'+needle,1)
p.write_text(s)
# Add only this module to this disposable build, keeping normal build flags.
p=root/'quickmake';s=p.read_text();assert 'SIM = scp.c' in s
p.write_bytes(p.read_bytes().replace(b'SIM = scp.c',b'SIM = events.c scp.c',1))

# sim_process_event already accounts simulation time before invoking tm_svc.
# Copy that value on the CPU thread; sim_gtime() is forbidden here (it mutates
# queue/accounting state and may take AIO_LOCK).
p=root/'scp.c'
assert hashlib.sha256(p.read_bytes()).hexdigest() == '3549049ae5928b3b6bac2a337a4de3a2a69a630e19e817c1f3a9ac3220767609'
s=p.read_text();needle='double sim_gtime (void)'
assert s.count(needle)==1
p.write_text(s.replace(needle,'double m525_service_time(void) { return sim_time; }\n\n'+needle,1))
