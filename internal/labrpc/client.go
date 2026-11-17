package labrpc

import (
	"fmt"
	"net"
	bb "pidp11.local/webdesktop/internal/blinkenbone"
	"sync"
	"time"
)

// Client has no DNS, retry or discovery: only an explicitly supplied loopback stand-in.
type Client struct {
	mu       sync.Mutex
	conn     net.Conn
	xid      uint32
	network  string
	Controls []bb.Control
}

func Dial(network, address string) (*Client, error) {
	host, _, e := net.SplitHostPort(address)
	if e != nil || net.ParseIP(host) == nil || !net.ParseIP(host).IsLoopback() {
		return nil, fmt.Errorf("loopback required")
	}
	if network != "tcp" && network != "udp" {
		return nil, fmt.Errorf("invalid transport")
	}
	c, e := net.DialTimeout(network, address, time.Second)
	if e != nil {
		return nil, e
	}
	return &Client{conn: c, network: network}, nil
}
func (c *Client) Close() { c.conn.Close() }
func (c *Client) Call(proc uint32, p bb.Payload) (bb.Payload, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.xid++
	b, e := bb.EncodeCall(bb.Call{XID: c.xid, Procedure: proc, Payload: p})
	if e != nil {
		return bb.Payload{}, e
	}
	c.conn.SetDeadline(time.Now().Add(200 * time.Millisecond))
	if c.network == "tcp" {
		b, _ = bb.Record(b)
	}
	if _, e = c.conn.Write(b); e != nil {
		return bb.Payload{}, e
	}
	if c.network == "tcp" {
		b, e = bb.ReadRecord(c.conn)
	} else {
		b = make([]byte, bb.MaxMessage)
		var n int
		n, e = c.conn.Read(b)
		b = b[:n]
	}
	if e != nil {
		return bb.Payload{}, e
	}
	return bb.DecodeReply(c.xid, proc, b)
}
func (c *Client) Discover() error {
	p, e := c.Call(2, bb.Payload{})
	if e != nil {
		return e
	}
	if p.Error != 0 || p.Panel.Name != "11/70" {
		return fmt.Errorf("unexpected panel")
	}
	cs := []bb.Control{}
	for i := uint32(0); i < p.Panel.Inputs+p.Panel.Outputs; i++ {
		r, e := c.Call(3, bb.Payload{ControlID: i})
		if e != nil {
			return e
		}
		if r.Error != 0 {
			return fmt.Errorf("descriptor error")
		}
		cs = append(cs, r.Control)
	}
	if e := bb.ValidateSchema(cs); e != nil {
		return e
	}
	var ib, ob uint32
	for _, x := range Filter(cs, 1) {
		ib += x.Bytes
	}
	for _, x := range Filter(cs, 0) {
		ob += x.Bytes
	}
	if ib != p.Panel.InputBytes || ob != p.Panel.OutputBytes {
		return fmt.Errorf("descriptor length mismatch")
	}
	c.Controls = cs
	return nil
}
func (c *Client) Read() (map[string]uint64, error) {
	p, e := c.Call(5, bb.Payload{})
	if e != nil {
		return nil, e
	}
	if p.Error != 0 {
		return nil, fmt.Errorf("input error")
	}
	cs := Filter(c.Controls, 1)
	v, e := bb.UnpackValues(cs, p.Values)
	if e != nil {
		return nil, e
	}
	out := map[string]uint64{}
	for i, x := range v {
		out[cs[i].Name] = x
	}
	return out, nil
}
func (c *Client) Write(values map[string]uint64) error {
	cs := Filter(c.Controls, 0)
	vs := make([]uint64, len(cs))
	for i, x := range cs {
		vs[i] = values[x.Name]
	}
	b, e := bb.PackValues(cs, vs)
	if e != nil {
		return e
	}
	p, e := c.Call(4, bb.Payload{Values: b})
	if e == nil && p.Error != 0 {
		e = fmt.Errorf("output error")
	}
	return e
}
