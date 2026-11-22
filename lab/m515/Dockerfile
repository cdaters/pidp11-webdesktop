# Disposable diagnostic tools only; QEMU boots its own separate kernel.
FROM debian:trixie-slim@sha256:a72b4433de1cf7d6bae0c4cee74d0547f58601a643b3375f070c51600d63b6b2
RUN apt-get update && apt-get install -y --no-install-recommends qemu-system-arm linux-image-arm64 busybox-static cpio python3 strace gdb file e2fsprogs binutils procps iproute2 && rm -rf /var/lib/apt/lists/*
