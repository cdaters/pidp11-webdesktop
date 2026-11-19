// switchdiag defaults to offline captured data. The explicit original-scanner
// mode is a separately authorized hardware diagnostic, never a launcher.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"pidp11.local/webdesktop/internal/switchdiag"
)

func run() error {
	fixture := flag.String("fixture", "", "synthetic scanner captures JSON; never executes scanner")
	selections := flag.String("selections", "", "captured or synthetic selection map (read only)")
	hardware := flag.Bool("original-scanner", false, "run pinned original scansw; requires separate hardware authorization")
	ack := flag.Bool("acknowledge-gpio-initialization", false, "acknowledge original scanner changes GPIO direction/pulls")
	count := flag.Int("samples", 10, "hardware sample limit (1–100)")
	interval := flag.Duration("interval", 250*time.Millisecond, "hardware interval (100ms–5s); total run capped at 30s")
	flag.Parse()
	if flag.NArg() != 0 || *selections == "" || (*hardware == (*fixture != "")) || (*ack && !*hardware) {
		return fmt.Errorf("choose exactly one fixture or original-scanner mode and a selection map")
	}
	f, err := os.Open(*selections)
	if err != nil {
		return err
	}
	rows, err := switchdiag.Selections(f)
	f.Close()
	if err != nil {
		return err
	}
	var captures []switchdiag.Capture
	var scanner *originalScanner
	if *hardware {
		if !*ack || *count < 1 || *count > 100 || *interval < 100*time.Millisecond || *interval > 5*time.Second {
			return fmt.Errorf("hardware acknowledgement and bounded sample settings required")
		}
		scanner, err = openOriginal()
		if err != nil {
			return err
		}
		defer scanner.Close()
	} else {
		f, err := os.Open(*fixture)
		if err != nil {
			return err
		}
		captures, err = switchdiag.Fixtures(f)
		f.Close()
		if err != nil {
			return err
		}
		*count = len(captures)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	encoder := json.NewEncoder(os.Stdout)
	mode := "synthetic-fixture"
	if *hardware {
		mode = "original-scanner"
	}
	start := time.Now()
	var previous uint32
	transitions := 0
	for i := 0; i < *count; i++ {
		begin := time.Now()
		var capture switchdiag.Capture
		if scanner != nil {
			capture, err = scanner.Sample(ctx)
		} else {
			capture = captures[i]
		}
		if err != nil {
			if writeErr := encoder.Encode(map[string]any{"mode": mode, "index": i, "valid": false, "capture": capture, "error": err.Error()}); writeErr != nil {
				return writeErr
			}
			return fmt.Errorf("sample %d: %w; no retry", i, err)
		}
		sample, err := switchdiag.Decode(capture, rows)
		if err != nil {
			if writeErr := encoder.Encode(map[string]any{"mode": mode, "index": i, "valid": false, "capture": capture, "error": err.Error()}); writeErr != nil {
				return writeErr
			}
			return fmt.Errorf("sample %d: %w; no retry", i, err)
		}
		sample.At = begin.UTC()
		sample.ElapsedNS = begin.Sub(start).Nanoseconds()
		sample.DurationNS = time.Since(begin).Nanoseconds()
		if i > 0 {
			sample.ChangedBits = previous ^ sample.SR
			if sample.ChangedBits != 0 {
				transitions++
			}
		}
		previous = sample.SR
		if err = encoder.Encode(struct {
			Mode   string            `json:"mode"`
			Index  int               `json:"index"`
			Sample switchdiag.Sample `json:"sample"`
		}{mode, i, sample}); err != nil {
			return err
		}
		if scanner != nil && i+1 < *count {
			select {
			case <-ctx.Done():
				return fmt.Errorf("30-second observation limit reached")
			case <-time.After(*interval):
			}
		}
	}
	return encoder.Encode(map[string]any{"summary": true, "samples": *count, "sr_transitions": transitions, "stable_sr": transitions == 0, "physical_cause_established": false})
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
