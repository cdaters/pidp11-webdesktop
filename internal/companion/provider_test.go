package companion

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
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
			p, err := NewHTTP(kind, server.URL, "fixture", "", nil)
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
	for _, body := range []string{`{"done":true,"message":{"content":"x","tool_calls":[{}]}}`, `{"done":false,"message":{"content":"x"}}`, `{"done":true,"done_reason":"length","message":{"content":"truncated"}}`, strings.Repeat("x", 65537), `{bad`} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(body)) }))
		p, _ := NewHTTP("ollama", server.URL, "fixture", "", nil)
		if _, err := p.Reply(context.Background(), []Message{{"user", "x"}}); err == nil {
			t.Error("invalid accepted")
		}
		server.Close()
	}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { http.Redirect(w, r, "https://example.invalid", 302) }))
	defer server.Close()
	p, _ := NewHTTP("ollama", server.URL, "fixture", "", nil)
	if _, err := p.Reply(context.Background(), []Message{{"user", "x"}}); err == nil {
		t.Fatal("redirect accepted")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := p.Reply(ctx, []Message{{"user", "x"}}); err == nil {
		t.Fatal("cancellation ignored")
	}
	for _, endpoint := range []string{"http://example.com/api/chat", "https://user:pass@example.com/api", "https://example.com/api?key=private"} {
		if _, err := NewHTTP("ollama", endpoint, "fixture", "", nil); err == nil {
			t.Error("unsafe configuration accepted")
		}
	}
}

func TestExplicitOllamaThinkingIsCopiedAndOptional(t *testing.T) {
	for _, configured := range []bool{false, true} {
		t.Run(map[bool]string{false: "default", true: "disabled"}[configured], func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				var body map[string]json.RawMessage
				if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
					t.Fatal(err)
				}
				if configured && string(body["think"]) != "false" {
					t.Error("explicit false lost")
				}
				if !configured && body["think"] != nil {
					t.Error("changed existing default")
				}
				w.Write([]byte(`{"done":true,"message":{"content":"answer"}}`))
			}))
			defer server.Close()
			var value *bool
			if configured {
				v := false
				value = &v
			}
			provider, err := NewHTTP("ollama", server.URL, "model", "", value)
			if err != nil {
				t.Fatal(err)
			}
			if value != nil {
				*value = true
			} // Caller mutation must not change configured requests.
			if _, err = provider.Reply(context.Background(), []Message{{Role: "user", Content: "question"}}); err != nil {
				t.Fatal(err)
			}
		})
	}
	value := false
	if _, err := NewHTTP("openai-compatible", "http://127.0.0.1:1234/v1/chat/completions", "model", "", &value); err == nil {
		t.Fatal("wrong dialect accepted")
	}
}

func TestProviderFailureMessagesPreserveCauseWithoutPayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(30 * time.Millisecond)
		w.Write([]byte(`{"done":true,"message":{"content":"late"}}`))
	}))
	provider, err := NewHTTP("ollama", server.URL, "model", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	messages := []Message{{Role: "user", Content: "PRIVATE SYNTHETIC PAYLOAD"}}
	ctx, cancel := context.WithTimeout(context.Background(), time.Millisecond)
	defer cancel()
	if _, err = provider.Reply(ctx, messages); err == nil || !strings.Contains(err.Error(), "timed out") {
		t.Fatal(err)
	}
	ctx, cancelled := context.WithCancel(context.Background())
	cancelled()
	if _, err = provider.Reply(ctx, messages); err == nil || !strings.Contains(err.Error(), "cancelled") {
		t.Fatal(err)
	}
	server.Close()
	if _, err = provider.Reply(context.Background(), messages); err == nil || !strings.Contains(err.Error(), "unavailable") || strings.Contains(err.Error(), "PRIVATE") {
		t.Fatal(err)
	}
}
