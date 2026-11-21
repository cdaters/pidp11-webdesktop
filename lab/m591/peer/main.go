// peer is a bounded fake guest and deterministic provider for the offline ARM64
// service rehearsal. It is never packaged or used as genuine guest evidence.
package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	if os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		log.Fatal("isolated lab acknowledgement required")
	}
	if len(os.Args) == 2 && os.Args[1] == "relay" {
		conn, err := net.DialTimeout("tcp", "127.0.0.1:8447", time.Second)
		if err != nil {
			log.Fatal(err)
		}
		defer conn.Close()
		go func() { io.Copy(conn, os.Stdin); conn.(*net.TCPConn).CloseWrite() }()
		io.Copy(os.Stdout, conn)
		return
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	listener, err := net.Listen("tcp", "127.0.0.1:40100")
	if err != nil {
		log.Fatal(err)
	}
	defer listener.Close()
	slots := make(chan struct{}, 4)
	go func() {
		for {
			conn, err := listener.Accept()
			if err != nil {
				return
			}
			select {
			case slots <- struct{}{}:
				go func() { defer func() { <-slots }(); serveGuest(conn) }()
			default:
				conn.Close()
			}
		}
	}()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/tags", func(w http.ResponseWriter, r *http.Request) {
		io.WriteString(w, `{"models":[{"name":"historical-fixture"}]}`)
	})
	mux.HandleFunc("POST /api/chat", func(w http.ResponseWriter, r *http.Request) {
		var request struct {
			Model string `json:"model"`
		}
		if json.NewDecoder(http.MaxBytesReader(w, r.Body, 24576)).Decode(&request) != nil || request.Model != "historical-fixture" {
			http.Error(w, "invalid fixture request", 400)
			return
		}
		io.WriteString(w, `{"done":true,"message":{"content":"DETERMINISTIC HTTP FIXTURE: no model inference. UNIX V7 ls lists directories."}}`)
	})
	server := &http.Server{Addr: "127.0.0.1:19191", Handler: mux, ReadTimeout: 3 * time.Second, WriteTimeout: 3 * time.Second, IdleTimeout: 3 * time.Second, MaxHeaderBytes: 4096}
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Print(err)
			stop()
		}
	}()
	<-ctx.Done()
	server.Close()
}
func serveGuest(conn net.Conn) {
	defer conn.Close()
	conn.SetDeadline(time.Now().Add(15 * time.Minute))
	io.WriteString(conn, "FAKE GUEST — deterministic lab peer\r\n$ ")
	reader := bufio.NewReader(io.LimitReader(conn, 65536))
	var line strings.Builder
	for {
		b, err := reader.ReadByte()
		if err != nil {
			return
		}
		if b == '\r' {
			command := line.String()
			line.Reset()
			if command == "EOF" {
				return
			}
			fmt.Fprintf(conn, "\r\nFAKE GUEST received: %s\r\n$ ", command)
		} else {
			if line.Len() >= 4096 {
				return
			}
			line.WriteByte(b)
		}
	}
}
