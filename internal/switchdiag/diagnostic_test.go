package switchdiag

import (
	"fmt"
	"strings"
	"testing"
)

func TestMasksAndOriginalExitConvention(t *testing.T) {
	rows := map[uint32]string{0: "idled", 1: "rsx11mplus", 15: "unix7-pilot"}
	for _, tt := range []struct {
		raw               uint32
		sr                uint32
		selector, profile string
	}{
		{0, 0, "0000", "idled"}, {1, 1, "0001", "rsx11mplus"}, {15, 15, "0017", "unix7-pilot"},
		{0x155555, 0x155555, "252525", "idled"}, {0x2aaaaa, 0x2aaaaa, "525252", "idled"},
		{0x3c0000, 0x3c0000, "0000", "idled"}, {0xc00000, 0, "0000", "idled"}, {0xffffff, 0x3fffff, "777777", "idled"},
	} {
		s, err := Decode(Capture{fmt.Sprintf("%d\n", tt.raw), int(tt.raw & 255)}, rows)
		if err != nil || s.SR != tt.sr || s.Selector != tt.selector || s.Profile != tt.profile || s.NonSRBits != tt.raw>>22 {
			t.Fatalf("%x: %+v %v", tt.raw, s, err)
		}
		for bit, v := range s.Bits {
			if v != (tt.sr&(1<<bit) != 0) {
				t.Fatal("bit mapping")
			}
		}
	}
}
func TestRejectUncertainCapture(t *testing.T) {
	for _, c := range []Capture{{"1\n", 0}, {"0\n", -1}, {"16777216", 0}, {"-1", 255}, {"gpio error\n", 255}, {"0\n1\n", 0}, {" 0", 0}, {"", 0}} {
		if _, err := Decode(c, nil); err == nil {
			t.Fatalf("accepted %+v", c)
		}
	}
}
func TestBoundedMapAndFixtures(t *testing.T) {
	for _, bad := range []string{"0001 rsx\n", "0000 idled\n000000 other\n", "0000 idled\n9999 bad\n", "0000 idled\n0001 ../bad\n", strings.Repeat("#", 65537)} {
		if _, err := Selections(strings.NewReader(bad)); err == nil {
			t.Fatal("accepted map")
		}
	}
	if _, err := Selections(strings.NewReader("# synthetic\n0000 idled\n0017 unix7-pilot\n")); err != nil {
		t.Fatal(err)
	}
	for _, bad := range []string{`[]`, `null`, `[{"stdout":"0","exit_code":0,"extra":1}]`, `[{"stdout":"0","exit_code":0}] []`, strings.Repeat(" ", 32769)} {
		if _, err := Fixtures(strings.NewReader(bad)); err == nil {
			t.Fatal("accepted fixture")
		}
	}
}
