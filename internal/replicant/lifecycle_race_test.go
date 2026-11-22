package replicant

import (
	"encoding/json"
	"net/http/httptest"
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

// A page can obtain status, then have its HTTP publication delayed until after
// another page's revoke. The revocation fence must span that entire workflow.
func TestRevokeFencesPublicationPreparedBeforeHTTPRequest(t *testing.T) {
	identity := Attachment{Endpoint: "tty0", Generation: "a", Simulator: "sim-a"}
	adapter, _ := NewAdapter(strings.Repeat("r", 32), func() (Attachment, bool) { return identity, true })
	handler, _ := WithSharing(adapter, strings.Repeat("w", 32))
	request := httptest.NewRequest("GET", "/api/pidp11/status", nil)
	request.Header.Set("Authorization", "Bearer "+strings.Repeat("r", 32))
	status := httptest.NewRecorder()
	handler.ServeHTTP(status, request)
	var snapshot struct {
		Epoch string `json:"publication_epoch"`
	}
	if json.Unmarshal(status.Body.Bytes(), &snapshot) != nil || snapshot.Epoch == "" {
		t.Fatal("missing preparation epoch")
	}
	adapter.Revoke()
	body := `{"consent":true,"selection":{"endpoint":"tty0","generation":"a","simulator_generation":"sim-a","text":"prepared before revoke"}}`
	body = strings.Replace(body, `{"consent":`, `{"publication_epoch":"`+snapshot.Epoch+`","consent":`, 1)
	request = httptest.NewRequest("POST", "/api/pidp11/selection", strings.NewReader(body))
	request.Header.Set("Authorization", "Bearer "+strings.Repeat("w", 32))
	result := httptest.NewRecorder()
	handler.ServeHTTP(result, request)
	if result.Code != 409 {
		t.Fatalf("delayed publication revived revoked consent: HTTP %d", result.Code)
	}
}

func TestConcurrentPublicationsConsumeOneEpoch(t *testing.T) {
	identity := Attachment{Endpoint: "tty0", Generation: "a", Simulator: "sim-a"}
	entered := make(chan struct{}, 2)
	release := make(chan struct{})
	adapter, _ := NewAdapter(strings.Repeat("r", 32), func() (Attachment, bool) { entered <- struct{}{}; <-release; return identity, true })
	epoch := adapter.PublicationEpoch()
	results := make(chan error, 2)
	for _, text := range []string{"page one", "page two"} {
		go func(text string) {
			_, err := adapter.PublishAt(Selection{Endpoint: "tty0", Generation: "a", Simulator: "sim-a", Text: text}, true, epoch)
			results <- err
		}(text)
	}
	<-entered
	<-entered
	close(release)
	successes := 0
	for range 2 {
		if <-results == nil {
			successes++
		}
	}
	if successes != 1 {
		t.Fatalf("one epoch published %d selections", successes)
	}
}
