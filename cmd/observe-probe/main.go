// Bounded, fixed-loopback observer soak driver. No emulator/control connection.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"github.com/coder/websocket"
	"net/http"
	"os"
	"pidp11.local/webdesktop/internal/observe"
	"strings"
	"sync"
	"time"
)

func main() {
	seconds := flag.Int("seconds", 300, "bounded soak duration")
	flag.Parse()
	if *seconds < 1 || *seconds > 600 {
		panic("duration")
	}
	token, e := os.ReadFile("/tmp/observe.token")
	if e != nil {
		panic(e)
	}
	r, _ := http.NewRequest("POST", "http://127.0.0.1:8083/api/v1/login", strings.NewReader(`{"token":"`+strings.TrimSpace(string(token))+`"}`))
	r.Header.Set("Origin", "http://127.0.0.1:8083")
	resp, e := http.DefaultClient.Do(r)
	if e != nil {
		panic(e)
	}
	resp.Body.Close()
	if resp.StatusCode != 200 {
		panic("login rejected")
	}
	cookie := resp.Cookies()[0]
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*seconds)*time.Second)
	defer cancel()
	var wg sync.WaitGroup
	counts := make([]int, 8)
	ages := make([]int64, 8)
	maxAge := make([]int64, 8)
	for i := range counts {
		c, _, e := websocket.Dial(ctx, "ws://127.0.0.1:8083/api/v1/observe/ws", &websocket.DialOptions{HTTPHeader: http.Header{"Origin": {"http://127.0.0.1:8083"}, "Cookie": {cookie.String()}}})
		if e != nil {
			panic(e)
		}
		wg.Add(1)
		go func() {
			defer wg.Done()
			defer c.CloseNow()
			for {
				_, b, e := c.Read(ctx)
				if e != nil {
					return
				}
				var s observe.Snapshot
				if json.Unmarshal(b, &s) != nil {
					panic("invalid snapshot")
				}
				if s.Fresh {
					counts[i]++
					age := time.Now().UnixMilli() - s.Frame.Captured
					ages[i] += age
					if age > maxAge[i] {
						maxAge[i] = age
					}
				}
			}
		}()
	}
	wg.Wait()
	for _, n := range counts {
		if n < *seconds*8 {
			panic("insufficient observer frames")
		}
	}
	b, _ := json.Marshal(map[string]any{"seconds": *seconds, "observers": 8, "frames": counts, "total_capture_to_receive_ms": ages, "max_capture_to_receive_ms": maxAge})
	fmt.Println(string(b))
}
