package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"io"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Exercise the actual command loop with captured data. The mismatch must be
// retained, but later captures and a successful summary must never appear.
func TestExpectedSRStopsAtFirstMismatch(t *testing.T) {
	for _, tc := range []struct {
		name, expected string
		wantSamples    int
		wantError      string
	}{
		{"matching then mismatch", "1", 2, "sample 1: expected SR 1, observed 0"},
		{"first mismatch", "0", 1, "sample 0: expected SR 0, observed 1"},
		{"disabled", "-1", 3, ""},
		{"out of range", "4194304", 0, "expected-sr must"},
		{"negative", "-2", 0, "expected-sr must"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			fixture := filepath.Join(dir, "captures.json")
			selections := filepath.Join(dir, "selections")
			if err := os.WriteFile(fixture, []byte(`[{"stdout":"1\n","exit_code":1},{"stdout":"0\n","exit_code":0},{"stdout":"1\n","exit_code":1}]`), 0600); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(selections, []byte("0000 idled\n0001 rsx11mp\n"), 0600); err != nil {
				t.Fatal(err)
			}
			savedFlags, savedArgs, savedOutput := flag.CommandLine, os.Args, os.Stdout
			defer func() { flag.CommandLine, os.Args, os.Stdout = savedFlags, savedArgs, savedOutput }()
			flag.CommandLine = flag.NewFlagSet("switchdiag", flag.ContinueOnError)
			os.Args = []string{"switchdiag", "-fixture", fixture, "-selections", selections, "-expected-sr", tc.expected}
			out, err := os.CreateTemp(dir, "output")
			if err != nil {
				t.Fatal(err)
			}
			defer out.Close()
			os.Stdout = out
			runErr := run()
			if tc.wantError == "" {
				if runErr != nil {
					t.Fatal(runErr)
				}
			} else if runErr == nil || !strings.Contains(runErr.Error(), tc.wantError) {
				t.Fatalf("error: %v", runErr)
			}
			if _, err = out.Seek(0, io.SeekStart); err != nil {
				t.Fatal(err)
			}
			data, err := io.ReadAll(out)
			if err != nil {
				t.Fatal(err)
			}
			decoder := json.NewDecoder(bytes.NewReader(data))
			samples, summaries := 0, 0
			for {
				var row map[string]json.RawMessage
				err = decoder.Decode(&row)
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				if row["sample"] != nil {
					samples++
				}
				if row["summary"] != nil {
					summaries++
				}
			}
			if samples != tc.wantSamples {
				t.Fatalf("samples=%d, want %d", samples, tc.wantSamples)
			}
			if tc.wantError != "" && summaries != 0 {
				t.Fatal("failure emitted successful summary")
			}
			if tc.wantError == "" && summaries != 1 {
				t.Fatal("missing successful summary")
			}
		})
	}
}
