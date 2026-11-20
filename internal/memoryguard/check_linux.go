package memoryguard

import (
	"fmt"
	"io"
	"os"
	"syscall"
)

// Check requires readable kernel cgroup-v2 memory accounting, a finite local
// limit no greater than 96 MiB, and no swap allowance. This startup observation
// cannot prevent an administrator from later changing limits or membership.
func Check() error {
	var info syscall.Statfs_t
	if err := syscall.Statfs("/sys/fs/cgroup", &info); err != nil {
		return err
	}
	const cgroup2Magic = 0x63677270
	if info.Type != cgroup2Magic {
		return fmt.Errorf("unified kernel cgroup filesystem unavailable")
	}
	membership, err := readBounded("/proc/self/cgroup")
	if err != nil {
		return err
	}
	return verify(string(membership), readBounded)
}

func readBounded(name string) ([]byte, error) {
	f, err := os.Open(name)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	data, err := io.ReadAll(io.LimitReader(f, 4097))
	if err != nil {
		return nil, err
	}
	if len(data) > 4096 {
		return nil, fmt.Errorf("cgroup record exceeds bound")
	}
	return data, nil
}
