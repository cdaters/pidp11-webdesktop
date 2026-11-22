// Package modelhost narrows access to an existing inference runner. It exposes
// chat, approved model names and curated reference search, never runner management.
package modelhost

import (
	"crypto/subtle"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"pidp11.local/webdesktop/internal/companion"
)

// New returns a token-authenticated OpenAI-compatible chat-only handler. The
// caller owns TLS and listener lifetime. One request can reach the provider at a
// time; no request is queued or retried. Token must be independently generated.
func New(token, model string, provider companion.Provider) http.Handler {
	if len(token) < 32 || len(token) > 128 || strings.TrimSpace(token) != token || model == "" || provider == nil {
		panic("invalid model gateway configuration")
	}
	slot := make(chan struct{}, 1)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		if r.Header.Get("Origin") != "" {
			http.Error(w, "Browser access refused", 403)
			return
		}
		if subtle.ConstantTimeCompare([]byte(r.Header.Get("Authorization")), []byte("Bearer "+token)) != 1 {
			http.Error(w, "Authentication required", 401)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		switch {
		case r.Method == "GET" && r.URL.Path == "/v1/models":
			json.NewEncoder(w).Encode(map[string]any{"data": []any{map[string]string{"id": model, "object": "model"}}})
			return
		case r.Method == "GET" && r.URL.Path == "/v1/references":
			json.NewEncoder(w).Encode(companion.Retrieve(r.URL.Query().Get("q"), r.URL.Query().Get("system")))
			return
		case r.Method == "POST" && r.URL.Path == "/v1/chat/completions":
		default:
			http.Error(w, "Unsupported route", 404)
			return
		}
		if r.URL.RawQuery != "" {
			http.Error(w, "Query refused", 400)
			return
		}
		var request struct {
			Model     string              `json:"model"`
			Messages  []companion.Message `json:"messages"`
			Stream    bool                `json:"stream"`
			MaxTokens int                 `json:"max_completion_tokens,omitempty"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 24576))
		decoder.DisallowUnknownFields()
		var extra any
		if decoder.Decode(&request) != nil || decoder.Decode(&extra) != io.EOF || request.Model != model || request.Stream || request.MaxTokens < 0 || request.MaxTokens > 512 || len(request.Messages) == 0 || len(request.Messages) > 20 {
			http.Error(w, "Unsupported bounded chat request", 400)
			return
		}
		total := 0
		for i, m := range request.Messages {
			total += len(m.Content)
			if len(m.Content) > 4096 || (m.Role != "user" && m.Role != "assistant" && m.Role != "system") {
				http.Error(w, "Invalid message", 400)
				return
			}
			// Hacker Replicant uses a system message. At this chat-only boundary it is
			// inert text; neither upstream prompts nor replies can invoke tools here.
			if m.Role == "system" {
				request.Messages[i].Role = "user"
			}
		}
		if total > 16384 {
			http.Error(w, "Context byte limit", 400)
			return
		}
		select {
		case slot <- struct{}{}:
			defer func() { <-slot }()
		default:
			http.Error(w, "Busy; no request queued", 429)
			return
		}
		answer, err := provider.Reply(r.Context(), request.Messages)
		if err != nil {
			http.Error(w, "Model unavailable, cancelled or invalid response", 502)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"index": 0, "finish_reason": "stop", "message": map[string]string{"role": "assistant", "content": answer}}}})
	})
}
