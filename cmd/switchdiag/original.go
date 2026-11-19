package main

import (
	"context"
	"crypto/sha256"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/switchdiag"
)

const originalPath = "/opt/pidp11/bin/scansw"
const originalSHA = "5c0c05dc885946c5ef324b4e90eb7b42a0c2f20215292831b8b517daa686bb07"

type originalScanner struct{ lock *os.File }

// openOriginal refuses non-Linux, non-root and concurrent diagnostic invocations.
// The original tool initializes GPIO; this is not a passive file read. The lock
// coordinates this utility only: operators must prevent non-cooperating startup.
func openOriginal() (*originalScanner, error) {
	if runtime.GOOS != "linux" || os.Geteuid() != 0 {
		return nil, errors.New("original scanner requires explicitly authorized Linux/root hardware session")
	}
	fd, err := syscall.Open("/run/pidp11-switchdiag.lock", syscall.O_CREAT|syscall.O_RDWR|syscall.O_NOFOLLOW, 0600)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), "diagnostic lock")
	if err = syscall.Flock(fd, syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		f.Close()
		return nil, errors.New("another switch diagnostic owns the lock")
	}
	s := &originalScanner{f}
	if err = s.guard(); err != nil {
		s.Close()
		return nil, err
	}
	return s, nil
}
func (s *originalScanner) Close() { s.lock.Close() }

func (s *originalScanner) guard() error {
	b, err := boundedRead(originalPath, 1024*1024)
	if err != nil {
		return err
	}
	if fmt.Sprintf("%x", sha256.Sum256(b)) != originalSHA {
		return errors.New("original scanner hash differs; review required")
	}
	entries, err := os.ReadDir("/proc")
	if err != nil {
		return err
	}
	if len(entries) > 8192 {
		return errors.New("process inventory exceeds diagnostic bound")
	}
	for _, entry := range entries {
		pid, err := strconv.Atoi(entry.Name())
		if err != nil || pid == os.Getpid() {
			continue
		}
		base := filepath.Join("/proc", entry.Name())
		comm, err := boundedRead(filepath.Join(base, "comm"), 256)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return errors.New("cannot inspect process owners")
		}
		cmdline, err := boundedRead(filepath.Join(base, "cmdline"), 65536)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return errors.New("cannot inspect process command line")
		}
		if name := conflictingProcess(strings.TrimSpace(string(comm)), cmdline); name != "" {
			return fmt.Errorf("conflicting process %s; stop through its operator first", name)
		}
		fds, err := os.ReadDir(filepath.Join(base, "fd"))
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return errors.New("cannot inspect device owners")
		}
		if len(fds) > 65536 {
			return errors.New("descriptor inventory exceeds diagnostic bound")
		}
		for _, fd := range fds {
			target, err := os.Readlink(filepath.Join(base, "fd", fd.Name()))
			if os.IsNotExist(err) {
				continue
			}
			if err != nil {
				return err
			}
			if strings.HasPrefix(target, "/dev/gpio") || target == "/dev/mem" {
				return errors.New("GPIO/memory device already open; refuse concurrent scanner")
			}
		}
		// mmap remains live after a device descriptor closes; inspect both forms.
		maps, err := boundedRead(filepath.Join(base, "maps"), 1024*1024)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return errors.New("cannot inspect mapped device owners")
		}
		if strings.Contains(string(maps), "/dev/gpio") || strings.Contains(string(maps), "/dev/mem") {
			return errors.New("GPIO/memory device already mapped")
		}
	}
	return nil
}

// boundedRead fails closed if an ownership record cannot be inspected in full.
func boundedRead(path string, limit int64) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, limit+1))
	if err != nil {
		return nil, err
	}
	if int64(len(data)) > limit {
		return nil, errors.New("ownership input exceeds diagnostic bound")
	}
	return data, nil
}

type boundedCapture struct{ data []byte }

func (b *boundedCapture) Write(p []byte) (int, error) {
	if len(b.data)+len(p) > 256 {
		return 0, errors.New("scanner output exceeds 256 bytes")
	}
	b.data = append(b.data, p...)
	return len(p), nil
}

func (s *originalScanner) Sample(parent context.Context) (switchdiag.Capture, error) {
	var result switchdiag.Capture
	if err := s.guard(); err != nil {
		return result, err
	}
	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, originalPath)
	cmd.WaitDelay = 100 * time.Millisecond
	var out, stderr boundedCapture
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	err := cmd.Run()
	result.Stdout = string(out.data)
	result.ExitCode = -1
	if cmd.ProcessState != nil {
		result.ExitCode = cmd.ProcessState.ExitCode()
	}
	if ctx.Err() != nil {
		return result, ctx.Err()
	}
	var exit *exec.ExitError
	if err != nil && !errors.As(err, &exit) {
		return result, err
	}
	if len(stderr.data) > 0 {
		return result, errors.New("scanner emitted diagnostics; inspect locally")
	}
	return result, nil
}

var _ io.Writer = (*boundedCapture)(nil)

// Shell and Python launchers may have a generic comm name. Inspect individual
// NUL-separated arguments as well; do not log complete command lines/secrets.
func conflictingProcess(comm string, cmdline []byte) string {
	names := append([]string{comm}, strings.Split(string(cmdline), "\x00")...)
	for _, argument := range names {
		name := filepath.Base(argument)
		switch name {
		case "client11", "server11", "scansw", "pidp11.sh", "pdp11control", "pdp11control.sh", "rebootsimh.sh", "test.py":
			return name
		}
		if strings.HasPrefix(name, "pdp11_realcons") || strings.HasPrefix(name, "pidp1170_blink") {
			return name
		}
	}
	return ""
}
