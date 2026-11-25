#!/bin/sh
# One temporary NET_ADMIN-only setup in the exclusive network-none namespace.
set -eu
[ "$PIDP11_ISOLATED_LAB" = 1 ]
[ "$(ls /sys/class/net | tr '\n' ' ')" = 'lo ' ]
[ ! -s /etc/resolv.conf ]
[ "$(cat /proc/sys/net/ipv4/ip_forward)" = 0 ]
ip tuntap add dev tap528 mode tap user 501 group 20
ip link set dev tap528 address 02:00:00:52:80:01
ip address add 172.30.28.1/30 dev tap528
ip link set dev tap528 up
ip -j address show
ip -j route show table all
ip -j -6 route show table all
