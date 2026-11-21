package companion

import (
	_ "embed"
	"encoding/json"
)

// Reference is a curated, visible project note; it is not live machine evidence.
// The frontend imports the same JSON, avoiding independent copies of the notes.
type Reference struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Text     string `json:"text"`
	Source   string `json:"source"`
	Question string `json:"question"`
}

//go:embed references.json
var referenceJSON []byte

func reference(id string) (Reference, bool) {
	var notes []Reference
	if json.Unmarshal(referenceJSON, &notes) != nil {
		return Reference{}, false
	}
	for _, note := range notes {
		if note.ID == id {
			return note, true
		}
	}
	return Reference{}, false
}
