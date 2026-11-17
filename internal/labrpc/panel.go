package labrpc

import (
	"fmt"
	bb "pidp11.local/webdesktop/internal/blinkenbone"
	"sync"
)

// PDP1170 preserves the descriptor order and widths of the pinned PiDP definition.
func PDP1170() []bb.Control {
	var out []bb.Control
	add := func(name string, input, bits uint32) {
		kind := uint32(2)
		if input == 1 {
			kind = 1
		}
		out = append(out, bb.Control{Name: name, Input: input, Type: kind, Radix: 8, Bits: bits, Bytes: (bits + 7) / 8})
	}
	add("SR", 1, 22)
	for _, n := range []string{"LAMPTEST", "LOAD_ADRS", "EXAM", "DEPOSIT", "CONT", "HALT", "S_BUS_CYCLE", "START"} {
		add(n, 1, 1)
	}
	add("ADDRESS", 0, 22)
	add("DATA", 0, 16)
	for _, n := range []string{"PARITY_HIGH", "PARITY_LOW", "PAR_ERR", "ADRS_ERR", "RUN", "PAUSE", "MASTER"} {
		add(n, 0, 1)
	}
	add("MMR0_MODE", 0, 3)
	for _, n := range []string{"DATA_SPACE", "ADDRESSING_16", "ADDRESSING_18", "ADDRESSING_22"} {
		add(n, 0, 1)
	}
	add("ADDR_SELECT", 1, 3)
	add("DATA_SELECT", 1, 2)
	add("ADDR_SELECT_FEEDBACK", 0, 8)
	add("DATA_SELECT_FEEDBACK", 0, 4)
	add("PANEL_LOCK", 1, 1)
	add("POWER", 1, 1)
	return out
}
func Filter(cs []bb.Control, input uint32) []bb.Control {
	var out []bb.Control
	for _, c := range cs {
		if c.Input == input {
			out = append(out, c)
		}
	}
	return out
}
func Clone(v map[string]uint64) map[string]uint64 {
	out := make(map[string]uint64, len(v))
	for k, x := range v {
		out[k] = x
	}
	return out
}

type Panel struct {
	mu              sync.Mutex
	Controls        []bb.Control
	Inputs, Outputs map[string]uint64
	Gets, Sets      uint64
	Mode, Board     uint32
	ReadInputs      func() map[string]uint64
	WriteOutputs    func(map[string]uint64)
}

func NewPanel() *Panel {
	return &Panel{Controls: PDP1170(), Inputs: map[string]uint64{"POWER": 1, "HALT": 1, "ADDR_SELECT": 4, "DATA_SELECT": 2}, Outputs: map[string]uint64{}, Board: 2}
}
func (p *Panel) Snapshot() (map[string]uint64, map[string]uint64, uint64, uint64) {
	p.mu.Lock()
	defer p.mu.Unlock()
	return Clone(p.Inputs), Clone(p.Outputs), p.Gets, p.Sets
}
func (p *Panel) Set(values map[string]uint64) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	for name, value := range values {
		found := false
		for _, c := range p.Controls {
			if c.Input == 1 && c.Name == name {
				found = true
				if c.Bits < 64 && value>>c.Bits != 0 {
					return fmt.Errorf("%s out of range", name)
				}
			}
		}
		if !found {
			return fmt.Errorf("unknown input %s", name)
		}
	}
	for k, v := range values {
		p.Inputs[k] = v
	}
	return nil
}
func (p *Panel) Handle(c bb.Call) bb.Payload {
	p.mu.Lock()
	defer p.mu.Unlock()
	in, out := Filter(p.Controls, 1), Filter(p.Controls, 0)
	a := c.Payload
	if c.Procedure >= 2 && c.Procedure <= 5 && a.PanelID != 0 {
		return bb.Payload{Error: 1}
	}
	switch c.Procedure {
	case 0:
		return bb.Payload{}
	case 1:
		return bb.Payload{Info: "PiDP11 isolated Go laboratory; no GPIO"}
	case 2:
		d := bb.Panel{Name: "11/70", Inputs: uint32(len(in)), Outputs: uint32(len(out))}
		for _, v := range in {
			d.InputBytes += v.Bytes
		}
		for _, v := range out {
			d.OutputBytes += v.Bytes
		}
		return bb.Payload{Panel: d}
	case 3:
		if int(a.ControlID) >= len(p.Controls) {
			return bb.Payload{Error: 1}
		}
		return bb.Payload{Control: p.Controls[a.ControlID]}
	case 4:
		if a.Error != 0 {
			return bb.Payload{Error: 1}
		}
		values, e := bb.UnpackValues(out, a.Values)
		if e != nil {
			return bb.Payload{Error: 1}
		}
		for i, v := range values {
			p.Outputs[out[i].Name] = v
		}
		p.Sets++
		if p.WriteOutputs != nil {
			p.WriteOutputs(Clone(p.Outputs))
		}
		return bb.Payload{}
	case 5:
		if p.ReadInputs != nil {
			p.Inputs = p.ReadInputs()
		}
		values := make([]uint64, len(in))
		for i, c := range in {
			values[i] = p.Inputs[c.Name]
		}
		b, e := bb.PackValues(in, values)
		if e != nil {
			return bb.Payload{Error: 1}
		}
		p.Gets++
		return bb.Payload{Values: b}
	case 100, 101:
		result := bb.Payload{Params: a.Params}
		if a.Params.Class != 2 {
			result.Error = 1
			return result
		}
		if a.Params.Object != 0 {
			result.Error = 2
			return result
		}
		if a.Params.Handle != 1 && a.Params.Handle != 2 {
			result.Error = 3
			return result
		}
		field := &p.Mode
		max := uint32(3)
		if a.Params.Handle == 1 {
			field = &p.Board
			max = 2
		}
		if c.Procedure == 101 {
			if a.Params.Value > max {
				result.Error = 3
				return result
			}
			*field = a.Params.Value
		}
		result.Params.Value = *field
		return result
	case 1000:
		return bb.Payload{ByteCount: int32(len(a.Values))}
	case 1001:
		if a.ByteCount < 0 || a.ByteCount > bb.MaxVector {
			return bb.Payload{}
		}
		return bb.Payload{Fixed1: 1, Fixed2: 2, Values: make([]byte, a.ByteCount)}
	}
	return bb.Payload{Error: 1}
}
