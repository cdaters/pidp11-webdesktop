/* Synthetic ring tests: not historical-device qualification. */
#define M525_UNIT_TEST
#include "events.c"
#include <assert.h>
#include <stdio.h>
static void reset(void) {
    head=count=sequence=0; atomic_store(&lost,0); atomic_store(&fault,0);
    atomic_store(&generation,1); instance=42; enabled=1; atomic_flag_clear(&gate);
}
static void *producer(void *arg) {
    (void)arg; for (int i=0;i<10000;i++) m525_complete(i,512,512,0,0200,1); return NULL;
}
static _Atomic unsigned producers_done;
static void *consumer(void *arg) {
    (void)arg; m525_event batch[32]; uint32_t latest=0, seq=0;
    while (!atomic_load(&producers_done)) {
        unsigned n=take(batch,32,&seq);
        for(unsigned i=0;i<n;i++) {
            assert(batch[i].sequence>latest && batch[i].completed==512);
            assert(batch[i].instance==42 && batch[i].generation==1);
            latest=batch[i].sequence;
        }
    }
    return NULL;
}
int main(void) {
    m525_event output[256]; uint32_t seq;
    reset(); enabled=0; m525_complete(1,512,512,0,0200,1); assert(count==0);
    reset(); for(int i=0;i<300;i++) m525_complete(i,512,512,0,0200,1);
    assert(count==256 && atomic_load(&lost)==44 && sequence==300);
    assert(take(output,256,&seq)==256);
    for(int i=0;i<256;i++) assert(output[i].sequence==(unsigned)i+1 && output[i].completed==512);
    reset(); atomic_flag_test_and_set(&gate); m525_complete(0,512,0,0,0200,1);
    assert(atomic_load(&lost)==1 && !count); atomic_flag_clear(&gate);
    reset(); sequence=UINT32_MAX; m525_complete(0,512,0,0,0200,1); assert(atomic_load(&fault));
    reset(); atomic_store(&lost,UINT32_MAX); drop(1); assert(atomic_load(&fault));
    reset(); atomic_store(&generation,UINT32_MAX); m525_generation(); assert(atomic_load(&fault));
    reset(); pthread_t threads[4]; for(int i=0;i<4;i++) assert(!pthread_create(&threads[i],NULL,producer,NULL));
    for(int i=0;i<4;i++) pthread_join(threads[i],NULL);
    assert(count<=256); assert(count+atomic_load(&lost)==40000 || atomic_load(&fault));
    reset(); pthread_t reader; atomic_store(&producers_done,0);
    assert(!pthread_create(&reader,NULL,consumer,NULL));
    for(int i=0;i<4;i++) assert(!pthread_create(&threads[i],NULL,producer,NULL));
    for(int i=0;i<4;i++) pthread_join(threads[i],NULL);
    atomic_store(&producers_done,1);pthread_join(reader,NULL);
    assert(count<=256);
    printf("fixed ring=%zu bytes; saturation, contention, four producers, disabled and rollover passed; fault=%u\n",sizeof(ring),atomic_load(&fault));
}
