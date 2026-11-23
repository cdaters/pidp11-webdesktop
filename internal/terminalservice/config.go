package terminalservice

import (
	"bytes"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"io"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"

	"pidp11.local/webdesktop/internal/access"
	"pidp11.local/webdesktop/internal/companion"
	"pidp11.local/webdesktop/internal/peripheral"
	"pidp11.local/webdesktop/internal/storage"
	"pidp11.local/webdesktop/internal/terminalbridge"
)

// Config contains only operator-provisioned addresses and private file paths.
// No attachment approvals or sessions are serialized here.
type Config struct {
	Storage             []storage.Config          `json:"storage_snapshots,omitempty"`
	SupervisedEndpoints []string                  `json:"supervised_endpoints,omitempty"`
	Followers           []peripheral.FollowConfig `json:"device_followers,omitempty"`
	AllowProposals      bool                      `json:"allow_readonly_command_proposals,omitempty"`
	Listen              string                    `json:"listen"`
	Origin              string                    `json:"origin"`
	Control             string                    `json:"control"`
	Certificate         string                    `json:"certificate"`
	Key                 string                    `json:"key"`
	Writer              string                    `json:"writer_token"`
	Observer            string                    `json:"observer_token"`
	Endpoints           []terminalbridge.Config   `json:"endpoints"`
	Devices             []peripheral.Config       `json:"device_exports,omitempty"`
	Companion           *companion.Config         `json:"companion,omitempty"`
}

// ReadPrivate opens once, refuses links/special files and bounds private inputs.
// Root-owned, group-readable inputs support a non-root systemd service identity;
// the administrator must reserve the containing directory and group for it.
func ReadPrivate(path string) ([]byte, error) {
	fd, err := syscall.Open(path, syscall.O_RDONLY|syscall.O_NOFOLLOW|syscall.O_NONBLOCK, 0)
	if err != nil {
		return nil, err
	}
	f := os.NewFile(uintptr(fd), path)
	defer f.Close()
	info, err := f.Stat()
	if err != nil {
		return nil, err
	}
	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok || !info.Mode().IsRegular() || info.Mode().Perm()&0027 != 0 || (int(st.Uid) != os.Geteuid() && st.Uid != 0) {
		return nil, errors.New("private regular file owned by root or service user required (0600/0640)")
	}
	data, err := io.ReadAll(io.LimitReader(f, 16385))
	if err != nil {
		return nil, err
	}
	if len(data) > 16384 {
		return nil, errors.New("private file exceeds 16 KiB")
	}
	return data, nil
}

// Load validates all private inputs before a listener or guest can be opened.
func Load(path string) (Config, *access.Gate, tls.Certificate, error) {
	var c Config
	var cert tls.Certificate
	data, err := ReadPrivate(path)
	if err != nil {
		return c, nil, cert, err
	}
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&c); err != nil {
		// Decoder errors can quote an unknown field supplied in private JSON.
		// Do not echo arbitrary input into a terminal or service journal.
		return c, nil, cert, errors.New("invalid configuration JSON: check field names, value types and syntax")
	}
	var extra any
	if decoder.Decode(&extra) != io.EOF {
		return c, nil, cert, errors.New("trailing configuration data")
	}
	if _, err = peripheral.New(c.Devices); err != nil {
		return c, nil, cert, err
	}
	if _, err = peripheral.NewFollowers(c.Followers); err != nil {
		return c, nil, cert, err
	}
	if _, err = storage.New(c.Storage); err != nil {
		return c, nil, cert, err
	}
	if c.Companion != nil {
		if _, err = companion.NewService(*c.Companion, ReadPrivate); err != nil {
			return c, nil, cert, err
		}
	}
	host, port, err := net.SplitHostPort(c.Listen)
	p, pe := strconv.Atoi(port)
	u, ue := url.Parse(c.Origin)
	if err != nil || pe != nil || p < 1024 || p > 65535 || net.ParseIP(host) == nil || ue != nil || u.Hostname() == "" || u.Port() != port {
		return c, nil, cert, errors.New("explicit IP listen address, unprivileged port and matching HTTPS origin port required")
	}
	if !filepath.IsAbs(c.Control) || len(c.Control) > 100 {
		return c, nil, cert, errors.New("short absolute control socket path required")
	}
	if err = terminalbridge.Validate(c.Endpoints); err != nil {
		return c, nil, cert, err
	}
	manager, err := NewSupervised(c.Endpoints, c.SupervisedEndpoints)
	if err != nil {
		return c, nil, cert, err
	}
	manager.Close()
	paths := []string{c.Writer, c.Observer, c.Certificate, c.Key}
	parts := make([][]byte, len(paths))
	for i, path := range paths {
		if !filepath.IsAbs(path) {
			return c, nil, cert, errors.New("absolute private file paths required")
		}
		parts[i], err = ReadPrivate(path)
		if err != nil {
			return c, nil, cert, err
		}
	}
	writer, observer := strings.TrimSpace(string(parts[0])), strings.TrimSpace(string(parts[1]))
	if !access.ValidToken(writer) || !access.ValidToken(observer) || writer == observer {
		return c, nil, cert, errors.New("distinct valid writer and observer tokens required")
	}
	gate, err := access.NewSecure(c.Origin, []access.Credential{{Token: writer, Capabilities: []access.Capability{access.TerminalObserve, access.TerminalInput, access.DeviceObserve, access.CompanionChat}}, {Token: observer, Capabilities: []access.Capability{access.TerminalObserve, access.DeviceObserve}}})
	if err != nil {
		return c, nil, cert, err
	}
	cert, err = tls.X509KeyPair(parts[2], parts[3])
	if err != nil {
		return c, nil, cert, err
	}
	leaf, err := x509.ParseCertificate(cert.Certificate[0])
	if err != nil {
		return c, nil, cert, err
	}
	if err = leaf.VerifyHostname(u.Hostname()); err != nil {
		return c, nil, cert, err
	}
	now := time.Now()
	if now.Before(leaf.NotBefore) || !now.Before(leaf.NotAfter) {
		return c, nil, cert, errors.New("certificate outside validity period")
	}
	return c, gate, cert, nil
}
