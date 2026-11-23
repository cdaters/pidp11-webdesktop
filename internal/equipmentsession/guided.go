package equipmentsession

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
)

// ParseOperatorCommand accepts a small local vocabulary, never monitor text or
// filesystem paths. Evidence remains an independent operator attestation.
func ParseOperatorCommand(line string) (Command, error) {
	fields := strings.Fields(line)
	if len(fields) < 2 {
		return Command{}, errors.New("operation and configured slot required")
	}
	c := Command{ID: fields[1], Operation: fields[0]}
	switch c.Operation {
	case "begin":
		if len(fields) < 3 || len(fields) > 4 {
			return c, errors.New("begin SLOT JOB [READ_ONLY_READER_SHA256]")
		}
		c.Job = fields[2]
		if len(fields) == 4 {
			c.ReaderSHA256 = fields[3]
		}
	case "returned", "closed":
		if len(fields) < 3 {
			return c, errors.New("independent evidence description required")
		}
		if c.Operation == "returned" {
			c.Operation = "guest-returned"
		}
		c.Evidence = strings.Join(fields[2:], " ")
	case "drained":
		if len(fields) < 4 {
			return c, errors.New("drained SLOT DECIMAL_DEVICE_LENGTH INDEPENDENT_EVIDENCE")
		}
		size, err := strconv.ParseInt(fields[2], 10, 64)
		if err != nil || size < 0 {
			return c, errors.New("nonnegative decimal device length required")
		}
		c.ProducedBytes = size
		c.Evidence = strings.Join(fields[3:], " ")
	case "reader":
		if len(fields) != 4 || (fields[3] != "eof" && fields[3] != "reading") {
			return c, errors.New("reader SLOT DECIMAL_POSITION reading|eof")
		}
		size, err := strconv.Atoi(fields[2])
		if err != nil || size < 0 {
			return c, errors.New("nonnegative reader position required")
		}
		c.Operation = "progress"
		c.ReaderBytes = size
		c.ReaderEOF = fields[3] == "eof"
	case "complete":
		if len(fields) != 3 {
			return c, errors.New("complete SLOT INDEPENDENT_CLOSED_FILE_SHA256")
		}
		c.SHA256 = fields[2]
	case "detach":
		if len(fields) != 2 {
			return c, errors.New("detach SLOT (ends observation only)")
		}
	default:
		return c, errors.New("unknown local equipment operation; no simulator command accepted")
	}
	return c, nil
}

// RunGuided translates bounded local operator lines into the same strict request
// stream as Run. It owns input and the translation pipe; EOF/error stops renewal.
// A separate conventional console is required for guest/device safe-state checks.
func (s *Supervisor) RunGuided(ctx context.Context, input io.ReadCloser, output io.Writer) error {
	defer input.Close()
	if _, err := fmt.Fprintf(output, "Equipment operator — independent observation only\nSimulator: %s\nGuest (operator-attested): %s\nAllowed slots: %s\nReview the independently prepared guest, actual devices and empty spools.\nType confirm only after verification. No guest is started or controlled here.\nThen: begin SLOT JOB [READER_SHA256] | returned SLOT EVIDENCE | reader SLOT POSITION reading|eof\ndrained SLOT LENGTH EVIDENCE | closed SLOT EVIDENCE | complete SLOT SHA256 | detach SLOT | quit\nGuest return is not drain. Drain is not flush. Complete requires independent safe close and full hash.\n", s.config.Simulator, s.config.Guest, strings.Join(s.config.Jobs, ", ")); err != nil {
		return err
	}
	reader, writer := io.Pipe()
	defer reader.Close()
	go func() {
		defer writer.Close()
		scanner := bufio.NewScanner(input)
		scanner.Buffer(make([]byte, 2048), 2048)
		confirmed := false
		sequence := uint64(0)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if !confirmed {
				if line != "confirm" {
					writer.CloseWithError(errors.New("explicit independent verification required"))
					return
				}
				confirmed = true
				continue
			}
			if line == "quit" {
				return
			}
			c, err := ParseOperatorCommand(line)
			if err != nil {
				writer.CloseWithError(err)
				return
			}
			sequence++
			c.Sequence = sequence
			if err := json.NewEncoder(writer).Encode(c); err != nil {
				return
			}
		}
		if err := scanner.Err(); err != nil {
			writer.CloseWithError(err)
		}
	}()
	return s.Run(ctx, reader, output)
}
