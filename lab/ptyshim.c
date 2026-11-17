/* Laboratory-only portability shim. The original controller, command strings,
 * parser and CPU are unchanged. Forward TIOCSTI bytes through the inherited PTY
 * master instead of requiring a disabled kernel ioctl or CAP_SYS_ADMIN. */
#define _GNU_SOURCE
#include <sys/ioctl.h>
#include <unistd.h>
#include <stdarg.h>
#include <stdlib.h>
#include <dlfcn.h>
#include <errno.h>
#include <string.h>
int ioctl(int fd,unsigned long request,...){
 va_list args;va_start(args,request);void *arg=va_arg(args,void*);va_end(args);
 if(request==TIOCSTI&&fd==0){
  const char *lab=getenv("PIDP11_ISOLATED_LAB"),*master=getenv("PIDP11_LAB_PTY_MASTER");
  if(lab&&strcmp(lab,"1")==0&&master){int m=atoi(master);if(m>2&&isatty(m)){ssize_t n;do{n=write(m,arg,1);}while(n<0&&errno==EINTR);return n==1?0:-1;}}
  errno=EPERM;return -1;
 }
 int(*original)(int,unsigned long,...)=dlsym(RTLD_NEXT,"ioctl");return original(fd,request,arg);
}
