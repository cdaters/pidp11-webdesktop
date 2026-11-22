// Supplemental held-out wording after filling the addressing-note gap.
package main

import (
	"context"
	"encoding/json"
	"os"
	"pidp11.local/webdesktop/internal/companion"
	"time"
)

func main() {
	if os.Getenv("PIDP11_LOCAL_MODEL_TEST") != "1" {
		panic("explicit local test required")
	}
	think := false
	p, err := companion.NewHTTP("ollama", "http://127.0.0.1:11434/api/chat", "gemma4:12b", "", &think)
	if err != nil {
		panic(err)
	}
	questions := []string{
		"Explain in at most 60 words: Does PDP-11 register deferred change the pointer register? How does autoincrement differ? Give their mode numbers.",
		"Explain in at most 60 words: For a PDP-11 autoincrement byte operation, does R6 advance by one? How does an ordinary general register differ?",
		"Explain in at most 60 words: Is autoincrement deferred the same as register deferred? What is fetched, and is the register changed?",
	}
	for _, q := range questions {
		found, text, _ := companion.ReferenceContext(q, "pdp11", "1170-instructions", true)
		start := time.Now()
		answer, err := p.Reply(context.Background(), []companion.Message{{Role: "user", Content: companion.Grounding + text}, {Role: "user", Content: q}})
		record := map[string]any{"question": q, "answer": answer, "seconds": time.Since(start).Seconds(), "citation_ids_valid": companion.ValidCitations(answer, found.Notes), "note_sha256": found.Notes[0].NoteSHA256}
		if err != nil {
			record["error"] = err.Error()
		}
		json.NewEncoder(os.Stdout).Encode(record)
	}
}
