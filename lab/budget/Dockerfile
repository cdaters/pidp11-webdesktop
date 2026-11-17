FROM pidp11-realcons-lab:local
COPY lab/budget /opt/budget
RUN --network=none cp -a /fenced /budgeted && python3 /opt/budget/apply.py /budgeted && cd '/budgeted/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/budgeted/
# Disposable diagnostic copy: prints only at a stop condition, never used for acceptance/performance.
RUN --network=none cp -a /upstream /diagnostic && python3 /opt/budget/diagnostic.py && cd '/diagnostic/src/02.3_simh/4.x+realcons/src' && make -B -f quickmake NETWORK_OPT= DISPLAY_OPT=-DUSE_DISPLAY LDFLAGS='-lrt -lm -lpthread -ldl -lreadline -ltirpc' BIN=/opt/diagnostic/
