package memoryguard

import (
	"errors"
	"path"
	"testing"
)

func TestContainmentEvidence(t *testing.T) {
	for _, tc := range []struct {
		name, membership, limit, current, swap string
		valid                                  bool
	}{
		{"unit", "0::/system.slice/example.service\n", "100663296", "1234", "0", true},
		{"namespace root", "0::/\n", "50331648", "1234", "0", true},
		{"missing controller", "0::/unit", "", "", "", false},
		{"unlimited", "0::/unit", "max", "1234", "0", false},
		{"too broad", "0::/unit", "100663297", "1234", "0", false},
		{"zero", "0::/unit", "0", "0", "0", false},
		{"no accounting", "0::/unit", "100663296", "", "0", false},
		{"swap unlimited", "0::/unit", "100663296", "1234", "max", false},
		{"swap positive", "0::/unit", "100663296", "1234", "1", false},
		{"traversal", "0::/../../unit", "1", "1", "0", false},
		{"duplicate", "0::/unit\n0::/other", "1", "1", "0", false},
		{"legacy", "2:memory:/unit", "1", "1", "0", false},
		{"overflow", "0::/unit", "18446744073709551616", "1", "0", false},
		{"signed", "0::/unit", "+100", "1", "0", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			read := func(name string) ([]byte, error) {
				values := map[string]string{"memory.max": tc.limit, "memory.current": tc.current, "memory.swap.max": tc.swap}
				value := values[path.Base(name)]
				if value == "" {
					return nil, errors.New("unavailable")
				}
				return []byte(value + "\n"), nil
			}
			err := verify(tc.membership, read)
			if (err == nil) != tc.valid {
				t.Fatalf("valid=%v error=%v", tc.valid, err)
			}
		})
	}
}
