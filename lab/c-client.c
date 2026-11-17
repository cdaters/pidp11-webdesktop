/* Test driver only: original generated C client and XDR source remain unmodified. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <assert.h>
#include "rpc_blinkenlight_api.h"
int main(int argc,char **argv){
 const char *transport=argc>1?argv[1]:"udp";
 CLIENT *cl=clnt_create("127.0.0.1",99,1,transport);if(!cl){clnt_pcreateerror("lab");return 1;}
 struct timeval timeout={2,0};clnt_control(cl,CLSET_TIMEOUT,(char*)&timeout);
 rpc_blinkenlight_api_getinfo_res *info=rpc_blinkenlight_api_getinfo_1(cl);assert(info&&info->error_code==0);xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getinfo_res,(char*)info);
 rpc_blinkenlight_api_getpanelinfo_res *p=rpc_blinkenlight_api_getpanelinfo_1(0,cl);assert(p&&p->error_code==0&&!strcmp(p->panel.name,"11/70"));unsigned count=p->panel.controls_inputs_count+p->panel.controls_outputs_count;unsigned bytes=p->panel.controls_outputs_values_bytecount;unsigned inbytes=p->panel.controls_inputs_values_bytecount;xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getpanelinfo_res,(char*)p);
 unsigned sum=0;for(unsigned i=0;i<count;i++){rpc_blinkenlight_api_getcontrolinfo_res *c=rpc_blinkenlight_api_getcontrolinfo_1(0,i,cl);assert(c&&c->error_code==0);if(!c->control.is_input)sum+=c->control.value_bytelen;xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getcontrolinfo_res,(char*)c);}assert(sum==bytes);
 rpc_blinkenlight_api_getcontrolinfo_res *end=rpc_blinkenlight_api_getcontrolinfo_1(0,count,cl);assert(end&&end->error_code);xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getcontrolinfo_res,(char*)end);
 p=rpc_blinkenlight_api_getpanelinfo_1(1,cl);assert(p&&p->error_code);xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_getpanelinfo_res,(char*)p);
 rpc_blinkenlight_api_controlvalues_struct *in=rpc_blinkenlight_api_getpanel_controlvalues_1(0,cl);assert(in&&in->error_code==0&&in->value_bytes.value_bytes_len==inbytes);xdr_free((xdrproc_t)xdr_rpc_blinkenlight_api_controlvalues_struct,(char*)in);
 unsigned char data[128]={0x56,0x34,0x12,0x80,0xff};assert(bytes<128);
 rpc_blinkenlight_api_controlvalues_struct val={0,{bytes,data}};
 rpc_blinkenlight_api_setpanel_controlvalues_res *out=rpc_blinkenlight_api_setpanel_controlvalues_1(0,val,cl);assert(out&&!out->error_code);
 val.value_bytes.value_bytes_len=bytes-1;out=rpc_blinkenlight_api_setpanel_controlvalues_1(0,val,cl);assert(out&&out->error_code);
 rpc_param_cmd_set_struct param={2,0,2,1};rpc_param_result_struct *pr=rpc_param_set_1(param,cl);assert(pr&&!pr->error_code&&pr->param_value==1);
 rpc_param_cmd_get_struct get={2,0,2};pr=rpc_param_get_1(get,cl);assert(pr&&!pr->error_code&&pr->param_value==1);
 param.param_value=0;pr=rpc_param_set_1(param,cl);assert(pr&&!pr->error_code);
 printf("C %s: discovery, bounds, input read, lamp write, parameters passed (%u controls)\n",transport,count);clnt_destroy(cl);return 0;
}
