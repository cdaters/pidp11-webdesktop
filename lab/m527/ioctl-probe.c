/* Disposable diagnostic, not a historical distribution utility. */
#include <sgtty.h>
#include <stdio.h>
extern int errno;
main() {
 struct sgttyb b; int r;
 r=ioctl(1,TIOCGETP,&b);
 printf("correct r=%d speed=%d flags=%o\n",r,b.sg_ispeed,b.sg_flags);
 errno=0; r=ioctl(TIOCGETP,1,&b);
 printf("reversed r=%d errno=%d command=%o\n",r,errno,TIOCGETP);
 return 0;
}
