//go:build linux

package main

import (
	"os"
	"os/exec"
	"testing"
)

func TestProcessIdentityRetiresExitedProducer(t *testing.T) {
	if _, err := processIdentity(1); err == nil {
		t.Fatal("init accepted")
	}
	current, err := processIdentity(os.Getpid())
	if err != nil || current == "" {
		t.Fatal(err)
	}
	command := exec.Command("sleep", "30")
	if err := command.Start(); err != nil {
		t.Fatal(err)
	}
	defer command.Process.Kill()
	child, err := processIdentity(command.Process.Pid)
	if err != nil || child == current {
		t.Fatal("process identities not distinct")
	}
	if err := command.Process.Kill(); err != nil {
		t.Fatal(err)
	}
	command.Wait()
	if _, err := processIdentity(command.Process.Pid); err == nil {
		t.Fatal("exited process still accepted")
	}
}
