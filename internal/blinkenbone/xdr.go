// Package blinkenbone implements bounded, offline Blinkenlight API codecs.
// It does not open sockets, register RPC programs, or control an emulator.
package blinkenbone

import (
	"encoding/binary"
	"errors"
	"fmt"
	"io"
)

const Program uint32 = 99
const Version uint32 = 1
const MaxVector = 4096
const MaxMessage = 65536

var ErrMalformed = errors.New("malformed or unsupported BlinkenBone message")

type Panel struct {
	Name                                     string
	Inputs, Outputs, InputBytes, OutputBytes uint32
}
type Control struct {
	Name                            string
	Input, Type, Radix, Bits, Bytes uint32
}
type Params struct{ Class, Object, Handle, Value uint32 }

// Payload is the union of fields used by the IDL procedures. Procedure selects the wire shape.
type Payload struct {
	Error                     int32
	PanelID, ControlID        uint32
	Info                      string
	Panel                     Panel
	Control                   Control
	Values                    []byte
	Params                    Params
	Fixed1, Fixed2, ByteCount int32
}
type decoder struct {
	b      []byte
	offset int
	err    error
}

func (d *decoder) u() uint32 {
	if d.err != nil {
		return 0
	}
	if len(d.b)-d.offset < 4 {
		d.err = ErrMalformed
		return 0
	}
	v := binary.BigEndian.Uint32(d.b[d.offset:])
	d.offset += 4
	return v
}
func (d *decoder) str(max uint32) string {
	n := d.u()
	padded := (uint64(n) + 3) &^ uint64(3)
	if d.err != nil || n > max || padded > uint64(len(d.b)-d.offset) {
		d.err = ErrMalformed
		return ""
	}
	s := string(d.b[d.offset : d.offset+int(n)])
	for _, b := range d.b[d.offset+int(n) : d.offset+int(padded)] {
		if b != 0 {
			d.err = ErrMalformed
		}
	}
	d.offset += int(padded)
	return s
}
func (d *decoder) vector() []byte {
	// The original IDL uses char[], not opaque bytes: each element occupies a
	// four-byte XDR word. C xdr_char may sign-extend bytes 0x80..0xff.
	n := d.u()
	if d.err != nil || n > MaxVector || uint64(n)*4 > uint64(len(d.b)-d.offset) {
		d.err = ErrMalformed
		return nil
	}
	out := make([]byte, n)
	for i := range out {
		v := d.u()
		if v > 255 && v < 0xffffff80 {
			d.err = ErrMalformed
		}
		out[i] = byte(v)
	}
	return out
}
func (d *decoder) done() error {
	if d.err != nil || d.offset != len(d.b) {
		return ErrMalformed
	}
	return nil
}

type encoder []byte

func (e *encoder) u(v uint32) { *e = binary.BigEndian.AppendUint32(*e, v) }
func (e *encoder) str(s string) {
	e.u(uint32(len(s)))
	*e = append(*e, []byte(s)...)
	for len(*e)%4 != 0 {
		*e = append(*e, 0)
	}
}
func (e *encoder) vector(b []byte) {
	e.u(uint32(len(b)))
	for _, v := range b {
		e.u(uint32(v))
	}
}
func known(p uint32) bool {
	switch p {
	case 0, 1, 2, 3, 4, 5, 100, 101, 1000, 1001:
		return true
	}
	return false
}
func validate(p Payload) error {
	if len(p.Info) > 1024 || len(p.Panel.Name) > 80 || len(p.Control.Name) > 80 || len(p.Values) > MaxVector {
		return ErrMalformed
	}
	if p.Panel.Inputs > 256 || p.Panel.Outputs > 256 || p.Panel.InputBytes > MaxVector || p.Panel.OutputBytes > MaxVector {
		return ErrMalformed
	}
	return nil
}
func EncodePayload(proc uint32, reply bool, p Payload) ([]byte, error) {
	if !known(proc) {
		return nil, ErrMalformed
	}
	if err := validate(p); err != nil {
		return nil, err
	}
	var e encoder
	params := func(withValue bool) {
		e.u(p.Params.Class)
		e.u(p.Params.Object)
		e.u(p.Params.Handle)
		if withValue {
			e.u(p.Params.Value)
		}
	}
	values := func() { e.u(uint32(p.Error)); e.vector(p.Values) }
	if reply {
		switch proc {
		case 0:
		case 1:
			e.u(uint32(p.Error))
			e.str(p.Info)
		case 2:
			e.u(uint32(p.Error))
			e.str(p.Panel.Name)
			e.u(p.Panel.Inputs)
			e.u(p.Panel.Outputs)
			e.u(p.Panel.InputBytes)
			e.u(p.Panel.OutputBytes)
		case 3:
			e.u(uint32(p.Error))
			e.str(p.Control.Name)
			e.u(p.Control.Input)
			e.u(p.Control.Type)
			e.u(p.Control.Radix)
			e.u(p.Control.Bits)
			e.u(p.Control.Bytes)
		case 4:
			e.u(uint32(p.Error))
		case 5:
			values()
		case 100, 101:
			e.u(uint32(p.Error))
			params(true)
		case 1000:
			e.u(uint32(p.ByteCount))
		case 1001:
			e.u(uint32(p.Fixed1))
			e.u(uint32(p.Fixed2))
			e.vector(p.Values)
		}
	} else {
		switch proc {
		case 0, 1:
		case 2, 5:
			e.u(p.PanelID)
		case 3:
			e.u(p.PanelID)
			e.u(p.ControlID)
		case 4:
			e.u(p.PanelID)
			values()
		case 100:
			params(false)
		case 101:
			params(true)
		case 1000:
			e.u(uint32(p.Fixed1))
			e.u(uint32(p.Fixed2))
			e.vector(p.Values)
		case 1001:
			e.u(uint32(p.ByteCount))
		}
	}
	return e, nil
}
func DecodePayload(proc uint32, reply bool, b []byte) (Payload, error) {
	var p Payload
	if len(b) > MaxMessage || !known(proc) {
		return p, ErrMalformed
	}
	d := decoder{b: b}
	params := func(withValue bool) {
		p.Params = Params{Class: d.u(), Object: d.u(), Handle: d.u()}
		if withValue {
			p.Params.Value = d.u()
		}
	}
	values := func() { p.Error = int32(d.u()); p.Values = d.vector() }
	if reply {
		switch proc {
		case 0:
		case 1:
			p.Error = int32(d.u())
			p.Info = d.str(1024)
		case 2:
			p.Error = int32(d.u())
			p.Panel = Panel{Name: d.str(80), Inputs: d.u(), Outputs: d.u(), InputBytes: d.u(), OutputBytes: d.u()}
		case 3:
			p.Error = int32(d.u())
			p.Control = Control{Name: d.str(80), Input: d.u(), Type: d.u(), Radix: d.u(), Bits: d.u(), Bytes: d.u()}
		case 4:
			p.Error = int32(d.u())
		case 5:
			values()
		case 100, 101:
			p.Error = int32(d.u())
			params(true)
		case 1000:
			p.ByteCount = int32(d.u())
		case 1001:
			p.Fixed1 = int32(d.u())
			p.Fixed2 = int32(d.u())
			p.Values = d.vector()
		}
	} else {
		switch proc {
		case 0, 1:
		case 2, 5:
			p.PanelID = d.u()
		case 3:
			p.PanelID = d.u()
			p.ControlID = d.u()
		case 4:
			p.PanelID = d.u()
			values()
		case 100:
			params(false)
		case 101:
			params(true)
		case 1000:
			p.Fixed1 = int32(d.u())
			p.Fixed2 = int32(d.u())
			p.Values = d.vector()
		case 1001:
			p.ByteCount = int32(d.u())
		}
	}
	if err := d.done(); err != nil {
		return Payload{}, err
	}
	if err := validate(p); err != nil {
		return Payload{}, err
	}
	return p, nil
}

// ValidateSchema is separate from wire decoding: error replies contain dummy descriptors.
func ValidateSchema(cs []Control) error {
	if len(cs) == 0 || len(cs) > 256 {
		return ErrMalformed
	}
	names := map[string]bool{}
	for _, c := range cs {
		key := fmt.Sprintf("%d:%s", c.Input, c.Name)
		if c.Input > 1 || c.Bits == 0 || c.Bits > 64 || c.Bytes != (c.Bits+7)/8 || c.Name == "" || len(c.Name) > 80 || names[key] {
			return ErrMalformed
		}
		names[key] = true
	}
	return nil
}
func PackValues(cs []Control, values []uint64) ([]byte, error) {
	if err := ValidateSchema(cs); err != nil {
		return nil, err
	}
	if len(cs) != len(values) {
		return nil, ErrMalformed
	}
	var out []byte
	for i, c := range cs {
		v := values[i]
		if c.Bits < 64 && v>>c.Bits != 0 {
			return nil, ErrMalformed
		}
		for j := uint32(0); j < c.Bytes; j++ {
			out = append(out, byte(v>>(8*j)))
		}
	}
	if len(out) > MaxVector {
		return nil, ErrMalformed
	}
	return out, nil
}
func UnpackValues(cs []Control, b []byte) ([]uint64, error) {
	if err := ValidateSchema(cs); err != nil {
		return nil, err
	}
	out := make([]uint64, len(cs))
	offset := 0
	for i, c := range cs {
		if len(b)-offset < int(c.Bytes) {
			return nil, ErrMalformed
		}
		for j := uint32(0); j < c.Bytes; j++ {
			out[i] |= uint64(b[offset+int(j)]) << (8 * j)
		}
		if c.Bits < 64 && out[i]>>c.Bits != 0 {
			return nil, ErrMalformed
		}
		offset += int(c.Bytes)
	}
	if offset != len(b) {
		return nil, ErrMalformed
	}
	return out, nil
}

type Call struct {
	XID, Procedure uint32
	Payload        Payload
}

func EncodeCall(c Call) ([]byte, error) {
	body, err := EncodePayload(c.Procedure, false, c.Payload)
	if err != nil {
		return nil, err
	}
	var e encoder
	for _, v := range []uint32{c.XID, 0, 2, Program, Version, c.Procedure, 0, 0, 0, 0} {
		e.u(v)
	}
	return append(e, body...), nil
}
func DecodeCall(b []byte) (Call, error) {
	var c Call
	if len(b) > MaxMessage {
		return c, ErrMalformed
	}
	d := decoder{b: b}
	c.XID = d.u()
	if d.u() != 0 || d.u() != 2 || d.u() != Program || d.u() != Version {
		return Call{}, ErrMalformed
	}
	c.Procedure = d.u()
	for i := 0; i < 4; i++ {
		if d.u() != 0 {
			return Call{}, ErrMalformed
		}
	}
	if d.err != nil {
		return Call{}, ErrMalformed
	}
	p, err := DecodePayload(c.Procedure, false, b[d.offset:])
	c.Payload = p
	return c, err
}
func EncodeReply(xid, proc uint32, p Payload) ([]byte, error) {
	body, err := EncodePayload(proc, true, p)
	if err != nil {
		return nil, err
	}
	var e encoder
	for _, v := range []uint32{xid, 1, 0, 0, 0, 0} {
		e.u(v)
	}
	return append(e, body...), nil
}
func DecodeReply(xid, proc uint32, b []byte) (Payload, error) {
	if len(b) > MaxMessage {
		return Payload{}, ErrMalformed
	}
	d := decoder{b: b}
	if d.u() != xid || d.u() != 1 {
		return Payload{}, ErrMalformed
	}
	for i := 0; i < 4; i++ {
		if d.u() != 0 {
			return Payload{}, ErrMalformed
		}
	}
	if d.err != nil {
		return Payload{}, ErrMalformed
	}
	return DecodePayload(proc, true, b[d.offset:])
}

// ReadRecord handles bounded ONC RPC TCP fragmentation without allocating declared sizes blindly.
func ReadRecord(r io.Reader) ([]byte, error) {
	var out []byte
	for fragments := 0; fragments < 32; fragments++ {
		var h [4]byte
		if _, err := io.ReadFull(r, h[:]); err != nil {
			return nil, err
		}
		v := binary.BigEndian.Uint32(h[:])
		n := v & 0x7fffffff
		if uint64(len(out))+uint64(n) > MaxMessage {
			return nil, ErrMalformed
		}
		start := len(out)
		out = append(out, make([]byte, n)...)
		if _, err := io.ReadFull(r, out[start:]); err != nil {
			return nil, err
		}
		if v>>31 == 1 {
			return out, nil
		}
	}
	return nil, ErrMalformed
}
func Record(b []byte) ([]byte, error) {
	if len(b) > MaxMessage {
		return nil, ErrMalformed
	}
	return append(binary.BigEndian.AppendUint32(nil, uint32(len(b))|0x80000000), b...), nil
}
