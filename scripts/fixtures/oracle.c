/* Offline fixture driver for unmodified upstream rpcgen code. Never opens a socket. */
#include <stdio.h>
#include <string.h>
#include "rpc_blinkenlight_api.h"
typedef bool_t (*fixtureproc)(XDR *, void *);
static void emit(const char *name, fixtureproc fn, void *value) {
 char buf[65536]; XDR x; xdrmem_create(&x,buf,sizeof(buf),XDR_ENCODE);
 if (!fn(&x,value)) {fprintf(stderr,"encode failed: %s\n",name);return;}
 unsigned n=xdr_getpos(&x);printf("%s ",name);for(unsigned i=0;i<n;i++)printf("%02x",(unsigned char)buf[i]);puts("");xdr_destroy(&x);
}
int main(void){
 rpc_blinkenlight_api_getinfo_res info={0,"fixture 11/70"};emit("info",(fixtureproc)xdr_rpc_blinkenlight_api_getinfo_res,&info);
 rpc_blinkenlight_api_getpanelinfo_res panel={0,{"11/70",2,2,4,5}};emit("panel",(fixtureproc)xdr_rpc_blinkenlight_api_getpanelinfo_res,&panel);
 rpc_blinkenlight_api_getcontrolinfo_res control={0,{"SR",1,1,8,22,3}};emit("control",(fixtureproc)xdr_rpc_blinkenlight_api_getcontrolinfo_res,&control);
 unsigned char bytes[]={0,0x7f,0x80,0xff,0x34,0x12};rpc_blinkenlight_api_controlvalues_struct values={0,{6,bytes}};emit("values",(fixtureproc)xdr_rpc_blinkenlight_api_controlvalues_struct,&values);
 rpc_param_cmd_get_struct get={2,0,2};emit("param_get",(fixtureproc)xdr_rpc_param_cmd_get_struct,&get);
 rpc_param_cmd_set_struct set={2,0,2,3};emit("param_set",(fixtureproc)xdr_rpc_param_cmd_set_struct,&set);
 rpc_param_result_struct result={0,2,0,2,3};emit("param_result",(fixtureproc)xdr_rpc_param_result_struct,&result);
 rpc_blinkenlight_api_setpanel_controlvalues_res ack={1};emit("set_error",(fixtureproc)xdr_rpc_blinkenlight_api_setpanel_controlvalues_res,&ack);
 rpc_blinkenlight_api_getpanelinfo_res error={1,{"",0,0,0,0}};emit("panel_error",(fixtureproc)xdr_rpc_blinkenlight_api_getpanelinfo_res,&error);
 rpc_test_data_struct test={-1,42,{6,bytes}};emit("test_data",(fixtureproc)xdr_rpc_test_data_struct,&test);
 rpc_test_cmdstatus_struct count={6};emit("test_count",(fixtureproc)xdr_rpc_test_cmdstatus_struct,&count);
 rpc_blinkenlight_api_getcontrolinfo_1_argument args={0,7};emit("control_args",(fixtureproc)xdr_rpc_blinkenlight_api_getcontrolinfo_1_argument,&args);
 rpc_blinkenlight_api_setpanel_controlvalues_1_argument setargs={0,values};emit("set_args",(fixtureproc)xdr_rpc_blinkenlight_api_setpanel_controlvalues_1_argument,&setargs);
 struct rpc_msg call={0};call.rm_xid=0x12345678;call.rm_direction=CALL;call.rm_call.cb_rpcvers=2;call.rm_call.cb_prog=99;call.rm_call.cb_vers=1;call.rm_call.cb_proc=1;call.rm_call.cb_cred.oa_flavor=AUTH_NONE;call.rm_call.cb_verf.oa_flavor=AUTH_NONE;emit("rpc_getinfo_call",(fixtureproc)xdr_callmsg,&call);
 return 0;
}
