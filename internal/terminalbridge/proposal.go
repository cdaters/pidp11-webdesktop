package terminalbridge

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"
)

type proposal struct {
	id      string
	input   []byte
	epoch   uint64
	expires time.Time
}

// ProposalOperation is a narrow initial approval workflow. HTTP enables it only
// with explicit private configuration, disabled by default. It admits three
// read-only UNIX suggestions, not arbitrary command execution. Only the current
// viewer/lease can propose or approve; the unique Endpoint lifetime is its guest
// generation. Approval consumes the ID before using the ordinary input path.
func (e *Endpoint) ProposalOperation(c *Client, op, id string, epoch, seq uint64, data []byte) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.expire()
	if !e.clients[c] || e.owner != c || e.conn == nil || epoch != e.epoch {
		return errors.New("current keyboard ownership required")
	}
	if op == "cancel-proposal" {
		c.proposal = nil
		return nil
	}
	if op == "propose" {
		switch string(data) {
		case "pwd\r", "ls\r", "ls /\r":
		default:
			return errors.New("only reviewed read-only UNIX suggestions supported")
		}
		var nonce [16]byte
		if _, err := rand.Read(nonce[:]); err != nil {
			return err
		}
		p := &proposal{hex.EncodeToString(nonce[:]), append([]byte(nil), data...), epoch, e.Now().Add(30 * time.Second)}
		c.proposal = p
		e.send(c, Frame{Type: "proposal", ProposalID: p.id, Data: p.input, Epoch: p.epoch, Expires: p.expires.UnixMilli()})
		return nil
	}
	if op != "approve" {
		return errors.New("invalid proposal action")
	}
	p := c.proposal
	c.proposal = nil
	if p == nil || id != p.id || p.epoch != epoch || !e.Now().Before(p.expires) {
		return errors.New("proposal expired, revoked or consumed")
	}
	if err := e.operationLocked(c, "input", epoch, seq, p.input, 0); err != nil {
		return err
	}
	e.send(c, Frame{Type: "proposal-result", ProposalID: id, Message: "Bytes delivered once; guest command success is not inferred"})
	return nil
}
