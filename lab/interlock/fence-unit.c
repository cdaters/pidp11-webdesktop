/* Deterministic module tests, plus ASan/UBSan; real SIMH oracle is m41.py. */
#include "wd_fence.c"
#include <assert.h>
static void arm(void) {
 pthread_mutex_lock(&wd_mu);wd_revoke();++wd_generation;wd_armed=1;wd_deadline=wd_now()+1;
 __atomic_store_n(&wd_inhibit,0,__ATOMIC_RELEASE);pthread_mutex_unlock(&wd_mu);
 assert(wd_service_begin(wd_sample()));wd_service_end();
}
static void ticket(char *out,const char *command) { strcpy(out,wd_ticket((char *)command)); }
static int dispatch(char *s) { const char *p=s;int r=wd_dispatch(&p);wd_dispatch_end();return r; }
int main(void) {
 setenv("PIDP11_ISOLATED_LAB","1",1);setenv("PIDP11_FENCE_SOCKET","/tmp/fence-unit.sock",1);
 unlink("/tmp/fence-unit.sock");assert(wd_enabled());char a[96],b[96];
 arm();ticket(a,"run 2000\n");ticket(b,"reset all\n");assert(dispatch(b));assert(!dispatch(a));assert(!dispatch(b));
 arm();ticket(a,"cont\n");pthread_mutex_lock(&wd_mu);wd_revoke();pthread_mutex_unlock(&wd_mu);assert(!dispatch(a));
 arm();ticket(a,"step 1\n");for(int i=0;i<16;i++)ticket(b,"examine pc\n");assert(!dispatch(a));assert(dispatch(b));
 assert(!dispatch("@WD garbage"));assert(!dispatch("@WD 0 0 trailing"));
 uint64_t old=wd_sample();arm();assert(!wd_service_begin(old));wd_service_end();
 arm();ticket(a,"run 2000\n");const char *p=a;assert(wd_dispatch(&p));wd_run_begin();assert(!wd_cpu_stop());
 pthread_mutex_lock(&wd_mu);wd_revoke();pthread_mutex_unlock(&wd_mu);assert(wd_cpu_stop());assert(wd_running);wd_run_end();assert(!wd_running);
 arm();ticket(a,"deposit 1000 1\n");pthread_mutex_lock(&wd_mu);wd_deadline=wd_now()-.01;pthread_mutex_unlock(&wd_mu);assert(!dispatch(a));assert(!wd_armed);
 /* Conventional console command is independent of ticket authorization. */
 p="examine pc";assert(wd_dispatch(&p));wd_dispatch_end();
 puts("fence unit: stale/reordered/duplicate/overflow/expiry/CPU stop/console passed");return 0;
}
