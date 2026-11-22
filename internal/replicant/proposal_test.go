package replicant

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDraftCapabilityAndReceiptBoundary(t *testing.T) {
	token := strings.Repeat("a", 32)
	adapter, err := NewAdapter(token, func() (Attachment, bool) {
		return Attachment{Endpoint: "line", Generation: "generation", Simulator: "simulator"}, true
	})
	if err != nil {
		t.Fatal(err)
	}
	call := func(path, auth, receipt string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", path, nil)
		r.Header.Set("Authorization", "Bearer "+auth)
		r.Header.Set("X-Selection-ID", receipt)
		w := httptest.NewRecorder()
		adapter.ServeHTTP(w, r)
		return w
	}
	if call("/api/pidp11/capabilities", "wrong", "").Code != 401 {
		t.Fatal("unauthenticated capability access")
	}
	w := call("/api/pidp11/capabilities", token, "")
	if w.Code != 200 || !strings.Contains(w.Body.String(), "0.1-draft") {
		t.Fatal(w.Body.String())
	}
	receipt, err := adapter.PublishWithReceipt(Selection{Endpoint: "line", Generation: "generation", Simulator: "simulator", Text: "selected-canary"}, true)
	if err != nil {
		t.Fatal(err)
	}
	w = call("/api/pidp11/screen", token, strings.Repeat("b", 32))
	if w.Code != 409 || strings.Contains(w.Body.String(), "selected-canary") {
		t.Fatal("wrong receipt disclosed text")
	}
	w = call("/api/pidp11/screen", token, receipt)
	var snapshot Snapshot
	if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &snapshot) != nil || snapshot.SelectionID != receipt || snapshot.Text != "selected-canary" || snapshot.ExpiresUnixMS <= time.Now().UnixMilli() {
		t.Fatal("receipt-bound read or expiry missing")
	}
	if call("/api/pidp11/keys", token, receipt).Code != 403 {
		t.Fatal("keyboard authority")
	}
	adapter.Revoke()
	if call("/api/pidp11/screen", token, receipt).Code != 409 {
		t.Fatal("revoked receipt survived")
	}
}
