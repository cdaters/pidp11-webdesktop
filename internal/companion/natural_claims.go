package companion

import (
	"regexp"
	"strings"
)

// Clause checks annotate only the matched text, never the complete sentence.
// Unrecognized remainder stays unverified. Deliberately exclude hypothetical,
// quoted, negated and foreign-architecture sentences: their scope is ambiguous.
var uncertainClause = regexp.MustCompile(`(?i)\b(?:not|never|no|cannot|can't|doesn't|isn't|if|would|could|might|whether|incorrect|false|claims?|claimed|says?|said|quote|x86|arm|vax|pdp-10|68000)\b|[?"“”‘’]`)

type clauseRule struct {
	pattern     *regexp.Regexp
	expected    string
	reference   string
	explanation string
}

var clauseRules = []clauseRule{
	{regexp.MustCompile(`(?:pdp-11(?:/70)?|(?:a |the )?program) (?:uses?|has) (\d+)-bit virtual addresses`), "16", "1170-addresses", "PDP-11/70 program virtual addresses are 16 bits."},
	{regexp.MustCompile(`virtual addresses are (\d+) bits (?:long|wide)`), "16", "1170-addresses", "PDP-11/70 virtual addresses are 16 bits."},
	{regexp.MustCompile(`(?:into|to|produces?) (\d+)-bit physical addresses`), "22", "1170-addresses", "The PDP-11/70 MMU produces 22-bit physical addresses."},
	{regexp.MustCompile(`r([0-9]+) is (?:typically )?the (?:program counter|instruction pointer|pc)\b`), "7", "1170-registers", "R7 is PC; R6 is the stack pointer."},
	{regexp.MustCompile(`r([0-9]+) is (?:typically )?the (?:stack pointer|sp)\b`), "6", "1170-registers", "R6 is the stack pointer; R7 is PC."},
	{regexp.MustCompile(`(?:interrupt )?vector (?:contains|has) (two|one|2|1) words`), "two", "1170-vectors", "The interrupt vector contains two words: PC then PS."},
	{regexp.MustCompile(`movb (?:copies a byte and )?(sign-extends|zero-extends) (?:it |a byte )?when the destination is a register`), "sign-extends", "1170-instructions", "MOVB to a register sign-extends the byte."},
	{regexp.MustCompile(`octal 200 (?:represents a value where|has) the (?:high|sign) bit (?:of the byte )?(?:is |set to )?([01])\b`), "1", "1170-instructions", "Octal 200 is binary 10000000. MOVB to a register extends bit 7, which is one."},
}

func naturalClaims(question, unit string, available map[string]bool) []ClaimReview {
	if uncertainClause.MatchString(unit) {
		return nil
	}
	normalized := strings.ToLower(strings.Join(strings.Fields(strings.NewReplacer("`", "", "*", "").Replace(citations.ReplaceAllString(unit, ""))), " "))
	// Do not resolve an ambiguous architecture from a numeric phrase alone.
	if !strings.Contains(strings.ToLower(question+" "+unit), "pdp-11") && !strings.Contains(strings.ToLower(question+" "+unit), "movb") {
		return nil
	}
	var found []ClaimReview
	for _, rule := range clauseRules {
		if !available[rule.reference] {
			continue
		}
		matches := rule.pattern.FindAllStringSubmatch(normalized, 2)
		for _, match := range matches {
			value := match[1]
			if value == "2" && rule.expected == "two" {
				value = "two"
			}
			status := "supported"
			if value != rule.expected {
				status = "contradicted"
			}
			found = append(found, ClaimReview{Text: match[0], Status: status, Reference: rule.reference, SupportedExplanation: rule.explanation, Scope: "recognized-fragment"})
			if len(found) == 2 {
				return found
			}
		}
	}
	return found
}
