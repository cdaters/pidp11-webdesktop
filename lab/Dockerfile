FROM debian:bookworm-slim@sha256:734a72b3d6142a71993b4bc580ca01d8ca687f77a2c422d96a961d3376b179bc
RUN apt-get update && apt-get install -y --no-install-recommends build-essential libtirpc-dev libreadline-dev rpcbind netbase python3 procps iproute2 file && rm -rf /var/lib/apt/lists/*
COPY .research/lab-source/src/02.3_simh /upstream/src/02.3_simh
COPY .research/lab-source/src/07.0_blinkenlight_api /upstream/src/07.0_blinkenlight_api
COPY .research/lab-source/src/00_common /upstream/src/00_common
RUN --network=none cd '/upstream/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/lab/ && sha256sum /opt/lab/pdp11_realcons
COPY lab/c-client.c /opt/lab/c-client.c
RUN --network=none gcc -O2 -I/usr/include/tirpc -I/upstream/src/07.0_blinkenlight_api/rpcgen_linux /opt/lab/c-client.c /upstream/src/07.0_blinkenlight_api/rpcgen_linux/rpc_blinkenlight_api_clnt.c /upstream/src/07.0_blinkenlight_api/rpcgen_linux/rpc_blinkenlight_api_xdr.c -ltirpc -o /opt/lab/c-client
COPY lab/ptyshim.c /opt/lab/ptyshim.c
RUN --network=none gcc -shared -fPIC -O2 /opt/lab/ptyshim.c -ldl -o /opt/lab/ptyshim.so
WORKDIR /tmp
# Preserve /upstream and original binary; apply optional hooks only to a copy.
COPY lab/interlock /opt/interlock
RUN --network=none cp -a /upstream /fenced && cp /opt/interlock/wd_fence.* '/fenced/src/02.3_simh/4.x+realcons/src/' && python3 /opt/interlock/apply.py '/fenced/src/02.3_simh/4.x+realcons/src' && cd '/fenced/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/fenced/
RUN --network=none gcc -g -O1 -fsanitize=address,undefined -fno-omit-frame-pointer /opt/interlock/fence-unit.c -lpthread -o /opt/lab/fence-unit && /opt/lab/fence-unit
# M4.2 observe-only binary: original CPU and control path, nonblocking state copy.
COPY lab/observe /opt/observe
RUN --network=none cp -a /upstream /observed && cp /opt/observe/publisher.c '/observed/src/02.3_simh/4.x+realcons/src/REALCONS/' && python3 /opt/observe/apply.py '/observed/src/02.3_simh/4.x+realcons/src' && cd '/observed/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/observed/
# Separate recovery experiment; original, fenced and observation binaries remain intact.
COPY lab/recovery /opt/recovery
RUN --network=none cp -a /fenced /bounded && python3 /opt/recovery/apply.py /bounded && cd '/bounded/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/bounded/
