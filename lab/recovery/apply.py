"""Lab-only per-call timeout experiment, applied to a COPY of the M4.1 tree.
Does not bound clnt_create/rpcbind discovery or cancel committed commands.
"""
from pathlib import Path
import sys
p=Path(sys.argv[1])/'src/07.0_blinkenlight_api/blinkenlight_api_client.c'
s=p.read_text();anchor='\tblinkenlight_panels_clear(_this->panel_list);\n\n\t_this->connected = 1;'
assert s.count(anchor)==1
s=s.replace(anchor,'''\t/* M4.2 experiment: libtirpc per-handle deadline overrides rpcgen's 25 s.
     * Never selected by the original or fenced-only binaries. */
    if (getenv("PIDP11_ISOLATED_LAB") && !strcmp(getenv("PIDP11_ISOLATED_LAB"), "1")) {
        struct timeval total = {0, 200000}, retry = {0, 50000};
        if (!clnt_control((CLIENT *)_this->rpc_client, CLSET_TIMEOUT, (char *)&total)
            || !clnt_control((CLIENT *)_this->rpc_client, CLSET_RETRY_TIMEOUT, (char *)&retry)) {
            clnt_destroy((CLIENT *)_this->rpc_client); _this->rpc_client = NULL;
            return 1;
        }
    }
'''+anchor);p.write_text(s)
