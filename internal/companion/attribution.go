package companion

import (
	"errors"
	"regexp"
	"strings"
)

// AttributionNotice is part of the returned answer, not optional UI metadata.
// The catalog contains project paraphrases, not authenticated primary-source
// quotation spans. Neither citation IDs nor matching note text certify wording.
const AttributionNotice = "Source status: generated explanation, not a verified quotation. Reference notes are project paraphrases; check the cited edition and passage before quoting a primary source.\n\n"

var quotationForm = regexp.MustCompile("(?m)^\\s*>|[\"“][^\"”\\n]{20,}[\"”]")

// QualifyAnswer preserves the model's words only when no substantial marked
// quotation is present. All answers carry an unavoidable source-status label,
// including unmarked or unfamiliar quotation syntax which this bounded heuristic
// cannot recognize. It does not determine factual truth or semantic attribution.
// Commands in backticks and short quoted tokens remain usable, but unverified.
func QualifyAnswer(answer string) (string, error) {
	if len(answer) > 4096-len(AttributionNotice) {
		return "", errors.New("model answer leaves no room for source attribution; answer withheld")
	}
	if quotationForm.MatchString(answer) {
		return "", errors.New("model used quotation formatting without a verified primary-source passage; answer withheld; request a paraphrase")
	}
	if strings.TrimSpace(answer) == "" {
		return "", errors.New("empty model answer")
	}
	return AttributionNotice + answer, nil
}
