/* Experimental consumer-owned fencing. Included once by scp.c, declarations
 * shared with REALCONS and PDP11. This is not an authenticated remote API.
 * POSIX mutex serializes revoke with dispatch; atomic flags serve CPU loop.
 */
#include "wd_fence.h"
#include <pthread.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/random.h>
#include <poll.h>
#include <time.h>
#include <unistd.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <errno.h>
#include <sys/stat.h>

static pthread_once_t wd_once = PTHREAD_ONCE_INIT;
static pthread_mutex_t wd_mu;
static int wd_changed;
int wd_managed, wd_inhibit = 1;
static int wd_on, wd_armed, wd_running;
static int wd_dispatch_locked, wd_service_locked, wd_hold, wd_waiting;
static uint64_t wd_generation, wd_sample_generation, wd_sequence, wd_last_consumed;
static uint64_t wd_rejected, wd_accepted, wd_expiries;
static double wd_deadline;
struct wd_slot { uint64_t generation, sequence; char command[1024]; };
static struct wd_slot wd_slots[16];
static double wd_now(void) {
    struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
    return (double)t.tv_sec + (double)t.tv_nsec / 1e9;
}
static void wd_revoke(void) {
    if (wd_armed) ++wd_generation;
    wd_armed = 0;
    __atomic_store_n(&wd_inhibit, 1, __ATOMIC_RELEASE);
    memset(wd_slots, 0, sizeof(wd_slots));
}
static void wd_expire(void) {
    if (wd_armed && wd_now() >= wd_deadline) { ++wd_expiries; wd_revoke(); }
}
static void *wd_watch(void *arg) {
    int listener = (int)(intptr_t)arg;
    for (;;) {
        struct pollfd p = {listener, POLLIN, 0};
        /* Sleep until a request or the lease deadline: no idle watchdog polling. */
        pthread_mutex_lock(&wd_mu); wd_expire();
        int wait_ms = wd_armed ? (int)((wd_deadline-wd_now())*1000)+1 : -1;
        if (wd_armed && wait_ms < 1) wait_ms = 1;
        pthread_mutex_unlock(&wd_mu);
        int ready = poll(&p, 1, wait_ms);
        pthread_mutex_lock(&wd_mu); wd_expire(); pthread_mutex_unlock(&wd_mu);
        if (ready <= 0 || !(p.revents & POLLIN)) continue;
        int fd = accept(listener, NULL, NULL);
        if (fd < 0) continue;
        struct timeval timeout = {0, 50000};
        setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
        setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
        char req[128] = {0}, op[32] = {0}, extra; unsigned long long token = 0;
        ssize_t n = recv(fd, req, sizeof(req)-1, 0);
        int fields = n > 0 ? sscanf(req, "%31s %llu %c", op, &token, &extra) : 0;
        int ok = 0;
        pthread_mutex_lock(&wd_mu); wd_expire();
        if (fields == 1 && !strcmp(op,"STATUS")) ok = 1;
        else if (fields == 1 && !strcmp(op,"REVOKE")) { wd_revoke(); ok = 1; }
        else if (fields == 2 && token == wd_generation && !strcmp(op,"ARM") && !wd_armed && !wd_running) {
            ++wd_generation; wd_armed = 1; wd_deadline = wd_now()+.35;
            __atomic_store_n(&wd_inhibit, 0, __ATOMIC_RELEASE); ok = 1;
        } else if (fields == 2 && token == wd_generation && !strcmp(op,"PING") && wd_armed) {
            wd_deadline = wd_now()+.35; ok = 1;
        } else if (fields == 1 && !strcmp(op,"HOLD")) { wd_hold = 1; ok = 1; }
        else if (fields == 1 && !strcmp(op,"RELEASE")) { wd_hold = 0; ok = 1; }
        /* HOLD/RELEASE are deterministic lab dispatch fault gates. */
        char response[512];
        int len = snprintf(response, sizeof(response),
            "{\"ok\":%d,\"generation\":%llu,\"armed\":%d,\"quiescent\":%d,\"running\":%d,\"waiting\":%d,\"accepted\":%llu,\"rejected\":%llu,\"expiries\":%llu}\n",
            ok, (unsigned long long)wd_generation, wd_armed, !wd_running,
            wd_running, wd_waiting, (unsigned long long)wd_accepted,
            (unsigned long long)wd_rejected, (unsigned long long)wd_expiries);
        pthread_mutex_unlock(&wd_mu);
        send(fd, response, len, MSG_NOSIGNAL); close(fd);
    }
    return NULL;
}
static void wd_init(void) {
    const char *path = getenv("PIDP11_FENCE_SOCKET");
    if (!path || !*path) return;
    /* This optional module is deliberately restricted to the isolated lab. */
    if (!getenv("PIDP11_ISOLATED_LAB") || strcmp(getenv("PIDP11_ISOLATED_LAB"),"1")) abort();
    struct sockaddr_un addr = {.sun_family = AF_UNIX};
    if (strlen(path) >= sizeof(addr.sun_path)) abort();
    strcpy(addr.sun_path,path);
    if (getrandom(&wd_generation,sizeof(wd_generation),0) != sizeof(wd_generation)) abort();
    wd_generation &= UINT64_C(0x7fffffffffffffff); /* exactly represented by uint64 Go/Python */
    pthread_mutexattr_t attr; pthread_mutexattr_init(&attr);
    pthread_mutexattr_settype(&attr,PTHREAD_MUTEX_RECURSIVE);
    pthread_mutex_init(&wd_mu,&attr); pthread_mutexattr_destroy(&attr);
    int fd = socket(AF_UNIX,SOCK_SEQPACKET|SOCK_CLOEXEC,0);
    /* Never unlink a potentially live consumer's endpoint. Restart needs explicit cleanup. */
    if (fd < 0 || bind(fd,(struct sockaddr *)&addr,sizeof(addr)) || chmod(path,0600) || listen(fd,4)) abort();
    pthread_t t; wd_on = 1;
    if (pthread_create(&t,NULL,wd_watch,(void *)(intptr_t)fd)) abort();
    pthread_detach(t);
}
int wd_enabled(void) { pthread_once(&wd_once,wd_init); return wd_on; }
uint64_t wd_sample(void) {
    if (!wd_enabled()) return 0;
    pthread_mutex_lock(&wd_mu); wd_expire();
    uint64_t g = wd_generation; pthread_mutex_unlock(&wd_mu); return g;
}
int wd_service_begin(uint64_t g) {
    if (!wd_enabled()) return 1;
    pthread_mutex_lock(&wd_mu); wd_service_locked = 1; wd_expire();
    wd_changed = wd_sample_generation != g;
    wd_sample_generation = g;
    return wd_armed && g == wd_generation;
}
int wd_queue_changed(void) { return wd_on && wd_changed; }
void wd_service_end(void) {
    if (wd_service_locked) { wd_service_locked = 0; pthread_mutex_unlock(&wd_mu); }
}
char *wd_ticket(char *cmd) {
    static char marker[96];
    if (!wd_enabled()) return cmd;
    pthread_mutex_lock(&wd_mu); wd_expire();
    if (!wd_armed || wd_sample_generation != wd_generation || strlen(cmd)>=sizeof(wd_slots[0].command)) {
        ++wd_rejected; pthread_mutex_unlock(&wd_mu); return "\n";
    }
    uint64_t seq = ++wd_sequence;
    struct wd_slot *s = &wd_slots[seq % 16];
    s->sequence = seq; s->generation = wd_sample_generation;
    strcpy(s->command, cmd);
    snprintf(marker,sizeof(marker),"@WD %llu %llu\n",(unsigned long long)s->generation,(unsigned long long)seq);
    pthread_mutex_unlock(&wd_mu); return marker;
}
int wd_dispatch(const char **cmd) {
    static char dispatched[1024];
    if (!wd_enabled() || strncmp(*cmd,"@WD",3)) return 1;
    unsigned long long gen, seq; char extra;
    if (sscanf(*cmd,"@WD %llu %llu %c",&gen,&seq,&extra)!=2) return 0;
    pthread_mutex_lock(&wd_mu);
    wd_waiting = 1;
    while (wd_hold) { pthread_mutex_unlock(&wd_mu); usleep(1000); pthread_mutex_lock(&wd_mu); }
    wd_waiting = 0; wd_expire();
    struct wd_slot *s = &wd_slots[seq % 16];
    if (!wd_armed || gen != wd_generation || seq <= wd_last_consumed || s->sequence != seq || s->generation != gen) {
        ++wd_rejected; pthread_mutex_unlock(&wd_mu); return 0;
    }
    strcpy(dispatched,s->command); s->sequence = 0; wd_last_consumed = seq;
    *cmd = dispatched; ++wd_accepted; wd_dispatch_locked = 1;
    /* Held through synchronous action or until run_begin; revoke cannot pass dispatch. */
    return 1;
}
void wd_dispatch_end(void) {
    if (wd_dispatch_locked) { wd_dispatch_locked = 0; pthread_mutex_unlock(&wd_mu); }
}
void wd_run_begin(void) {
    if (!wd_enabled()) return;
    pthread_mutex_lock(&wd_mu);
    __atomic_store_n(&wd_managed,wd_dispatch_locked,__ATOMIC_RELEASE);
    wd_running = 1;
    pthread_mutex_unlock(&wd_mu);
    wd_dispatch_end();
}
void wd_run_end(void) {
    if (!wd_enabled()) return;
    pthread_mutex_lock(&wd_mu); wd_running = 0;
    __atomic_store_n(&wd_managed,0,__ATOMIC_RELEASE);
    pthread_mutex_unlock(&wd_mu);
}
