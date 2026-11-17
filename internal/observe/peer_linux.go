//go:build linux

package observe

import (
	"context"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"time"
)

// Publisher pins kernel credentials and process start time. Executable inode
// is also checked when /proc permissions permit it (required for same UID).
// This rejects a different process with the same UID and PID reuse. Privileged
// process impersonation and a compromised authorized publisher are out of scope.
type Publisher struct {
	UID   uint32
	PID   int
	start string
	exe   os.FileInfo
}

func processStart(pid int) (string, error) {
	b, e := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if e != nil {
		return "", e
	}
	end := strings.LastIndexByte(string(b), ')')
	if end < 0 {
		return "", fmt.Errorf("invalid process stat")
	}
	f := strings.Fields(string(b[end+1:]))
	if len(f) < 20 {
		return "", fmt.Errorf("short process stat")
	}
	return f[19], nil
}
func PinPublisher(uid uint32, pid int) (Publisher, error) {
	p := Publisher{UID: uid, PID: pid}
	if pid <= 0 {
		return p, fmt.Errorf("positive publisher pid required")
	}
	var e error
	p.start, e = processStart(pid)
	if e != nil {
		return p, e
	}
	p.exe, e = os.Stat(fmt.Sprintf("/proc/%d/exe", pid))
	if e != nil && os.IsPermission(e) && uid != uint32(os.Geteuid()) {
		e = nil
	}
	return p, e
}
func (p Publisher) valid(oob []byte) bool {
	msgs, e := syscall.ParseSocketControlMessage(oob)
	if e != nil {
		return false
	}
	matched := false
	for _, m := range msgs {
		if m.Header.Level == syscall.SOL_SOCKET && m.Header.Type == syscall.SCM_CREDENTIALS {
			c, e := syscall.ParseUnixCredentials(&m)
			if e != nil || c.Uid != p.UID || int(c.Pid) != p.PID {
				return false
			}
			matched = true
		}
	}
	if !matched {
		return false
	}
	start, e := processStart(p.PID)
	if e != nil || start != p.start {
		return false
	}
	if p.exe == nil {
		return true
	}
	exe, e := os.Stat(fmt.Sprintf("/proc/%d/exe", p.PID))
	return e == nil && os.SameFile(exe, p.exe)
}
func (s *Store) ListenVerified(ctx context.Context, path string, p Publisher, group int) error {
	parent, e := os.Lstat(filepath.Dir(path))
	if e != nil {
		return e
	}
	st, ok := parent.Sys().(*syscall.Stat_t)
	if !parent.IsDir() || parent.Mode()&os.ModeSymlink != 0 || parent.Mode().Perm()&0022 != 0 || !ok || int(st.Uid) != os.Geteuid() {
		return fmt.Errorf("runtime directory must be owned by receiver and not group/world writable")
	}
	c, e := net.ListenUnixgram("unixgram", &net.UnixAddr{Name: path, Net: "unixgram"})
	if e != nil {
		return e
	}
	defer c.Close()
	defer os.Remove(path)
	if group >= 0 {
		if e = os.Chown(path, os.Geteuid(), group); e != nil {
			return e
		}
		e = os.Chmod(path, 0660)
	} else {
		e = os.Chmod(path, 0600)
	}
	if e != nil {
		return e
	}
	raw, e := c.SyscallConn()
	if e != nil {
		return e
	}
	var opt error
	raw.Control(func(fd uintptr) { opt = syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_PASSCRED, 1) })
	if opt != nil {
		return opt
	}
	done := make(chan struct{})
	defer close(done)
	go func() {
		select {
		case <-ctx.Done():
			c.Close()
		case <-done:
		}
	}()
	b := make([]byte, MaxDatagram+1)
	oob := make([]byte, syscall.CmsgSpace(syscall.SizeofUcred))
	for {
		n, on, flags, _, e := c.ReadMsgUnix(b, oob)
		if e != nil {
			if ctx.Err() != nil {
				return nil
			}
			return e
		}
		if flags&(syscall.MSG_TRUNC|syscall.MSG_CTRUNC) != 0 || !p.valid(oob[:on]) {
			s.mu.Lock()
			s.rejected++
			s.mu.Unlock()
			continue
		}
		_ = s.Accept(b[:n], time.Now())
	}
}
