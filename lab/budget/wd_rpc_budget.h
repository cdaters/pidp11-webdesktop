#ifndef WD_RPC_BUDGET_H
#define WD_RPC_BUDGET_H
#include <rpc/rpc.h>
void wd_rpc_begin(unsigned milliseconds);
void wd_rpc_end(void);
CLIENT *wd_rpc_connect(const char *host, rpcprog_t program, rpcvers_t version);
enum clnt_stat wd_rpc_call(CLIENT *, rpcproc_t, xdrproc_t, void *, xdrproc_t, void *, struct timeval);
#endif
