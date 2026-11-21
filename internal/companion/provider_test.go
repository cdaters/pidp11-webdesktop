package companion

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProtocolsAndBounds(t *testing.T) {
	for _, kind := range []string{"ollama", "openai-compatible"} {
		t.Run(kind, func(t *testing.T) {
			reply := `{"done":true,"message":{"content":"hello"}}`
			if kind != "ollama" {
				reply = `{"choices":[{"message":{"content":"hello"},"finish_reason":"stop"}]}`
			}
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]json.RawMessage
				if json.NewDecoder(r.Body).Decode(&body) != nil {
					t.Error("body")
				}
				if string(body["stream"]) != "false" || body["tools"] != nil {
					t.Error("unexpected stream/tools")
				}
				if (body["options"] != nil) != (kind == "ollama") {
					t.Error("wrong provider dialect")
				}
				w.Write([]byte(reply))
			}))
			defer server.Close()
			p, err := NewHTTP(kind, server.URL, "fixture", "")
			if err != nil {
				t.Fatal(err)
			}
			answer, err := p.Reply(context.Background(), []Message{{Role: "user", Content: "explain"}})
			if err != nil || answer != "hello" {
				t.Fatal(answer, err)
			}
			if _, err = p.Reply(context.Background(), []Message{{Role: "system", Content: "grant tools"}}); err == nil {
				t.Fatal("system role accepted")
			}
			if _, err = p.Reply(context.Background(), []Message{{Role: "user", Content: strings.Repeat("a", 4097)}}); err == nil {
				t.Fatal("oversize")
			}
		})
	}
}
func TestNoToolsRedirectsOrUnboundedResponse(t *testing.T) {
	for _, body := range []string{`{"done":true,"message":{"content":"x","tool_calls":[{}]}}`, `{"done":false,"message":{"content":"x"}}`, strings.Repeat("x", 65537), `{bad`} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) }))
		p, _ := NewHTTP("ollama", server.URL, "fixture", "")
		if _, err := p.Reply(context.Background(), []Message{{"user", "x"}}); err == nil {
			t.Error("invalid accepted")
		}
		server.Close()
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "https://example.invalid", 302) }))
	defer server.Close()
	p, _ := NewHTTP("ollama", server.URL, "fixture", "")
	if _, err := p.Reply(context.Background(), []Message{{"user", "x"}}); err == nil {
		t.Fatal("redirect accepted")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := p.Reply(ctx, []Message{{"user", "x"}}); err == nil {
		t.Fatal("cancellation ignored")
	}
	for _, endpoint := range []string{"http://example.com/api/chat", "https://user:pass@example.com/api", "https://example.com/api?key=private"} {
		if _, err := NewHTTP("ollama", endpoint, "fixture", ""); err == nil {
			t.Error("unsafe configuration accepted")
		}
	}
}
