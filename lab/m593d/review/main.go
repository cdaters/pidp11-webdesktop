// Review retained model prose with the currently supplied reference selected by
// the original comparison. This is a regression replay, not an unseen benchmark.
package main

import (
	"encoding/json"
	"os"

	"pidp11.local/webdesktop/internal/companion"
)

func main() {
	var data struct {
		Responses []struct{ Mode, ID, Question, Answer string }
	}
	b, err := os.ReadFile("lab/m593c/results/model-comparison.json")
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(b, &data); err != nil {
		panic(err)
	}
	var questions []struct{ ID, B, C string }
	b, err = os.ReadFile("lab/m593c/questions.json")
	if err != nil {
		panic(err)
	}
	if err = json.Unmarshal(b, &questions); err != nil {
		panic(err)
	}
	for _, r := range data.Responses {
		id := ""
		for _, q := range questions {
			if q.ID == r.ID {
				if r.Mode == "B" {
					id = q.B
				}
				if r.Mode == "C" {
					id = q.C
				}
			}
		}
		found, _, _ := companion.ReferenceContext("", "", id, false)
		json.NewEncoder(os.Stdout).Encode(map[string]any{"mode": r.Mode, "id": r.ID, "review": companion.ReviewClaims("Historical PDP-11 context. "+r.Question, r.Answer, found)})
	}
}
