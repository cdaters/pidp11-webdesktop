// transportbench is a loopback-only synthetic load generator for a separately
// installed service inside the disposable Linux lab. It never runs guest commands.
package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/coder/websocket"
	"pidp11.local/webdesktop/internal/terminalbridge"
	"pidp11.local/webdesktop/internal/terminalservice"
)

type viewer struct {
	ws     *websocket.Conn
	mu     sync.Mutex
	epoch  atomic.Uint64
	owner  atomic.Bool
	output chan []byte
	done   chan struct{}
}

func (v *viewer) send(m any) error {
	v.mu.Lock()
	defer v.mu.Unlock()
	b, _ := json.Marshal(m)
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	return v.ws.Write(ctx, websocket.MessageText, b)
}
func (v *viewer) close() { v.ws.CloseNow(); <-v.done }
func connect(client *http.Client, origin, id, generation string) *viewer {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	ws, _, err := websocket.Dial(ctx, strings.Replace(origin, "https:", "wss:", 1)+"/api/v1/terminals/"+id+"/generation/"+generation+"/ws", &websocket.DialOptions{HTTPClient: client, HTTPHeader: http.Header{"Origin": []string{origin}}})
	must(err)
	v := &viewer{ws: ws, output: make(chan []byte, 128), done: make(chan struct{})}
	go func() {
		defer close(v.done)
		for {
			_, data, err := ws.Read(context.Background())
			if err != nil {
				return
			}
			var f terminalbridge.Frame
			must(json.Unmarshal(data, &f))
			if f.Type == "state" {
				v.epoch.Store(f.Epoch)
				v.owner.Store(f.Owner)
			}
			if f.Type == "output" {
				must(v.send(map[string]any{"type": "ack", "bytes": len(f.Data)}))
				select {
				case v.output <- f.Data:
				default:
				}
			}
		}
	}()
	return v
}
func must(err error) {
	if err != nil {
		panic(err)
	}
}
func local(client *http.Client, op string, a *terminalservice.Approval) terminalservice.Status {
	method := "GET"
	var body io.Reader
	if a != nil {
		method = "POST"
		b, _ := json.Marshal(a)
		body = bytes.NewReader(b)
	}
	req, err := http.NewRequest(method, "http://local/"+op, body)
	must(err)
	r, err := client.Do(req)
	must(err)
	defer r.Body.Close()
	if r.StatusCode != 200 {
		b, _ := io.ReadAll(r.Body)
		panic(string(b))
	}
	var s terminalservice.Status
	must(json.NewDecoder(r.Body).Decode(&s))
	return s
}
func approve(client *http.Client, id, op string) {
	s := local(client, "status", nil)
	for _, l := range s.Lines {
		if l.ID == id {
			local(client, op, &terminalservice.Approval{Instance: s.Instance, ID: id, Revision: l.Revision, Confirmed: true})
			return
		}
	}
	panic("unknown line")
}
func counters(pid int) (float64, int) {
	data, err := os.ReadFile(fmt.Sprintf("/proc/%d/stat", pid))
	must(err)
	fields := strings.Fields(string(data)[strings.LastIndex(string(data), ")")+2:])
	utime, _ := strconv.ParseFloat(fields[11], 64)
	stime, _ := strconv.ParseFloat(fields[12], 64)
	status, err := os.ReadFile(fmt.Sprintf("/proc/%d/status", pid))
	must(err)
	rss := 0
	for _, line := range strings.Split(string(status), "\n") {
		if strings.HasPrefix(line, "VmRSS:") {
			rss, _ = strconv.Atoi(strings.Fields(line)[1])
		}
	}
	return (utime + stime) / 100, rss // Linux USER_HZ=100 on this explicitly Linux harness.
}
func main() {
	configPath := flag.String("config", "/etc/pidp11-webdesktop/config.json", "private lab config")
	pid := flag.Int("pid", 0, "service process to measure")
	duration := flag.Duration("duration", 6*time.Second, "duration per synthetic scenario")
	flag.Parse()
	if os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		panic("lab opt-in required")
	}
	if *pid < 1 {
		panic("service PID required")
	}
	c, _, _, err := terminalservice.Load(*configPath)
	must(err)
	token, err := terminalservice.ReadPrivate(c.Writer)
	must(err)
	cert, err := terminalservice.ReadPrivate(c.Certificate)
	must(err)
	pool := x509.NewCertPool()
	if !pool.AppendCertsFromPEM(cert) {
		panic("certificate")
	}
	jar, _ := cookiejar.New(nil)
	transport := &http.Transport{TLSClientConfig: &tls.Config{MinVersion: tls.VersionTLS13, RootCAs: pool}}
	defer transport.CloseIdleConnections()
	client := &http.Client{Transport: transport, Jar: jar, Timeout: 3 * time.Second}
	login, _ := json.Marshal(map[string]string{"token": strings.TrimSpace(string(token))})
	req, _ := http.NewRequest("POST", c.Origin+"/api/v1/login", bytes.NewReader(login))
	req.Header.Set("Origin", c.Origin)
	r, err := client.Do(req)
	must(err)
	r.Body.Close()
	if r.StatusCode != 200 {
		panic("login")
	}
	adminTransport := &http.Transport{DialContext: func(ctx context.Context, _, _ string) (net.Conn, error) {
		return (&net.Dialer{}).DialContext(ctx, "unix", c.Control)
	}}
	defer adminTransport.CloseIdleConnections()
	admin := &http.Client{Transport: adminTransport, Timeout: 3 * time.Second}
	var sustained atomic.Bool
	for _, config := range c.Endpoints {
		listener, err := net.Listen("tcp", config.Address)
		must(err)
		defer listener.Close()
		go func() {
			for {
				conn, err := listener.Accept()
				if err != nil {
					return
				}
				go func() {
					defer conn.Close()
					done := make(chan struct{})
					defer close(done)
					go func() {
						tick := time.NewTicker(20 * time.Millisecond)
						defer tick.Stop()
						payload := bytes.Repeat([]byte("O"), 1024)
						for {
							select {
							case <-done:
								return
							case <-tick.C:
								if sustained.Load() {
									conn.SetWriteDeadline(time.Now().Add(time.Second))
									if _, err := conn.Write(payload); err != nil {
										return
									}
								}
							}
						}
					}()
					buf := make([]byte, 256)
					for {
						n, err := conn.Read(buf)
						if err != nil {
							return
						}
						conn.SetWriteDeadline(time.Now().Add(time.Second))
						if _, err = conn.Write(buf[:n]); err != nil {
							return
						}
					}
				}()
			}
		}()
	}
	type scenario struct {
		name                            string
		lines, viewers                  int
		input, output, renew, reconnect bool
	}
	scenarios := []scenario{{name: "idle-detached"}, {name: "passive-observer", lines: 1, viewers: 1}, {name: "active-terminal", lines: 1, viewers: 1, input: true}, {name: "two-lines", lines: 2, viewers: 1, input: true}, {name: "eight-observers", lines: 1, viewers: 8, output: true}, {name: "lease-renewals", lines: 1, viewers: 1, renew: true}, {name: "command-bursts", lines: 1, viewers: 1, input: true}, {name: "moderate-output", lines: 1, viewers: 1, output: true}, {name: "reconnect", lines: 1, viewers: 1, reconnect: true}}
	results := []map[string]any{}
	for _, sc := range scenarios {
		for _, l := range local(admin, "status", nil).Lines {
			approve(admin, l.ID, "detach")
		}
		for i := 0; i < sc.lines; i++ {
			approve(admin, c.Endpoints[i].ID, "attach")
		}
		response, err := client.Get(c.Origin + "/api/v1/terminals")
		must(err)
		var listings []terminalbridge.Listing
		must(json.NewDecoder(response.Body).Decode(&listings))
		response.Body.Close()
		generations := map[string]string{}
		for _, l := range listings {
			generations[l.ID] = l.Generation
		}
		var viewers []*viewer
		for i := 0; i < sc.lines; i++ {
			for j := 0; j < sc.viewers; j++ {
				viewers = append(viewers, connect(client, c.Origin, c.Endpoints[i].ID, generations[c.Endpoints[i].ID]))
			}
		}
		if sc.input || sc.renew {
			for _, v := range viewers {
				must(v.send(map[string]any{"type": "acquire"}))
				deadline := time.Now().Add(time.Second)
				for !v.owner.Load() {
					if time.Now().After(deadline) {
						panic("lease not granted")
					}
					time.Sleep(time.Millisecond)
				}
			}
		}
		before, rss := counters(*pid)
		peak := rss
		start := time.Now()
		latencies := []float64{}
		sequence := uint64(0)
		operations := 0
		lastRenew, lastReconnect := start, start
		sustained.Store(sc.output)
		for time.Since(start) < *duration {
			if sc.input {
				sequence++
				for _, v := range viewers {
					data := []byte("x")
					if sc.name == "command-bursts" {
						data = []byte("echo SYNTHETIC_BURST\r")
					}
					begin := time.Now()
					must(v.send(map[string]any{"type": "input", "epoch": v.epoch.Load(), "seq": sequence, "data": data}))
					received := []byte{}
					for len(received) < len(data) {
						select {
						case p := <-v.output:
							received = append(received, p...)
						case <-time.After(time.Second):
							panic("echo timeout")
						}
					}
					if !bytes.Equal(received, data) {
						panic("unordered echo")
					}
					latencies = append(latencies, float64(time.Since(begin).Microseconds())/1000)
					operations++
				}
			}
			if time.Since(lastRenew) >= 2*time.Second {
				for _, v := range viewers {
					if v.owner.Load() {
						must(v.send(map[string]any{"type": "renew", "epoch": v.epoch.Load()}))
					}
				}
				lastRenew = time.Now()
			}
			if sc.reconnect && time.Since(lastReconnect) >= time.Second {
				viewers[0].close()
				viewers[0] = connect(client, c.Origin, c.Endpoints[0].ID, generations[c.Endpoints[0].ID])
				operations++
				lastReconnect = time.Now()
			}
			_, rss = counters(*pid)
			peak = max(peak, rss)
			time.Sleep(50 * time.Millisecond)
		}
		sustained.Store(false)
		elapsed := time.Since(start).Seconds()
		after, rss := counters(*pid)
		for _, v := range viewers {
			v.close()
		}
		p95 := 0.0
		if len(latencies) > 0 {
			sort.Float64s(latencies)
			p95 = latencies[(len(latencies)-1)*95/100]
		}
		results = append(results, map[string]any{"scenario": sc.name, "seconds": elapsed, "cpu_percent_one_core": 100 * (after - before) / elapsed, "rss_kib": rss, "sampled_peak_rss_kib": peak, "echo_p95_ms": p95, "echo_samples": len(latencies), "operations": operations})
		fmt.Fprintln(os.Stderr, sc.name, "complete")
	}
	for _, l := range local(admin, "status", nil).Lines {
		approve(admin, l.ID, "detach")
	}
	json.NewEncoder(os.Stdout).Encode(map[string]any{"source": "Mac-hosted Linux ARM64; synthetic loopback TLS/WebSocket peers; not Pi or historical guest", "duration_per_scenario": duration.String(), "results": results})
}
