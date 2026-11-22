package companion

import (
	"strings"
	"testing"
)

func TestNaturalClaimFragments(t *testing.T) {
	tests := []struct{ text, id, status string }{
		{"According to the handbook, a PDP-11/70 program uses 16-bit virtual addresses for instructions.", "1170-addresses", "supported"},
		{"In the PDP-11, virtual addresses are 18 bits long.", "1170-addresses", "contradicted"},
		{"The MMU translates addresses into 22-bit physical addresses.", "1170-addresses", "supported"},
		{"R6 is typically the instruction pointer in many configurations.", "1170-registers", "contradicted"},
		{"R7 is the program counter, with R6 used as SP.", "1170-registers", "supported"},
		{"Since octal 200 represents a value where the high bit of the byte is 0, the extension preserves the existing byte.", "1170-instructions", "contradicted"},
	}
	for _, test := range tests {
		t.Run(test.text, func(t *testing.T) {
			n, _ := reference(test.id)
			got := ReviewClaims("PDP-11/70 MOVB architecture", test.text, Retrieval{Notes: []Reference{n}})
			found := false
			for _, r := range got {
				if r.Scope == "recognized-fragment" && r.Status == test.status {
					found = true
				}
			}
			if !found {
				t.Fatalf("want %s: %+v", test.status, got)
			}
			if got[0].Status == "supported" {
				t.Fatal("compound sentence certified")
			}
		})
	}
	for _, text := range []string{
		"The PDP-11/70 does not use 22-bit virtual addresses.",
		"If a program uses 22-bit virtual addresses, it differs from PDP-11.",
		"The text falsely claims R6 is the program counter.",
		"An ARM program uses 32-bit virtual addresses.",
		"Someone said: ‘R6 is the program counter’."} {
		for _, r := range ReviewClaims("PDP-11", text, Retrieval{Notes: References()}) {
			if r.Status == "supported" || r.Status == "contradicted" {
				t.Fatalf("ambiguous scope: %s %+v", text, r)
			}
		}
	}
}

func TestCompoundFactsDoNotCertifyRemainder(t *testing.T) {
	n, _ := reference("1170-addresses")
	got := ReviewClaims("PDP-11/70", "The PDP-11/70 uses 16-bit virtual addresses and boots Linux.", Retrieval{Notes: []Reference{n}})
	if got[0].Status != "unverified" {
		t.Fatal("entire sentence certified")
	}
	for _, part := range got {
		if part.Status == "supported" && (part.Scope != "recognized-fragment" || strings.Contains(part.Text, "Linux")) {
			t.Fatal("unsupported remainder certified")
		}
	}
}
