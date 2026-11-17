/* Optional network-none laboratory experiment. Not a hard real-time guarantee.
 * Same consumer thread owns handles; never cancel/destroy concurrently. */
#include "wd_rpc_budget.h"
#include <rpc/pmap_prot.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <stdint.h>
#include <time.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
static _Thread_local int depth;
static _Thread_local int64_t deadline;
static int64_t micros(void) {
 struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
 return (int64_t)t.tv_sec*1000000 + t.tv_nsec/1000;
}
void wd_rpc_begin(unsigned ms) { if (!depth++) deadline=micros()+(int64_t)ms*1000; }
void wd_rpc_end(void) { if (depth>0) --depth; }
enum clnt_stat wd_rpc_call(CLIENT *c, rpcproc_t proc, xdrproc_t in, void *a, xdrproc_t out, void *b, struct timeval ignored) {
 int64_t left=depth ? deadline-micros() : 200000;
 if (left<=0) return RPC_TIMEDOUT; /* no later cleanup RPC after sequence budget */
 if (left>200000) left=200000;
 struct timeval total={left/1000000,left%1000000}, retry={0,50000};
 if (!clnt_control(c,CLSET_TIMEOUT,(char*)&total) || !clnt_control(c,CLSET_RETRY_TIMEOUT,(char*)&retry)) return RPC_SYSTEMERROR;
 enum clnt_stat status=clnt_call(c,proc,in,a,out,b,total);
 if(getenv("PIDP11_RPC_TRACE")) fprintf(stderr,"M43 RPC proc=%lu status=%d left=%lld depth=%d\n",(unsigned long)proc,status,(long long)left,depth);
 return status;
}
static CLIENT *handle(unsigned port,rpcprog_t prog,rpcvers_t vers) {
 int fd=socket(AF_INET,SOCK_DGRAM|SOCK_CLOEXEC,IPPROTO_UDP);
 if(fd<0)return NULL;
 struct sockaddr_in sa={0}; sa.sin_family=AF_INET;sa.sin_port=htons(port);sa.sin_addr.s_addr=htonl(INADDR_LOOPBACK);
 struct netbuf address={sizeof sa,sizeof sa,&sa};
 CLIENT *c=clnt_dg_create(fd,&address,prog,vers,8192,8192);
 if(!c){close(fd);return NULL;}
 clnt_control(c,CLSET_FD_CLOSE,NULL);return c;
}
CLIENT *wd_rpc_connect(const char *host,rpcprog_t program,rpcvers_t version) {
 if(strcmp(host,"127.0.0.1") || !getenv("PIDP11_ISOLATED_LAB") || strcmp(getenv("PIDP11_ISOLATED_LAB"),"1"))return NULL;
 CLIENT *map=handle(111,PMAPPROG,PMAPVERS); if(!map)return NULL;
 struct pmap p={program,version,IPPROTO_UDP,0};u_long port=0;struct timeval unused={0,0};
 enum clnt_stat status=wd_rpc_call(map,PMAPPROC_GETPORT,(xdrproc_t)xdr_pmap,&p,(xdrproc_t)xdr_u_long,&port,unused);
 clnt_destroy(map);
 if(status!=RPC_SUCCESS || !port || port>65535)return NULL;
 return handle(port,program,version);
}
