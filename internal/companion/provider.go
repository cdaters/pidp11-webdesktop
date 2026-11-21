// Package companion provides bounded, chat-only provider adapters for an optional
// owner-configured host. No tools,
// shell, guest writes, discovery, credentials in browser code or automatic retry.
package companion

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"
)

// Message is explicitly submitted text, never an automatically captured screen.
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// Provider owns no conversation state. The caller controls lifetime with context.
type Provider interface {
	Reply(context.Context, []Message) (string, error)
}

// HTTPProvider owns a fixed endpoint and one concurrent request slot. Constructing
// it makes no network request. The caller must authorize the endpoint and hold
// its secret in a private server-side configuration, never a browser request.
type HTTPProvider struct {
	kind, endpoint, model, token string
	client                       *http.Client
	slot                         chan struct{}
}

// NewHTTP distinguishes Ollama native chat from OpenAI-compatible chat. Supply a
// complete endpoint path. HTTP is limited to literal loopback; remote uses HTTPS.
func NewHTTP(kind, endpoint, model, token string) (*HTTPProvider, error) {
	u, err := url.Parse(endpoint)
	if err != nil || u.User != nil || u.RawQuery != "" || u.Fragment != "" || u.Hostname() == "" || model == "" || len(model) > 128 || len(token) > 4096 {
		return nil, errors.New("invalid private provider configuration")
	}
	ip := net.ParseIP(u.Hostname())
	if u.Scheme != "https" && !(u.Scheme == "http" && ip != nil && ip.IsLoopback()) {
		return nil, errors.New("HTTPS or literal loopback HTTP required")
	}
	if kind != "ollama" && kind != "openai-compatible" {
		return nil, errors.New("unsupported provider protocol")
	}
	client := &http.Client{Timeout: 20 * time.Second, CheckRedirect: func(*http.Request, []*http.Request) error { return errors.New("provider redirect refused") }}
	return &HTTPProvider{kind: kind, endpoint: endpoint, model: model, token: token, client: client, slot: make(chan struct{}, 1)}, nil
}

// Reply bounds input/output and cancellation. Tool calls and partial responses
// are errors, not permission to execute anything. Error messages omit payloads.
func (p *HTTPProvider) Reply(ctx context.Context, messages []Message) (string, error) {
	if len(messages) == 0 || len(messages) > 20 {
		return "", errors.New("conversation count limit")
	}
	total := 0
	for _, m := range messages {
		total += len(m.Content)
		if (m.Role != "user" && m.Role != "assistant") || len(m.Content) > 4096 {
			return "", errors.New("invalid chat message")
		}
	}
	if total > 16384 {
		return "", errors.New("conversation byte limit")
	}
	select {
	case p.slot <- struct{}{}:
		defer func() { <-p.slot }()
	default:
		return "", errors.New("provider busy")
	}
	payload := map[string]any{"model": p.model, "messages": messages, "stream": false}
	if p.kind == "ollama" {
		payload["options"] = map[string]int{"num_predict": 512}
	} else {
		payload["max_completion_tokens"] = 512
	}
	data, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewReader(data))
	if err != nil {
		return "", errors.New("provider request invalid")
	}
	req.Header.Set("Content-Type", "application/json")
	if p.token != "" {
		req.Header.Set("Authorization", "Bearer "+p.token)
	}
	response, err := p.client.Do(req)
	if err != nil {
		return "", errors.New("provider unavailable or cancelled")
	}
	defer response.Body.Close()
	if response.StatusCode != 200 {
		return "", fmt.Errorf("provider returned HTTP %d", response.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(response.Body, 65537))
	if err != nil || len(body) > 65536 {
		return "", errors.New("provider response read/size failure")
	}
	type answer struct {
		Content      string            `json:"content"`
		ToolCalls    []json.RawMessage `json:"tool_calls"`
		FunctionCall json.RawMessage   `json:"function_call"`
	}
	var wire struct {
		Done    bool   `json:"done"`
		Message answer `json:"message"`
		Choices []struct {
			Message answer `json:"message"`
			Finish  string `json:"finish_reason"`
		} `json:"choices"`
	}
	if json.Unmarshal(body, &wire) != nil {
		return "", errors.New("provider response is not supported JSON")
	}
	selected := wire.Message
	if p.kind == "ollama" {
		if !wire.Done {
			return "", errors.New("partial Ollama response")
		}
	} else {
		if len(wire.Choices) != 1 || wire.Choices[0].Finish != "stop" {
			return "", errors.New("incomplete or ambiguous chat response")
		}
		selected = wire.Choices[0].Message
	}
	if len(selected.ToolCalls) > 0 || (len(selected.FunctionCall) > 0 && string(selected.FunctionCall) != "null") {
		return "", errors.New("tool requests are not supported")
	}
	if selected.Content == "" || len(selected.Content) > 4096 {
		return "", errors.New("provider content limit or empty answer")
	}
	return selected.Content, nil
}
