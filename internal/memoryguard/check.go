// Package memoryguard verifies the optional service's kernel memory boundary
// before it opens listeners or guest connections. It never changes limits.
package memoryguard

import (
	"fmt"
	"path"
	"strconv"
	"strings"
)

// MaximumBytes is the installed companion's 96 MiB memory ceiling.
const MaximumBytes uint64 = 96 * 1024 * 1024

// verify requires the conventional unified cgroup mount used by the supported
// systemd installation. Unusual mounts/namespaces fail closed, rather than
// guessing a different group or relying only on an ancestor's limit.
func verify(membership string, read func(string) ([]byte, error)) error {
	group := ""
	for _, line := range strings.Split(strings.TrimSpace(membership), "\n") {
		if strings.HasPrefix(line, "0::") {
			if group != "" {
				return fmt.Errorf("multiple unified cgroup memberships")
			}
			group = strings.TrimPrefix(line, "0::")
		}
	}
	if group == "" || !strings.HasPrefix(group, "/") || path.Clean(group) != group || strings.ContainsAny(group, "\x00\r\n") {
		return fmt.Errorf("unsupported unified cgroup membership")
	}
	base := path.Join("/sys/fs/cgroup", group)
	limit, err := readNumber(read, path.Join(base, "memory.max"))
	if err != nil {
		return err
	}
	if limit == 0 || limit > MaximumBytes {
		return fmt.Errorf("memory.max must be positive and at most %d bytes; got %d", MaximumBytes, limit)
	}
	if _, err = readNumber(read, path.Join(base, "memory.current")); err != nil {
		return err
	}
	swap, err := readNumber(read, path.Join(base, "memory.swap.max"))
	if err != nil {
		return err
	}
	if swap != 0 {
		return fmt.Errorf("memory.swap.max must be 0; got %d", swap)
	}
	return nil
}

func readNumber(read func(string) ([]byte, error), name string) (uint64, error) {
	data, err := read(name)
	if err != nil {
		return 0, fmt.Errorf("cannot verify %s: %w", path.Base(name), err)
	}
	text := strings.TrimSpace(string(data))
	if len(text) == 0 || len(text) > 20 || strings.IndexFunc(text, func(r rune) bool { return r < '0' || r > '9' }) >= 0 {
		return 0, fmt.Errorf("%s is missing a finite numeric limit/value", path.Base(name))
	}
	n, err := strconv.ParseUint(text, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %w", path.Base(name), err)
	}
	return n, nil
}
