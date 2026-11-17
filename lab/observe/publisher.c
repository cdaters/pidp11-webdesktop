/* Optional passive copy of an existing REALCONS service cycle. No extra RPC,
 * control mutation, routing, background polling, allocation or retry. */
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/random.h>
#include <unistd.h>
#include <time.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
static int obs_fd=-2;
static struct sockaddr_un obs_addr;
static uint64_t obs_boot, obs_seq, obs_dropped;
static int64_t obs_capture, obs_last;
static int64_t obs_now(void){struct timespec t;clock_gettime(CLOCK_REALTIME,&t);return (int64_t)t.tv_sec*1000+t.tv_nsec/1000000;}
static void obs_begin(void){obs_capture=obs_now();}
static void obs_publish(blinkenlight_panel_t *panel){
 if(obs_fd==-2){const char *path=getenv("PIDP11_OBSERVE_SOCKET");obs_fd=-1;if(!path||!*path)return;if(!getenv("PIDP11_ISOLATED_LAB")||strcmp(getenv("PIDP11_ISOLATED_LAB"),"1"))return;if(strlen(path)>=sizeof(obs_addr.sun_path)||getrandom(&obs_boot,sizeof(obs_boot),0)!=sizeof(obs_boot))return;obs_addr.sun_family=AF_UNIX;strcpy(obs_addr.sun_path,path);obs_fd=socket(AF_UNIX,SOCK_DGRAM|SOCK_NONBLOCK|SOCK_CLOEXEC,0);}
 if(obs_fd<0||obs_capture-obs_last<50)return;obs_last=obs_capture;
 char b[4096];size_t used=0;int n;
 #define ADD(...) do{n=snprintf(b+used,sizeof(b)-used,__VA_ARGS__);if(n<0||(size_t)n>=sizeof(b)-used){++obs_dropped;return;}used+=(size_t)n;}while(0)
 ADD("{\"version\":1,\"boot\":\"%016llx\",\"seq\":%llu,\"capturedUnixMs\":%lld,\"publisherDropped\":%llu",(unsigned long long)obs_boot,(unsigned long long)++obs_seq,(long long)obs_capture,(unsigned long long)obs_dropped);
 for(int input=1;input>=0;--input){ADD(",\"%s\":{",input?"inputs":"outputs");int first=1;for(unsigned i=0;i<panel->controls_count;++i){blinkenlight_control_t *c=&panel->controls[i];if(c->is_input!=input)continue;for(const char *p=c->name;*p;++p)if(!((*p>='A'&&*p<='Z')||(*p>='0'&&*p<='9')||*p=='_')){++obs_dropped;return;}ADD("%s\"%s\":%llu",first?"":",",c->name,(unsigned long long)c->value);first=0;}ADD("}");}ADD("}");
 if(sendto(obs_fd,b,used,MSG_DONTWAIT|MSG_NOSIGNAL,(struct sockaddr*)&obs_addr,sizeof(obs_addr))!=(ssize_t)used)++obs_dropped;
 #undef ADD
}
