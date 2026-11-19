// Package switchdiag interprets captured original-scanner output without GPIO,
// emulator, media, or launcher access. A sample is evidence, never a boot command.
package switchdiag

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const MaxSamples = 100

var decimal = regexp.MustCompile(`^[0-9]{1,8}\n?$`)
var selectionRow = regexp.MustCompile(`^([0-7]{4,6})[ \t]+([A-Za-z0-9][A-Za-z0-9_+.-]*)[ \t]*$`)

// Capture retains stdout and the process status independently. Original scansw
// returns row zero as its exit code, so nonzero is not necessarily failure.
type Capture struct {
	Stdout   string `json:"stdout"`
	ExitCode int    `json:"exit_code"`
}

// Sample separates the two-row 24-bit electrical reading, the 22-bit SR and
// the launcher's lower-18-bit selection. Bits are ordered SR0 through SR21.
type Sample struct {
	Capture
	At          time.Time `json:"at"`
	ElapsedNS   int64     `json:"elapsed_ns"`
	DurationNS  int64     `json:"duration_ns"`
	Raw         uint32    `json:"raw_decimal"`
	SR          uint32    `json:"sr_decimal"`
	SROctal     string    `json:"sr_octal"`
	Selector    string    `json:"selector_octal"`
	Bits        [22]bool  `json:"sr_bits_low_to_high"`
	NonSRBits   uint32    `json:"non_sr_bits_23_22"`
	Profile     string    `json:"expected_profile"`
	ChangedBits uint32    `json:"changed_sr_bits"`
}

// Selections accepts bounded, unambiguous octal maps. Unlike getsel's first-match
// behavior, malformed/duplicate rows are rejected rather than silently guessed.
func Selections(r io.Reader) (map[uint32]string, error) {
	b, err := io.ReadAll(io.LimitReader(r, 65537))
	if err != nil || len(b) > 65536 {
		return nil, errors.New("selection map exceeds limit or cannot be read")
	}
	rows := map[uint32]string{}
	for _, line := range strings.Split(string(b), "\n") {
		if strings.TrimSpace(line) == "" || strings.HasPrefix(strings.TrimSpace(line), "#") {
			continue
		}
		m := selectionRow.FindStringSubmatch(line)
		if m == nil {
			return nil, errors.New("unreviewed selection-map syntax")
		}
		n, err := strconv.ParseUint(m[1], 8, 18)
		if err != nil {
			return nil, errors.New("selection outside 18-bit range")
		}
		if _, exists := rows[uint32(n)]; exists {
			return nil, errors.New("duplicate selection")
		}
		rows[uint32(n)] = m[2]
	}
	if rows[0] != "idled" {
		return nil, errors.New("expected explicit 0000 IDLED fallback")
	}
	return rows, nil
}

// Decode validates original scansw's decimal stdout and low-byte exit convention.
// Initialization errors, signals, extra text and out-of-range values are failures.
func Decode(c Capture, selections map[uint32]string) (Sample, error) {
	s := Sample{Capture: c}
	if !decimal.MatchString(c.Stdout) {
		return s, errors.New("expected one decimal scanner value")
	}
	raw, err := strconv.ParseUint(strings.TrimSuffix(c.Stdout, "\n"), 10, 24)
	if err != nil || c.ExitCode != int(raw&255) {
		return s, errors.New("scanner value/status inconsistent")
	}
	s.Raw = uint32(raw)
	s.SR = s.Raw & 0x3fffff
	s.NonSRBits = s.Raw >> 22
	s.SROctal = fmt.Sprintf("%08o", s.SR)
	s.Selector = fmt.Sprintf("%04o", s.Raw&0x3ffff)
	for i := range s.Bits {
		s.Bits[i] = s.SR&(1<<i) != 0
	}
	s.Profile = selections[s.Raw&0x3ffff]
	if s.Profile == "" {
		s.Profile = "default"
	}
	s.Profile = strings.Replace(s.Profile, "default", "idled", 1) // Original launcher sed substitution.
	return s, nil
}

// Fixtures reads a bounded synthetic sequence. It cannot execute any program.
func Fixtures(r io.Reader) ([]Capture, error) {
	b, err := io.ReadAll(io.LimitReader(r, 32769))
	if err != nil || len(b) > 32768 {
		return nil, errors.New("fixture exceeds limit")
	}
	var captures []Capture
	d := json.NewDecoder(strings.NewReader(string(b)))
	d.DisallowUnknownFields()
	if err = d.Decode(&captures); err != nil {
		return nil, err
	}
	var extra any
	if d.Decode(&extra) != io.EOF || len(captures) < 1 || len(captures) > MaxSamples {
		return nil, errors.New("one to 100 fixture samples required; no trailing data")
	}
	return captures, nil
}
