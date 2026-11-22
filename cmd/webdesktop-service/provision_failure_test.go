package main

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"syscall"
	"testing"
)

func TestProvisionWriteFailureCleansOnlyNewMaterial(t *testing.T) {
	for _, failAt := range []int{1, 2, 3} {
		directory := filepath.Join(t.TempDir(), "new")
		files := map[string][]byte{"key.pem": []byte("private fixture"), "writer.token": []byte("private fixture"), "config.json": []byte("{}")}
		writes := 0
		err := writeProvisionFiles(directory, files, func(file *os.File, data []byte) error {
			writes++
			if writes < 3 {
				if _, err := os.Stat(filepath.Join(directory, "config.json")); !os.IsNotExist(err) {
					t.Fatal("configuration published before private inputs")
				}
			}
			if writes == failAt {
				file.Write(data[:1])
				return syscall.ENOSPC
			}
			return writePrivateFile(file, data)
		})
		if !errors.Is(err, syscall.ENOSPC) || strings.Contains(err.Error(), "private fixture") {
			t.Fatal("missing write error or leaked content", err)
		}
		if _, err := os.Lstat(directory); !os.IsNotExist(err) {
			t.Fatal("partial private directory remained after handled failure")
		}
		if err := writeProvisionFiles(directory, files, writePrivateFile); err != nil {
			t.Fatal("fresh retry failed", err)
		}
		before, _ := os.ReadFile(filepath.Join(directory, "key.pem"))
		if writeProvisionFiles(directory, files, writePrivateFile) == nil {
			t.Fatal("existing configuration overwritten")
		}
		after, _ := os.ReadFile(filepath.Join(directory, "key.pem"))
		if string(before) != string(after) {
			t.Fatal("existing material changed")
		}
	}
}

func TestProvisionCleanupPreservesUnexpectedFile(t *testing.T) {
	directory := filepath.Join(t.TempDir(), "new")
	err := writeProvisionFiles(directory, map[string][]byte{"config.json": []byte("{}")}, func(file *os.File, data []byte) error {
		if err := os.WriteFile(filepath.Join(directory, "retain.txt"), []byte("evidence"), 0600); err != nil {
			t.Fatal(err)
		}
		return syscall.ENOSPC
	})
	if err == nil || !strings.Contains(err.Error(), "retained for inspection") {
		t.Fatal("missing retained-directory diagnostic", err)
	}
	data, err := os.ReadFile(filepath.Join(directory, "retain.txt"))
	if err != nil || string(data) != "evidence" {
		t.Fatal("unrelated evidence removed")
	}
	if _, err := os.Stat(filepath.Join(directory, "config.json")); !os.IsNotExist(err) {
		t.Fatal("own incomplete file retained")
	}
}

func TestInvalidConfigurationDoesNotEchoPrivateInput(t *testing.T) {
	directory := t.TempDir()
	path := filepath.Join(directory, "config.json")
	if err := os.WriteFile(path, []byte(`{"private-content-canary":true}`), 0600); err != nil {
		t.Fatal(err)
	}
	err := checkConfig(path, os.Stdout)
	if err == nil || strings.Contains(err.Error(), "private-content-canary") || !strings.Contains(err.Error(), "field names") {
		t.Fatal("private JSON echoed or unusable diagnostic", err)
	}
}
