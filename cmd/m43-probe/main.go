// Fixed-loopback TLS/WSS soak; receives only, cannot control the emulator.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
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

type sample struct {
	Frames, Fresh, Bytes, Reconnects, Changes int
	AgeTotal, AgeMax                          int64
	Histogram                                 [11]int
	Errors                                    int
}

func main() {
	seconds := flag.Int("seconds", 1800, "bounded workload duration")
	flag.Parse()
	if *seconds < 30 || *seconds > 3600 {
		panic("duration bound")
	}
	cert, e := os.ReadFile("/tmp/observe-cert.pem")
	if e != nil {
		panic(e)
	}
	roots := x509.NewCertPool()
	if !roots.AppendCertsFromPEM(cert) {
		panic("CA")
	}
	client := &http.Client{Transport: &http.Transport{TLSClientConfig: &tls.Config{RootCAs: roots, MinVersion: tls.VersionTLS13}}, Timeout: 5 * time.Second}
	token, e := os.ReadFile("/tmp/observe.token")
	if e != nil {
		panic(e)
	}
	var mu sync.Mutex
	cookie := ""
	login := func() {
		r, _ := http.NewRequest("POST", "https://127.0.0.1:8443/api/v1/login", strings.NewReader(`{"token":"`+strings.TrimSpace(string(token))+`"}`))
		r.Header.Set("Origin", "https://127.0.0.1:8443")
		resp, e := client.Do(r)
		if e != nil {
			panic(e)
		}
		resp.Body.Close()
		if resp.StatusCode != 200 {
			panic("login")
		}
		c := resp.Cookies()[0]
		if !c.Secure || !c.HttpOnly {
			panic("cookie")
		}
		mu.Lock()
		cookie = c.Name + "=" + c.Value
		mu.Unlock()
	}
	login()
	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*seconds)*time.Second)
	defer cancel()
	go func() {
		t := time.NewTicker(14 * time.Minute)
		defer t.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-t.C:
				login()
			}
		}
	}()
	var wg sync.WaitGroup
	stats := make([]sample, 8)
	for i := range stats {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s := &stats[i]
			var lastData uint64
			for ctx.Err() == nil {
				mu.Lock()
				header := cookie
				mu.Unlock()
				c, _, e := websocket.Dial(ctx, "wss://127.0.0.1:8443/api/v1/observe/ws", &websocket.DialOptions{HTTPClient: client, HTTPHeader: http.Header{"Origin": {"https://127.0.0.1:8443"}, "Cookie": {header}}})
				if e != nil {
					s.Errors++
					select {
					case <-ctx.Done():
						return
					case <-time.After(200 * time.Millisecond):
					}
					continue
				}
				s.Reconnects++
				readCtx := ctx
				stop := func() {}
				if i == 6 {
					readCtx, stop = context.WithTimeout(ctx, 30*time.Second)
				}
				for {
					if i == 7 {
						select {
						case <-readCtx.Done():
						case <-time.After(150 * time.Millisecond):
						}
					}
					_, b, e := c.Read(readCtx)
					if e != nil {
						break
					}
					s.Frames++
					s.Bytes += len(b)
					var f observe.Snapshot
					if json.Unmarshal(b, &f) != nil {
						panic("snapshot")
					}
					if f.Frame == nil {
						continue
					}
					age := time.Now().UnixMilli() - f.Frame.Captured
					if age < 0 {
						panic("clock")
					}
					s.AgeTotal += age
					if age > s.AgeMax {
						s.AgeMax = age
					}
					bucket := int(age / 10)
					if bucket > 10 {
						bucket = 10
					}
					s.Histogram[bucket]++
					if f.Fresh && age <= 350 {
						s.Fresh++
					}
					if f.Frame.Outputs["DATA"] != lastData {
						s.Changes++
						lastData = f.Frame.Outputs["DATA"]
					}
				}
				stop()
				c.CloseNow()
			}
		}()
	}
	wg.Wait()
	for i, s := range stats {
		if i < 7 && s.Fresh < *seconds*8 {
			panic(fmt.Sprintf("observer %d insufficient fresh frames: %d", i, s.Fresh))
		}
		if s.Changes < 2 {
			panic("no lamp activity")
		}
	}
	b, _ := json.Marshal(map[string]any{"seconds": *seconds, "transport": "TLS1.3 WSS, explicitly trusted ephemeral CA", "observers": stats, "churn_observer": 6, "slow_observer": 7, "session_refresh_seconds": 840})
	fmt.Println(string(b))
}
