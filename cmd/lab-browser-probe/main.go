// Browser-protocol driver for the network-none laboratory. Fixed loopback only.
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"github.com/coder/websocket"
	"net/http"
	"os"
	"pidp11.local/webdesktop/internal/panel"
	"sync"
	"time"
)

type event struct {
	Type, Session string
	ID            uint64
	Accepted      bool
	Message       string
	State         panel.State
}

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	c, _, e := websocket.Dial(ctx, "ws://127.0.0.1:8081/api/v1/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {"http://127.0.0.1:8081"}}})
	if e != nil {
		panic(e)
	}
	defer c.CloseNow()
	c.SetReadLimit(16384)
	var mu sync.Mutex
	var state panel.State
	acks := make(chan event, 16)
	go func() {
		defer cancel()
		for {
			_, b, e := c.Read(ctx)
			if e != nil {
				return
			}
			var v event
			if json.Unmarshal(b, &v) != nil {
				return
			}
			mu.Lock()
			state = v.State
			mu.Unlock()
			if v.Type == "hello" || v.Type == "ack" {
				select {
				case acks <- v:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	enc := json.NewEncoder(os.Stdout)
	select {
	case hello := <-acks:
		enc.Encode(hello)
	case <-time.After(3 * time.Second):
		panic("no hello")
	}
	scanner := bufio.NewScanner(os.Stdin)
	id := uint64(0)
	for scanner.Scan() {
		var r panel.Request
		if e = json.Unmarshal(scanner.Bytes(), &r); e != nil {
			panic(e)
		}
		mu.Lock()
		snapshot := state
		mu.Unlock()
		if r.Type == "status" {
			enc.Encode(event{Type: "status", State: snapshot})
			continue
		}
		id++
		r.ID = id
		r.Epoch = snapshot.Epoch
		r.Expected = snapshot.ControlRevision
		b, _ := json.Marshal(r)
		wc, stop := context.WithTimeout(ctx, 2*time.Second)
		e = c.Write(wc, websocket.MessageText, b)
		stop()
		if e != nil {
			panic(e)
		}
		select {
		case ack := <-acks:
			if ack.ID != id {
				panic("unexpected ack")
			}
			enc.Encode(ack)
		case <-time.After(3 * time.Second):
			fmt.Fprintln(os.Stderr, "ack timeout")
			return
		case <-ctx.Done():
			return
		}
	}
}
