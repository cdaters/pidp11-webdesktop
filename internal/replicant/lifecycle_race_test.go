package replicant

import (
	"strings"
	"testing"
)

// A slow identity callback must not let an earlier publication resurrect text
// after the user has revoked it. Channels make the ordering deterministic.
func TestRevokeFencesPendingPublication(t *testing.T) {
	entered, release := make(chan struct{}), make(chan struct{})
	identity := Attachment{Endpoint: "tty0", Generation: "a", Simulator: "sim-a"}
	adapter, err := NewAdapter(strings.Repeat("r", 32), func() (Attachment, bool) { close(entered); <-release; return identity, true })
	if err != nil {
		t.Fatal(err)
	}
	result := make(chan error, 1)
	go func() {
		result <- adapter.Publish(Selection{Endpoint: "tty0", Generation: "a", Simulator: "sim-a", Text: "approved before revocation"}, true)
	}()
	<-entered
	adapter.Revoke()
	close(release)
	if err := <-result; err == nil {
		t.Fatal("pending publication revived a revoked excerpt")
	}
	adapter.mu.Lock()
	defer adapter.mu.Unlock()
	if adapter.selection.Text != "" {
		t.Fatal("revoked text retained")
	}
}
