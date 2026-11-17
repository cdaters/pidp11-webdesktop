"""Apply only to a disposable copy of /fenced, never the upstream tree."""
from pathlib import Path
import sys,re,shutil
root=Path(sys.argv[1]);api=root/'src/07.0_blinkenlight_api';sim=root/'src/02.3_simh/4.x+realcons/src'
for n in ['wd_rpc_budget.c','wd_rpc_budget.h']:shutil.copy(Path(__file__).parent/n,api/n)
p=api/'blinkenlight_api_client.c';s=p.read_text();s=s.replace('#include <stdlib.h>','#include "wd_rpc_budget.h"\n#include <stdlib.h>')
a='clnt_create(_this->rpc_server_hostname, BLINKENLIGHTD, BLINKENLIGHTD_VERS,\n\t\t\t"udp")';assert s.count(a)==1;s=s.replace(a,'wd_rpc_connect(_this->rpc_server_hostname, BLINKENLIGHTD, BLINKENLIGHTD_VERS)')
a='blinkenlight_api_client_get_controls(_this, p); // get controls for panel';assert a in s;s=s.replace(a,'if (blinkenlight_api_client_get_controls(_this, p)) { xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getpanelinfo_res, (char*)result_panel); return 1; }')
p.write_text(s)
p=api/'rpcgen_linux/rpc_blinkenlight_api_clnt.c';s=p.read_text();s='#include "wd_rpc_budget.h"\n'+s;s=s.replace('clnt_call (','wd_rpc_call (').replace('clnt_call(','wd_rpc_call(');assert 'wd_rpc_call' in s;p.write_text(s)
p=sim/'REALCONS/realcons.c';s=p.read_text();s='#include "wd_rpc_budget.h"\n'+s
# Rename definitions only. Calls still pass through wrappers, nesting shares deadline.
for name,ret,args,call,ms in [
 ('connect','t_stat','realcons_t *_this, char *consolelogic_name, char *server_hostname, char *panel_name','_this, consolelogic_name, server_hostname, panel_name',2000),
 ('disconnect','t_stat','realcons_t *_this','_this',200),
 ('service','void','realcons_t *_this, int highspeed','_this, highspeed',300)]:
 pattern=rf'{ret} realcons_{name}\((.*?)\)\s*\{{'
 m=re.search(pattern,s,re.S);assert m
 s=s[:m.start()]+m.group(0).replace(f'realcons_{name}(',f'wd_body_{name}(')+s[m.end():]
 wrapper=f'\n{ret} realcons_{name}({args}) {{ wd_rpc_begin({ms}); '
 wrapper+=f'{ret} result = ' if ret!='void' else ''
 wrapper+=f'wd_body_{name}({call}); wd_rpc_end();'
 wrapper+=' return result;' if ret!='void' else ''
 s+=wrapper+' }\n'
p.write_text(s)
p=sim/'quickmake';s=p.read_text();s=s.replace('$(BLINKENLIGHT_API_DIR)blinkenlight_api_client.c','$(BLINKENLIGHT_API_DIR)wd_rpc_budget.c \\\n        $(BLINKENLIGHT_API_DIR)blinkenlight_api_client.c');p.write_text(s)
