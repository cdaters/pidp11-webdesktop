package equipmentsession

import "testing"

func TestGuidedOperatorVocabulary(t *testing.T) {
	for _, line := range []string{"begin lp print-one", "begin punch tape-one abc", "returned lp utility returned independently", "drained lp 172 CSR ready POS verified", "closed lp independent close verified", "complete lp abc", "reader punch 12 eof", "detach lp"} {
		if _, err := ParseOperatorCommand(line); err != nil {
			t.Fatalf("%s: %v", line, err)
		}
	}
	for _, line := range []string{"attach lpt /tmp/file", "quit simh", "returned lp", "drained lp -1 guessed", "reader punch 1 maybe", "begin lp", "complete lp", "detach lp extra"} {
		if _, err := ParseOperatorCommand(line); err == nil {
			t.Fatalf("accepted %s", line)
		}
	}
}
