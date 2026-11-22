// Command m593b qualifies one explicitly installed loopback model, sequentially.
// Its synthetic questions contain no private captures. It never installs models.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"os"
	"time"

	"pidp11.local/webdesktop/internal/companion"
)

func main() {
	model := flag.String("model", "", "already installed model")
	output := flag.String("output", "", "new result file")
	flag.Parse()
	if os.Getenv("PIDP11_LOCAL_MODEL_TEST") != "1" || *model == "" || *output == "" {
		panic("explicit local test opt-in, model and new output path required")
	}
	f, err := os.OpenFile(*output, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if err != nil {
		panic(err)
	}
	defer f.Close()
	data, err := os.ReadFile("lab/m593b/questions.json")
	if err != nil {
		panic(err)
	}
	var cases []struct{ ID, Question, System, Expected string }
	if json.Unmarshal(data, &cases) != nil {
		panic("invalid cases")
	}
	think := false
	p, err := companion.NewHTTP("ollama", "http://127.0.0.1:11434/api/chat", *model, "", &think)
	if err != nil {
		panic(err)
	}
	for _, grounded := range []bool{false, true} {
		for _, c := range cases {
			messages := []companion.Message{}
			found, notes, _ := companion.ReferenceContext(c.Question, c.System, "", true)
			if grounded {
				messages = append(messages, companion.Message{Role: "user", Content: companion.Grounding + notes})
			}
			messages = append(messages, companion.Message{Role: "user", Content: "In at most 90 words, answer: " + c.Question})
			start := time.Now()
			answer, err := p.Reply(context.Background(), messages)
			record := map[string]any{"model": *model, "grounded": grounded, "id": c.ID, "question": c.Question, "expected": c.Expected, "answer": answer, "seconds": time.Since(start).Seconds(), "retrieval": found.Status, "citation_ids_valid": companion.ValidCitations(answer, found.Notes)}
			if err != nil {
				record["error"] = err.Error()
			}
			if err = json.NewEncoder(f).Encode(record); err != nil {
				panic(err)
			}
			json.NewEncoder(os.Stdout).Encode(map[string]any{"case": c.ID, "grounded": grounded, "seconds": record["seconds"], "error": record["error"]})
		}
	}
}
