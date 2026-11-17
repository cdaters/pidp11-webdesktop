// Local-only load driver. It is not included in the deployed webdesktop executable.
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"net/http"
	"pidp11.local/webdesktop/internal/panel"
	"sort"
	"sync/atomic"
	"time"
)

type message struct {
	Type     string      `json:"type"`
	ID       uint64      `json:"id"`
	Accepted bool        `json:"accepted"`
	State    panel.State `json:"state"`
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	const origin = "http://127.0.0.1:18770"
	dial := func() *websocket.Conn {
		c, _, e := websocket.Dial(ctx, "ws://127.0.0.1:18770/api/v1/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {origin}}})
		if e != nil {
			panic(e)
		}
		return c
	}
	a, b := dial(), dial()
	defer a.CloseNow()
	defer b.CloseNow()
	var bytes atomic.Int64
	var frames atomic.Int64
	read := func(c *websocket.Conn) message {
		_, data, e := c.Read(ctx)
		if e != nil {
			panic(e)
		}
		bytes.Add(int64(len(data)))
		frames.Add(1)
		var m message
		if e = json.Unmarshal(data, &m); e != nil {
			panic(e)
		}
		return m
	}
	go func() {
		for {
			_, data, e := b.Read(ctx)
			if e != nil {
				return
			}
			bytes.Add(int64(len(data)))
			frames.Add(1)
		}
	}()
	m := read(a)
	var id uint64
	request := func(kind, control string, value uint32) message {
		id++
		r := panel.Request{ID: id, Type: kind, Control: control, Value: value, Epoch: m.State.Epoch, Expected: m.State.ControlRevision}
		data, _ := json.Marshal(r)
		if e := a.Write(ctx, websocket.MessageText, data); e != nil {
			panic(e)
		}
		for {
			v := read(a)
			m = v
			if v.Type == "ack" && v.ID == id {
				if !v.Accepted {
					panic(string(data))
				}
				return v
			}
		}
	}
	request("acquire", "", 0)
	request("set", "halt", 0)
	request("pulse", "continue", 0)
	for m.State.Momentary != "" {
		m = read(a)
	}
	start := time.Now()
	deadline := start.Add(15 * time.Second)
	latencies := []float64{}
	ticks := time.NewTicker(50 * time.Millisecond)
	defer ticks.Stop()
	count := 0
	for time.Now().Before(deadline) {
		<-ticks.C
		before := time.Now()
		request("set", "sr", uint32(count))
		latencies = append(latencies, float64(time.Since(before).Microseconds())/1000)
		count++
		if count%20 == 0 {
			request("renew", "", 0)
		}
	}
	sort.Float64s(latencies)
	elapsed := time.Since(start).Seconds()
	json.NewEncoder(httpWriter{}).Encode(map[string]any{"duration_seconds": elapsed, "commands": count, "viewers": 2, "command_rate_hz": 20, "rtt_p50_ms": latencies[len(latencies)/2], "rtt_p95_ms": latencies[len(latencies)*95/100], "rtt_max_ms": latencies[len(latencies)-1], "received_bytes_per_second_total": float64(bytes.Load()) / elapsed, "received_frames": frames.Load()})
}

type httpWriter struct{}

func (httpWriter) Write(b []byte) (int, error) { return fmt.Print(string(b)) }
