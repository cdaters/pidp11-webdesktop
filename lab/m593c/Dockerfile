# Disposable ARM64 networking lab only, never a deployment image.
FROM debian:trixie-slim
RUN printf '#!/bin/sh\nexit 101\n' > /usr/sbin/policy-rc.d && chmod 755 /usr/sbin/policy-rc.d && apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends openssh-server openssh-client curl ca-certificates python3 nodejs npm && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /run/sshd && usermod -p '*' root
CMD ["sleep", "infinity"]
