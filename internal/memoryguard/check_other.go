//go:build !linux

package memoryguard

import "errors"

// Check refuses to claim Linux kernel containment on another platform.
func Check() error { return errors.New("kernel memory containment requires Linux cgroup v2") }
