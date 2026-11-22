package companion

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestReferenceIntegrityAndContextBounds(t *testing.T) {
	seen := map[string]bool{}
	for _, n := range References() {
		if seen[n.ID] || !NoteIntegrity(n) || n.Organization == "" || n.Edition == "" || n.Document == "" || n.Section == "" || !strings.HasPrefix(n.Source, "https://") {
			t.Fatalf("invalid provenance: %s", n.ID)
		}
		seen[n.ID] = true
		found, context, ok := ReferenceContext(n.Question, n.System, n.ID, true)
		if !ok || len(found.Notes) != 1 || len(Grounding)+len(context) > 4096 {
			t.Fatalf("context %s", n.ID)
		}
		if ValidCitations("invented [ref:fake]", found.Notes) || !ValidCitations("supported [ref:"+n.ID+"]", found.Notes) {
			t.Fatal("citation boundary")
		}
	}
	if _, _, ok := ReferenceContext("", "", "missing", true); ok {
		t.Fatal("missing reference")
	}
}
func TestRetrievalCases(t *testing.T) {
	data, err := os.ReadFile("retrieval-cases.json")
	if err != nil {
		t.Fatal(err)
	}
	var cases []struct {
		Query, System, Status string
		IDs                   []string `json:"ids"`
	}
	if err = json.Unmarshal(data, &cases); err != nil {
		t.Fatal(err)
	}
	for _, c := range cases {
		t.Run(c.Query, func(t *testing.T) {
			got := Retrieve(c.Query, c.System)
			if got.Status != c.Status || len(got.Notes) != len(c.IDs) {
				t.Fatalf("%+v", got)
			}
			for i, n := range got.Notes {
				if n.ID != c.IDs[i] {
					t.Fatalf("%+v", got)
				}
			}
		})
	}
	if len(Retrieve(strings.Repeat("a", 4097), "").Notes) != 0 {
		t.Fatal("unbounded query")
	}
}

func BenchmarkRetrieve(b *testing.B) {
	b.ReportAllocs()
	for b.Loop() {
		Retrieve("PDP-11/70 virtual physical architecture", "pdp11")
	}
}
