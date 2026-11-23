// equipment-supervisor is an explicitly configured, isolated-Linux observer owner.
// It never starts, stops or controls SIMH. Local operator requests arrive on stdin;
// stdout acknowledges them. Loss/restart requires fresh explicit operator approval.
package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"os"
	"os/signal"
	"runtime"
	"strings"
	"syscall"

	"pidp11.local/webdesktop/internal/equipmentsession"
	"pidp11.local/webdesktop/internal/terminalservice"
)

func start(pid int) (string, error) {
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	if err != nil {
		return "", err
	}
	end := strings.LastIndexByte(string(data), ')')
	if end < 0 {
		return "", errors.New("invalid producer record")
	}
	fields := strings.Fields(string(data[end+1:]))
	if len(fields) < 20 || fields[0] == "Z" {
		return "", errors.New("producer not available")
	}
	return fields[19], nil
}
func run() error {
	path := flag.String("config", "", "private operator configuration")
	flag.Parse()
	if runtime.GOOS != "linux" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		return errors.New("isolated Linux laboratory only; production supervision unqualified")
	}
	interfaces, err := net.Interfaces()
	if err != nil {
		return err
	}
	for _, i := range interfaces {
		if i.Flags&net.FlagLoopback == 0 {
			return errors.New("non-loopback network forbidden in lab")
		}
	}
	data, err := terminalservice.ReadPrivate(*path)
	if err != nil {
		return err
	}
	var c equipmentsession.Config
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var extra any
	if decoder.Decode(&c) != nil || decoder.Decode(&extra) != io.EOF || c.PID <= 0 || c.Start == "" {
		return errors.New("invalid supervisor configuration")
	}
	exePath := fmt.Sprintf("/proc/%d/exe", c.PID)
	exe, err := os.Open(exePath)
	if err != nil {
		return err
	}
	identity, err := exe.Stat()
	if err != nil {
		exe.Close()
		return err
	}
	digest := sha256.New()
	_, err = io.Copy(digest, exe)
	exe.Close()
	if err != nil || hex.EncodeToString(digest.Sum(nil)) != c.ExecutableSHA256 {
		return errors.New("producer executable checksum mismatch")
	}
	probe := func() error {
		began, err := start(c.PID)
		if err != nil || began != c.Start {
			return errors.New("producer changed; approvals will expire")
		}
		current, err := os.Stat(exePath)
		if err != nil || !os.SameFile(identity, current) || identity.Size() != current.Size() || !identity.ModTime().Equal(current.ModTime()) {
			return errors.New("producer executable changed")
		}
		return nil
	}
	supervisor, err := equipmentsession.New(c, probe)
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	return supervisor.Run(ctx, os.Stdin, os.Stdout)
}
func main() {
	if err := run(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}
