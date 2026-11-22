// Command client is a disposable cross-host probe using the actual desktop
// provider adapter. It cannot discover, attach or control a guest.
package main

import (
	"context"
	"encoding/json"
	"os"
	"pidp11.local/webdesktop/internal/companion"
	"strings"
)

func main() {
	token, err := os.ReadFile("/root/m593c/token")
	if err != nil {
		panic(err)
	}
	p, err := companion.NewHTTP("openai-compatible", "https://127.0.0.1:11435/v1/chat/completions", "gemma4:12b", strings.TrimSpace(string(token)), nil)
	if err != nil {
		panic(err)
	}
	answer, err := p.Reply(context.Background(), []companion.Message{{Role: "user", Content: "In one sentence distinguish a 16-bit virtual address from a 22-bit physical address on the PDP-11/70."}})
	if err != nil {
		panic(err)
	}
	json.NewEncoder(os.Stdout).Encode(map[string]any{"answer": answer, "fixture": false, "guest_attachment": "none"})
}
