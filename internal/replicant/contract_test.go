package replicant

import (
	"strings"
	"testing"
)

func TestUpstreamWireShapesHaveNarrowerSemantics(t *testing.T) {
	selection := Selection{Endpoint: "tty0", Generation: "generation-a", Text: "$ pwd\n/usr/dmr"}
	got, err := Readback(selection, "tty0", "generation-a", true)
	if err != nil || got.Text != selection.Text || !strings.Contains(got.Semantics, "not operator console") {
		t.Fatal(got, err)
	}
	for _, test := range []struct {
		endpoint, generation string
		consent              bool
	}{{"tty1", "generation-a", true}, {"tty0", "generation-b", true}, {"tty0", "generation-a", false}} {
		if _, err := Readback(selection, test.endpoint, test.generation, test.consent); err == nil {
			t.Fatal("sharing fence bypass")
		}
	}
	selection.Text = strings.Repeat("x", 4097)
	if _, err := Readback(selection, "tty0", "generation-a", true); err == nil {
		t.Fatal("selection limit")
	}
	for _, body := range []string{`{"os":"211bsd+","running":true}`, `{"os":null,"running":false}`} {
		s, err := DecodeStatus([]byte(body))
		if err != nil || s["cpu_running"] != "unknown" || s["guest_attachment"] != "unverified" {
			t.Fatal(s, err)
		}
	}
	for _, body := range []string{`{}`, `{"running":"yes"}`, strings.Repeat("x", 1025)} {
		if _, err := DecodeStatus([]byte(body)); err == nil {
			t.Fatal("malformed status")
		}
	}
	for _, keys := range []string{"pwd\r", "ls\r", "ls /\r", "\\r", "\x05quit\r", "shutdown"} {
		if Keys(keys) == nil {
			t.Fatal("keys gained authority")
		}
	}
}
