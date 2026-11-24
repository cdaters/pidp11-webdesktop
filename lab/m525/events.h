/* M5.25 laboratory-only optional completion observations.
 * MIT, copyright 2026 Craig Daters. Never part of the ordinary simulator build. */
#ifndef M525_EVENTS_H
#define M525_EVENTS_H
#include <stdint.h>
/* Native little-endian ARM64 lab wire format. No pointers, paths or guest bytes. */
typedef struct {
    uint32_t magic;
    uint8_t controller, unit, operation, flags;
    uint64_t instance;
    uint32_t generation, sequence;
    double simulated_ticks;
    uint64_t monotonic_ns;
    uint32_t requested, completed;
    uint16_t status, command;
    uint32_t lost;
    uint64_t reserved;
} m525_event;
_Static_assert(sizeof(m525_event) == 64, "fixed event ABI");
double m525_service_time(void); /* CPU-thread copy; no scheduler update. */
void m525_generation(void);
void m525_complete(double ticks, uint32_t requested, uint32_t completed,
                   uint16_t status, uint16_t command, int interrupt);
#endif
