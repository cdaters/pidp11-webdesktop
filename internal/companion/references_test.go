package companion

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestCuratedReferenceBoundsAndIdentity(t *testing.T) {
	var notes []Reference
	if err := json.Unmarshal(referenceJSON, &notes); err != nil {
		t.Fatal(err)
	}
	seen := map[string]bool{}
	for _, note := range notes {
		if note.ID == "" || seen[note.ID] || !strings.HasPrefix(note.Source, "https://") || len(Grounding)+len(note.Title)+len(note.Text)+len(note.Source)+256 > 4096 {
			t.Fatal("invalid curated reference", note.ID)
		}
		seen[note.ID] = true
		if selected, ok := reference(note.ID); !ok || selected.Text != note.Text {
			t.Fatal("reference selection mismatch")
		}
	}
	if _, ok := reference("arbitrary filesystem path"); ok {
		t.Fatal("unknown reference accepted")
	}
}
