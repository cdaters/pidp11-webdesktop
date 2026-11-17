package blinkenbone

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"os"
	"testing"
)

func vectors(t *testing.T) map[string][]byte {
	t.Helper()
	b, e := os.ReadFile("testdata/original.json")
	if e != nil {
		t.Fatal(e)
	}
	var raw map[string]string
	if e = json.Unmarshal(b, &raw); e != nil {
		t.Fatal(e)
	}
	out := map[string][]byte{}
	for k, v := range raw {
		out[k], e = hex.DecodeString(v)
		if e != nil {
			t.Fatal(e)
		}
	}
	return out
}
func TestOriginalCFixtures(t *testing.T) {
	v := vectors(t)
	cases := []struct {
		name  string
		proc  uint32
		reply bool
	}{
		{"info", 1, true}, {"panel", 2, true}, {"control", 3, true}, {"values", 5, true}, {"param_get", 100, false}, {"param_set", 101, false}, {"param_result", 100, true}, {"set_error", 4, true}, {"panel_error", 2, true}, {"test_data", 1000, false}, {"test_data", 1001, true}, {"test_count", 1001, false}, {"test_count", 1000, true}, {"control_args", 3, false}, {"set_args", 4, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			p, e := DecodePayload(c.proc, c.reply, v[c.name])
			if e != nil {
				t.Fatal(e)
			}
			got, e := EncodePayload(c.proc, c.reply, p)
			if e != nil || !bytes.Equal(got, v[c.name]) {
				t.Fatalf("C fixture mismatch: %x %v", got, e)
			}
		})
	}
	p, e := DecodePayload(5, true, v["values_java_source_derived"])
	if e != nil || !bytes.Equal(p.Values, []byte{0, 127, 128, 255, 0x34, 0x12}) {
		t.Fatal(p, e)
	}
	p, e = DecodePayload(3, true, v["control"])
	if e != nil || p.Control != (Control{"SR", 1, 1, 8, 22, 3}) {
		t.Fatal(p, e)
	}
	c, e := DecodeCall(v["rpc_getinfo_call"])
	if e != nil || c.XID != 0x12345678 || c.Procedure != 1 {
		t.Fatal(c, e)
	}
	got, e := EncodeCall(c)
	if e != nil || !bytes.Equal(got, v["rpc_getinfo_call"]) {
		t.Fatal(e)
	}
}
func TestMalformed(t *testing.T) {
	v := vectors(t)
	for _, tc := range []struct {
		name string
		p    uint32
		r    bool
	}{{"values", 5, true}, {"panel", 2, true}, {"control", 3, true}, {"set_args", 4, false}} {
		b := v[tc.name]
		for n := 0; n < len(b); n++ {
			if _, e := DecodePayload(tc.p, tc.r, b[:n]); e == nil {
				t.Fatalf("accepted truncation %s:%d", tc.name, n)
			}
		}
		if _, e := DecodePayload(tc.p, tc.r, append(append([]byte{}, b...), 0)); e == nil {
			t.Fatal("accepted trailing data")
		}
	}
	for _, b := range [][]byte{{0, 0, 0, 0, 255, 255, 255, 255}, {0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0}, {0, 0, 0, 0, 0, 0, 0, 1, 255, 255, 255, 127}} {
		if _, e := DecodePayload(5, true, b); e == nil {
			t.Fatal("accepted invalid vector")
		}
	}
	for _, off := range []int{4, 8, 12, 16, 20, 24, 28, 32, 36} {
		b := append([]byte{}, v["rpc_getinfo_call"]...)
		b[off+3] = 255
		if _, e := DecodeCall(b); e == nil {
			t.Fatalf("accepted invalid call header at %d", off)
		}
	}
	for n := 0; n < 40; n++ {
		if _, e := DecodeCall(v["rpc_getinfo_call"][:n]); e == nil {
			t.Fatal("accepted call truncation")
		}
	}
	if _, e := DecodePayload(2, true, bytes.Repeat([]byte{255}, 100)); e == nil {
		t.Fatal("oversized string")
	}
}
func TestSchemaAndPacking(t *testing.T) {
	cs := []Control{{"SR", 1, 1, 8, 22, 3}, {"HALT", 1, 1, 8, 1, 1}}
	b, e := PackValues(cs, []uint64{0x123456, 1})
	if e != nil || !bytes.Equal(b, []byte{0x56, 0x34, 0x12, 1}) {
		t.Fatal(b, e)
	}
	values, e := UnpackValues(cs, b)
	if e != nil || values[0] != 0x123456 {
		t.Fatal(values, e)
	}
	for _, bad := range [][]Control{{cs[0], cs[0]}, {{"SR", 1, 1, 8, 65, 9}}, {{"SR", 1, 1, 8, 22, 2}}} {
		if ValidateSchema(bad) == nil {
			t.Fatal("accepted bad schema")
		}
	}
	if _, e = UnpackValues(cs, []byte{0xff, 0xff, 0xff, 1}); e == nil {
		t.Fatal("accepted high bits")
	}
}
func TestRecordsAndReplies(t *testing.T) {
	empty, err := ReadRecord(bytes.NewReader([]byte{128, 0, 0, 0}))
	if err != nil || len(empty) != 0 {
		t.Fatal("empty final fragment", err)
	}
	payload := Payload{Info: "hello"}
	reply, e := EncodeReply(7, 1, payload)
	if e != nil {
		t.Fatal(e)
	}
	p, e := DecodeReply(7, 1, reply)
	if e != nil || p.Info != "hello" {
		t.Fatal(p, e)
	}
	if _, e = DecodeReply(8, 1, reply); e == nil {
		t.Fatal("wrong xid")
	}
	record, _ := Record(reply)
	got, e := ReadRecord(bytes.NewReader(record))
	if e != nil || !bytes.Equal(got, reply) {
		t.Fatal(e)
	}
	fragmented := append([]byte{0, 0, 0, 4}, reply[:4]...)
	last, _ := Record(reply[4:])
	fragmented = append(fragmented, last...)
	got, e = ReadRecord(bytes.NewReader(fragmented))
	if e != nil || !bytes.Equal(got, reply) {
		t.Fatal(e)
	}
	for _, b := range [][]byte{{255, 255, 255, 255}, record[:len(record)-1], bytes.Repeat([]byte{0, 0, 0, 1, 0}, 33)} {
		if _, e = ReadRecord(bytes.NewReader(b)); e == nil {
			t.Fatal("accepted malformed record")
		}
	}
}
func FuzzDecode(f *testing.F) {
	f.Add([]byte{0, 0, 0, 0, 0, 0, 0, 0})
	f.Fuzz(func(t *testing.T, b []byte) {
		for _, p := range []uint32{0, 1, 2, 3, 4, 5, 100, 101, 1000, 1001} {
			DecodePayload(p, true, b)
			DecodePayload(p, false, b)
		}
		DecodeCall(b)
		DecodeReply(7, 1, b)
		ReadRecord(bytes.NewReader(b))
	})
}
func BenchmarkValues(b *testing.B) {
	raw, _ := EncodePayload(5, true, Payload{Values: make([]byte, 64)})
	b.ReportAllocs()
	for b.Loop() {
		DecodePayload(5, true, raw)
	}
}
