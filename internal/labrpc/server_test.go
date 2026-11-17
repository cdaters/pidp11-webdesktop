package labrpc

import (
	"bytes"
	"context"
	"encoding/binary"
	"net"
	bb "pidp11.local/webdesktop/internal/blinkenbone"
	"testing"
	"time"
)

func fixture(t *testing.T) (*Server, *Panel) {
	t.Helper()
	p := NewPanel()
	s, e := Listen("127.0.0.1:0", p)
	if e != nil {
		t.Fatal(e)
	}
	ctx, cancel := context.WithCancel(context.Background())
	go s.Serve(ctx)
	t.Cleanup(cancel)
	return s, p
}
func TestOriginalSchemaTransportAndBounds(t *testing.T) {
	s, p := fixture(t)
	for _, network := range []string{"udp", "tcp"} {
		t.Run(network, func(t *testing.T) {
			c, e := Dial(network, s.Address())
			if e != nil {
				t.Fatal(e)
			}
			defer c.Close()
			if e = c.Discover(); e != nil {
				t.Fatal(e)
			}
			if len(c.Controls) != 29 {
				t.Fatal(len(c.Controls))
			}
			i, e := c.Read()
			if e != nil || i["POWER"] != 1 {
				t.Fatal(i, e)
			}
			if e = c.Write(map[string]uint64{"ADDRESS": 0x123456, "DATA": 0xff80}); e != nil {
				t.Fatal(e)
			}
			_, o, _, _ := p.Snapshot()
			if o["DATA"] != 0xff80 {
				t.Fatal(o)
			}
			bad, e := c.Call(4, bb.Payload{Values: []byte{0}})
			if e != nil || bad.Error == 0 {
				t.Fatal(bad, e)
			}
		})
	}
}
func TestUDPReplayAndExclusiveConsumer(t *testing.T) {
	s, p := fixture(t)
	s.Exclusive.Store(true)
	c, e := net.Dial("udp", s.Address())
	if e != nil {
		t.Fatal(e)
	}
	defer c.Close()
	c.SetDeadline(time.Now().Add(time.Second))
	req, _ := bb.EncodeCall(bb.Call{XID: 42, Procedure: 5})
	read := func(b []byte) []byte {
		t.Helper()
		c.Write(b)
		out := make([]byte, 4096)
		n, e := c.Read(out)
		if e != nil {
			t.Fatal(e)
		}
		return out[:n]
	}
	first := read(req)
	second := read(req)
	if !bytes.Equal(first, second) {
		t.Fatal("duplicate changed reply")
	}
	_, _, gets, _ := p.Snapshot()
	if gets != 1 {
		t.Fatal("duplicate advanced polling", gets)
	}
	bad := append([]byte(nil), req...)
	bad[23] = 1
	if binary.BigEndian.Uint32(read(bad)[20:]) != 4 {
		t.Fatal("XID conflict accepted")
	}
	other, _ := Dial("udp", s.Address())
	defer other.Close()
	if _, e = other.Call(5, bb.Payload{}); e == nil {
		t.Fatal("second consumer accepted")
	}
}
func TestRPCFailuresAndFragmentedTCP(t *testing.T) {
	s, _ := fixture(t)
	req, _ := bb.EncodeCall(bb.Call{XID: 7, Procedure: 1})
	for _, tc := range []struct {
		offset        int
		value, status uint32
	}{{12, 100, 1}, {16, 99, 2}, {20, 999, 3}} {
		b := append([]byte(nil), req...)
		binary.BigEndian.PutUint32(b[tc.offset:], tc.value)
		r := s.dispatch(b, "fixture")
		if binary.BigEndian.Uint32(r[20:]) != tc.status {
			t.Fatal(tc, r)
		}
	}
	c, _ := net.Dial("tcp", s.Address())
	defer c.Close()
	c.SetDeadline(time.Now().Add(time.Second))
	record := append(words(4), req[:4]...)
	last, _ := bb.Record(req[4:])
	record = append(record, last...)
	c.Write(record)
	reply, e := bb.ReadRecord(c)
	if e != nil {
		t.Fatal(e)
	}
	p, e := bb.DecodeReply(7, 1, reply)
	if e != nil || p.Info == "" {
		t.Fatal(p, e)
	}
}
func TestNoExternalEndpoints(t *testing.T) {
	for _, address := range []string{"pidp11.local:99", "192.168.1.1:99", "0.0.0.0:99"} {
		if s, e := Listen(address, NewPanel()); e == nil {
			s.Close()
			t.Fatal(address)
		}
		if c, e := Dial("udp", address); e == nil {
			c.Close()
			t.Fatal(address)
		}
	}
}

func TestProfileMismatchFailsClosed(t *testing.T) {
	c := &Client{Controls: PDP1170()}
	if e := c.ValidatePDP1170(); e != nil {
		t.Fatal(e)
	}
	c.Controls[0].Bits = 16
	if e := c.ValidatePDP1170(); e == nil {
		t.Fatal("changed width accepted")
	}
	c.Controls = PDP1170()[1:]
	if e := c.ValidatePDP1170(); e == nil {
		t.Fatal("missing input accepted")
	}
}
func FuzzRPCDispatch(f *testing.F) {
	s := &Server{handler: NewPanel()}
	for _, proc := range []uint32{0, 1, 2, 3, 4, 5, 100, 101, 1000, 1001} {
		b, _ := bb.EncodeCall(bb.Call{XID: 1, Procedure: proc})
		f.Add(b)
	}
	f.Fuzz(func(t *testing.T, b []byte) {
		reply := s.dispatch(b, "fixture")
		if len(reply) > bb.MaxMessage {
			t.Fatal("unbounded reply")
		}
	})
}
