// Package consumer implements the optional, local laboratory fencing channel.
// Authority and generation allocation live in SIMH, not this client.
package consumer

import (
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"time"
)

type Status struct {
	OK         int    `json:"ok"`
	Generation uint64 `json:"generation"`
	Armed      int    `json:"armed"`
	Quiescent  int    `json:"quiescent"`
	Running    int    `json:"running"`
	Waiting    int    `json:"waiting"`
	Accepted   uint64 `json:"accepted"`
	Rejected   uint64 `json:"rejected"`
	Expiries   uint64 `json:"expiries"`
}
type Client struct {
	Path       string
	mu         sync.Mutex
	generation uint64
}

func (c *Client) request(command string) (Status, error) {
	var s Status
	conn, err := net.DialTimeout("unixpacket", c.Path, 100*time.Millisecond)
	if err != nil {
		return s, err
	}
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(100 * time.Millisecond))
	if _, err = conn.Write([]byte(command)); err != nil {
		return s, err
	}
	b := make([]byte, 1024)
	n, err := conn.Read(b)
	if err != nil {
		return s, err
	}
	if err = json.Unmarshal(b[:n], &s); err != nil {
		return s, err
	}
	if s.OK != 1 {
		return s, fmt.Errorf("consumer rejected %s", command)
	}
	return s, nil
}
func (c *Client) Ready() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	s, e := c.request("STATUS")
	return e == nil && s.Quiescent == 1 && s.Armed == 0
}
func (c *Client) Arm() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	s, e := c.request("STATUS")
	if e != nil {
		return e
	}
	if s.Quiescent != 1 || s.Armed != 0 {
		return fmt.Errorf("consumer not quiescent")
	}
	s, e = c.request(fmt.Sprintf("ARM %d", s.Generation))
	if e == nil {
		c.generation = s.Generation
	}
	return e
}
func (c *Client) Revoke() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, e := c.request("REVOKE")
	c.generation = 0
	return e
}
func (c *Client) Heartbeat() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	_, e := c.request(fmt.Sprintf("PING %d", c.generation))
	return e
}
