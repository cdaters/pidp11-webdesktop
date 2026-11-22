// Selected-source qualification. No reference/rule tuning against these answers.
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
		panic("explicit local model opt-in required")
	}
	data, err := os.ReadFile("lab/m511/tutor/questions.json")
	if err != nil {
		panic(err)
	}
	var cases []struct{ ID, Reference, Question, Expected string }
	if err = json.Unmarshal(data, &cases); err != nil {
		panic(err)
	}
	think := false
	p, err := companion.NewHTTP("ollama", "http://127.0.0.1:11434/api/chat", "gemma4:12b", "", &think)
	if err != nil {
		panic(err)
	}
	for _, c := range cases {
		found, contextText, ok := companion.ReferenceContext(c.Question, "", c.Reference, false)
		if !ok {
			panic(c.Reference)
		}
		start := time.Now()
		answer, err := p.Reply(context.Background(), []companion.Message{{Role: "user", Content: companion.Grounding + contextText}, {Role: "user", Content: "In at most 90 words: " + c.Question}})
		record := map[string]any{"id": c.ID, "reference": c.Reference, "question": c.Question, "expected": c.Expected, "answer": answer, "seconds": time.Since(start).Seconds(), "validCitationIDs": companion.ValidCitations(answer, found.Notes), "claimReview": companion.ReviewClaims(c.Question, answer, found)}
		if err != nil {
			record["error"] = err.Error()
		}
		json.NewEncoder(os.Stdout).Encode(record)
	}
}
