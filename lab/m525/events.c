/* M5.25 laboratory-only experiment; see events.h and README.md.
 * Producers never wait: contention/full queue drops the new event. The internal
 * worker copies at most 32 entries under the same try gate, then sends outside it.
 * No consumer can hold this gate. Release/acquire publishes all slot bytes. */
#include "events.h"
#include <stdatomic.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/random.h>
#include <unistd.h>
#include <time.h>
#include <errno.h>
#include <limits.h>
#if ATOMIC_INT_LOCK_FREE != 2
#error "Laboratory requires always-lock-free 32-bit atomics"
#endif
#define MAGIC 0x3532354dU
#define CAPACITY 256U
static m525_event ring[CAPACITY];
static unsigned head, count;
static uint32_t sequence;
static uint64_t instance;
static _Atomic uint32_t generation, lost, fault;
static atomic_flag gate = ATOMIC_FLAG_INIT;
static int enabled;
static uint64_t now_ns(void) {
    struct timespec ts;
    if (clock_gettime(CLOCK_MONOTONIC, &ts)) return 0;
    return (uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec;
}
/* Bounded CAS retries: excessive contention retires observation, never the CPU. */
static void drop(uint32_t n) {
    uint32_t old = atomic_load(&lost);
    for (int i = 0; i < 4; i++) {
        if (UINT32_MAX - old < n) { atomic_store(&fault, 1); return; }
        if (atomic_compare_exchange_weak(&lost, &old, old + n)) return;
    }
    atomic_store(&fault, 1);
}
void m525_generation(void) {
    if (!enabled) return;
    uint32_t old = atomic_load(&generation);
    /* Attachment transitions are serialized by SIMH's operator/CPU thread. */
    if (old == UINT32_MAX) atomic_store(&fault, 1);
    else atomic_store(&generation, old + 1);
}
void m525_complete(double ticks, uint32_t requested, uint32_t completed,
                   uint16_t status, uint16_t command, int interrupt) {
    if (!enabled || atomic_load(&fault)) return;
    if (atomic_flag_test_and_set_explicit(&gate, memory_order_acquire)) { drop(1); return; }
    if (sequence == UINT32_MAX) atomic_store(&fault, 1);
    else {
        sequence++;
        if (count == CAPACITY) drop(1);
        else {
            m525_event event = {0};
            event.magic = MAGIC; event.controller = 1; event.operation = 1;
            event.flags = interrupt ? 1 : 0;
            event.instance = instance; event.generation = atomic_load(&generation);
            event.sequence = sequence; event.simulated_ticks = ticks;
            event.monotonic_ns = now_ns(); event.requested = requested;
            event.completed = completed; event.status = status; event.command = command;
            event.lost = atomic_load(&lost);
            ring[(head + count) % CAPACITY] = event;
            count++;
        }
    }
    atomic_flag_clear_explicit(&gate, memory_order_release);
}
static unsigned take(m525_event *out, unsigned max, uint32_t *seq) {
    if (atomic_flag_test_and_set_explicit(&gate, memory_order_acquire)) return 0;
    unsigned n = count < max ? count : max;
    for (unsigned i=0; i<n; i++) out[i] = ring[(head+i)%CAPACITY];
    head=(head+n)%CAPACITY; count-=n; *seq=sequence;
    atomic_flag_clear_explicit(&gate, memory_order_release);
    return n;
}
#ifndef M525_UNIT_TEST
static void *drain(void *unused) {
    (void)unused;
    int fd = socket(AF_UNIX, SOCK_DGRAM | SOCK_NONBLOCK | SOCK_CLOEXEC, 0);
    if (fd < 0) { atomic_store(&fault,1); return NULL; }
    struct sockaddr_un destination = { .sun_family=AF_UNIX };
    strcpy(destination.sun_path, "/tmp/m525-events.sock");
    for (;;) {
        m525_event packet[33] = {{0}};
        uint32_t seq=0;
        unsigned n=take(packet+1,32,&seq);
        packet[0].magic=MAGIC; packet[0].controller=1;
        packet[0].flags=atomic_load(&fault) ? 2 : 0;
        packet[0].instance=instance; packet[0].generation=atomic_load(&generation);
        packet[0].sequence=seq; packet[0].monotonic_ns=now_ns();
        packet[0].lost=atomic_load(&lost);
        ssize_t sent=sendto(fd,packet,(n+1)*64,MSG_DONTWAIT|MSG_NOSIGNAL,
                           (struct sockaddr *)&destination,sizeof(destination));
        if (sent != (ssize_t)((n+1)*64)) drop(n); /* Lost heartbeat alone is not an event loss. */
        struct timespec delay={0,100000000};
        nanosleep(&delay,NULL); /* Worker only; never a controller delay. */
    }
}
__attribute__((constructor)) static void initialize(void) {
    const char *option=getenv("PIDP11_M525_ENABLE");
    if (!option || strcmp(option,"1")) return;
    if (getrandom(&instance,sizeof(instance),0)!=(ssize_t)sizeof(instance) || !instance) return;
    pthread_attr_t attr;
    if (pthread_attr_init(&attr)) return;
    pthread_attr_setdetachstate(&attr,PTHREAD_CREATE_DETACHED);
    if (pthread_attr_setstacksize(&attr,128*1024)) { pthread_attr_destroy(&attr); return; }
    pthread_t thread;
    enabled=1; /* Initialization completes before SIMH starts any device. */
    if (pthread_create(&thread,&attr,drain,NULL)) enabled=0;
    pthread_attr_destroy(&attr);
}
#endif
