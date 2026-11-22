package companion

import (
	"regexp"
	"strings"
)

// ClaimReview is a conservative annotation, never permission or a confidence
// score. Supported means one recognized atomic statement matches a curated rule
// AND its exact source note was supplied. It does not certify the whole answer.
type ClaimReview struct {
	Text                 string `json:"text"`
	Status               string `json:"status"`
	Reference            string `json:"reference,omitempty"`
	SupportedExplanation string `json:"supported_explanation,omitempty"`
}
type factRule struct {
	pattern                          *regexp.Regexp
	expected, reference, explanation string
}

var factRules = []factRule{
	{regexp.MustCompile(`^(?:the )?pdp-11/70 (?:uses|has) (\d+)-bit words$`), "16", "1170-addresses", "The PDP-11/70 uses 16-bit words."},
	{regexp.MustCompile(`^(?:the )?pdp-11/70 (?:uses|has) (\d+)-bit virtual addresses$`), "16", "1170-addresses", "The PDP-11/70 uses 16-bit virtual addresses."},
	{regexp.MustCompile(`^(?:the )?pdp-11/70 (?:uses|has) (\d+)-bit physical addresses$`), "22", "1170-addresses", "The PDP-11/70 uses 22-bit physical addresses."},
	{regexp.MustCompile(`^register deferred is mode (\d+)$`), "1", "1170-instructions", "Register deferred is mode 1."},
	{regexp.MustCompile(`^autoincrement is mode (\d+)$`), "2", "1170-instructions", "Autoincrement is mode 2."},
	{regexp.MustCompile(`^autoincrement deferred is mode (\d+)$`), "3", "1170-instructions", "Autoincrement deferred is mode 3."},
	{regexp.MustCompile(`^movb (sign-extends|zero-extends) a byte when the destination is a register$`), "sign-extends", "1170-instructions", "MOVB sign-extends a byte when the destination is a register."},
	{regexp.MustCompile(`^a pdp-11 interrupt vector contains (\d+) words$`), "2", "1170-vectors", "A PDP-11 interrupt vector contains two words: new PC, then new PS."},
	{regexp.MustCompile(`^unix v7 uses (ls|dir) to list directory entries$`), "ls", "unix-v7", "UNIX V7 uses ls to list directory entries."},
}
var sentenceBoundary = regexp.MustCompile(`[.!?](?:\s+|$)|\n+`)
var calculationClaim = regexp.MustCompile(`(?i)\b(?:octal|hexadecimal|decimal|binary|0x[0-9a-f]+)\b.*[0-9]`)
var liveClaim = regexp.MustCompile(`(?i)\b(?:current|your|now)\b.*\b(?:guest|run lamp|switch register|running|halted)\b|\b(?:run lamp|switch register)\b.*\b(?:is|equals)\b`)
var commandClaim = regexp.MustCompile(`(?i)\b(?:pip|dir|mount|shutdown|sudo|ls|set|run)\b`)

// ReviewClaims handles at most 4096 bytes/32 sentence-like units. It does not use
// the model to grade itself. Unrecognized prose (including correct paraphrases)
// remains unverified. References passed by an outside caller must exactly match
// the installed catalog; merely copying an ID cannot authorize false evidence.
func ReviewClaims(question, answer string, found Retrieval) []ClaimReview {
	if len(answer) > 4096 || len(question) > 4096 {
		return []ClaimReview{{Status: "unverified", Text: "Review input exceeds the bounded limit."}}
	}
	available := map[string]bool{}
	for _, n := range found.Notes {
		known, ok := reference(n.ID)
		if ok && n.Text == known.Text && n.NoteSHA256 == known.NoteSHA256 && NoteIntegrity(n) {
			available[n.ID] = true
		}
	}
	units := sentenceBoundary.Split(answer, -1)
	result := []ClaimReview{}
	for i, unit := range units {
		if i >= 31 {
			unit = strings.Join(units[i:], ". ")
		}
		unit = strings.TrimSpace(unit)
		if unit == "" {
			continue
		}
		review := ClaimReview{Text: unit, Status: "unverified"}
		normalized := strings.ToLower(strings.Join(strings.Fields(citations.ReplaceAllString(strings.NewReplacer("`", "", "*", "").Replace(unit), "")), " "))
		normalized = strings.Trim(normalized, " .!?")
		for _, rule := range factRules {
			m := rule.pattern.FindStringSubmatch(normalized)
			if m != nil && available[rule.reference] {
				review.Status = "supported"
				if m[1] != rule.expected {
					review.Status = "contradicted"
				}
				review.Reference = rule.reference
				review.SupportedExplanation = rule.explanation
				break
			}
		}
		if review.Status == "unverified" {
			switch {
			case liveClaim.MatchString(unit):
				review.Status = "unobserved-machine-state"
			case calculationClaim.MatchString(unit):
				review.Status = "calculation-required"
			case (found.Status == "ambiguous-version" || found.Status == "incomplete") && commandClaim.MatchString(unit):
				review.Status = "version-dependent"
			}
		}
		result = append(result, review)
		if i >= 31 {
			break
		}
	}
	return result
}
