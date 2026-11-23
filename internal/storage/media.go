package storage

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"io"
	"os"
	"path/filepath"
	"syscall"
)

// VerifyMedia reads one operator-configured regular file without write access.
// It must run at an independently verified quiescent capture boundary. Hashing
// proves the bytes at that boundary, not attachment or future writable-media state.
func VerifyMedia(path string, snapshot Snapshot) error {
	if err := Validate(snapshot); err != nil {
		return err
	}
	if !filepath.IsAbs(path) {
		return errors.New("absolute allowlisted media path required")
	}
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return errors.New("approved media unavailable")
	}
	file := os.NewFile(uintptr(fd), path)
	defer file.Close()
	before, err := file.Stat()
	if err != nil || !before.Mode().IsRegular() || before.Size() != snapshot.Size {
		return errors.New("media type or length changed")
	}
	digest := sha256.New()
	n, err := io.Copy(digest, io.LimitReader(file, snapshot.Size+1))
	after, statErr := file.Stat()
	named, pathErr := os.Lstat(path)
	if err != nil || statErr != nil || pathErr != nil || n != snapshot.Size || !os.SameFile(before, after) || !os.SameFile(after, named) || named.Mode()&os.ModeSymlink != 0 || before.Size() != after.Size() || !before.ModTime().Equal(after.ModTime()) || !after.ModTime().Equal(named.ModTime()) || hex.EncodeToString(digest.Sum(nil)) != snapshot.SHA256 {
		return errors.New("media identity changed during capture")
	}
	return nil
}
