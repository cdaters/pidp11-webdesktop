//go:build linux

package main

import (
	"bufio"
	"encoding/json"
	"flag"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"
	"unsafe"
)

func monotonic() uint64 {
	var ts syscall.Timespec
	_, _, e := syscall.Syscall(syscall.SYS_CLOCK_GETTIME, 1, uintptr(unsafe.Pointer(&ts)), 0)
	if e != 0 {
		panic(e)
	}
	return uint64(ts.Sec)*1e9 + uint64(ts.Nsec)
}
func main() {
	pid := flag.Int("simulator-pid", 0, "independently verified original process PID, peer check only")
	flag.Parse()
	if *pid <= 0 || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		panic("isolated lab and exact peer required")
	}
	// Socket belongs only to this reader. Do not unlink a preexisting reader's socket.
	path := "/tmp/m525-events.sock"
	if _, e := os.Lstat(path); !os.IsNotExist(e) {
		panic("existing socket requires independent cleanup")
	}
	conn, err := net.ListenUnixgram("unixgram", &net.UnixAddr{Name: path, Net: "unixgram"})
	if err != nil {
		panic(err)
	}
	defer conn.Close()
	defer os.Remove(path)
	os.Chmod(path, 0600)
	raw, _ := conn.SyscallConn()
	raw.Control(func(fd uintptr) {
		if e := syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_PASSCRED, 1); e != nil {
			panic(e)
		}
	})
	state := NewState(monotonic)
	go func() {
		data := make([]byte, 2113)
		oob := make([]byte, 128)
		for {
			n, on, flags, _, e := conn.ReadMsgUnix(data, oob)
			if e != nil {
				return
			}
			messages, e := syscall.ParseSocketControlMessage(oob[:on])
			if e != nil {
				continue
			}
			matched := false
			for _, message := range messages {
				cred, e := syscall.ParseUnixCredentials(&message)
				if e == nil && int(cred.Pid) == *pid {
					matched = true
				}
			}
			if !matched {
				continue
			}
			if flags&(syscall.MSG_TRUNC|syscall.MSG_CTRUNC) != 0 {
				state.Feed(nil)
			} else {
				state.Feed(data[:n])
			}
		}
	}()
	// Independent operator stdin only; no path/control fields or approval HTTP endpoint.
	go func() {
		scanner := bufio.NewScanner(os.Stdin)
		scanner.Buffer(make([]byte, 512), 512)
		for scanner.Scan() {
			var a struct {
				Instance   string `json:"instance"`
				Generation uint32 `json:"generation"`
				Guest      string `json:"guest"`
				Verified   bool   `json:"verified"`
			}
			if json.Unmarshal(scanner.Bytes(), &a) != nil || !a.Verified {
				fmt.Fprintln(os.Stderr, "approval refused")
				continue
			}
			if e := state.Approve(a.Instance, a.Generation, a.Guest); e != nil {
				fmt.Fprintln(os.Stderr, e)
			}
		}
	}()
	mux := http.NewServeMux()
	mux.HandleFunc("/activity", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != "GET" {
			w.WriteHeader(405)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		summary := state.Get()
		json.NewEncoder(w).Encode(summary)
	})
	mux.Handle("/", http.FileServer(http.Dir("/app"))) // Fixed read-only lab asset mount.
	server := &http.Server{Addr: "127.0.0.1:8450", Handler: mux, ReadHeaderTimeout: time.Second, WriteTimeout: time.Second, IdleTimeout: time.Second, MaxHeaderBytes: 1024}
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		panic(err)
	}
	go func() {
		if e := server.Serve(&boundedListener{Listener: listener, slots: make(chan struct{}, 8)}); e != http.ErrServerClosed {
			fmt.Fprintln(os.Stderr, e)
		}
	}()
	fmt.Fprintln(os.Stderr, "reader uid="+strconv.Itoa(os.Getuid()))
	done := make(chan os.Signal, 1)
	signal.Notify(done, syscall.SIGTERM, syscall.SIGINT)
	<-done
	server.Close()
	conn.Close()
	state.mu.Lock()
	defer state.mu.Unlock()
	json.NewEncoder(os.Stdout).Encode(struct {
		Summary Summary `json:"summary"`
		Events  []Event `json:"events"`
		Omitted uint64  `json:"history_omitted"`
	}{state.summary, state.history, state.omitted})
}
