/* Optional laboratory integration; no effect unless PIDP11_FENCE_SOCKET is set. */
#ifndef WD_FENCE_H
#define WD_FENCE_H
#include <stdint.h>
int wd_enabled(void);
uint64_t wd_sample(void);
int wd_service_begin(uint64_t generation);
int wd_queue_changed(void);
void wd_service_end(void);
char *wd_ticket(char *command);
int wd_dispatch(const char **command);
void wd_dispatch_end(void);
void wd_run_begin(void);
void wd_run_end(void);
extern int wd_managed, wd_inhibit;
static inline int wd_cpu_stop(void) {
 return __atomic_load_n(&wd_managed,__ATOMIC_ACQUIRE) && __atomic_load_n(&wd_inhibit,__ATOMIC_ACQUIRE);
}
#endif
