// Command m593a runs bounded, explicitly selected loopback model qualification.
// It never starts a runner, downloads a model, or contacts a guest.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"
	"time"

	"pidp11.local/webdesktop/internal/companion"
)

func main() {
	model := flag.String("model", "", "already installed, approved model")
	kind := flag.String("kind", "ollama", "ollama or openai-compatible")
	noThinking := flag.Bool("no-thinking", false, "explicitly disable native Ollama thinking for this test")
	modelsOnly := flag.Bool("models-only", false, "verify discovery without loading or chatting")
	flag.Parse()
	allowed := (*kind == "ollama" && (*model == "qwen3:14b" || *model == "qwen2.5-coder:14b")) || (*kind == "openai-compatible" && *model == "openai/gpt-oss-20b")
	if !allowed {
		panic("this local qualification admits only the three inventoried models and their tested runner dialects")
	}
	endpoint := "http://127.0.0.1:11434/api/chat"
	if *kind == "openai-compatible" {
		endpoint = "http://127.0.0.1:1234/v1/chat/completions"
	}
	if os.Getenv("PIDP11_LOCAL_MODEL_TEST") != "1" || *model == "" {
		panic("explicit local test opt-in and installed model required")
	}
	var think *bool
	if *noThinking {
		value := false
		think = &value
	}
	if *modelsOnly {
		modelsEndpoint := "http://127.0.0.1:11434/api/tags"
		if *kind == "openai-compatible" {
			modelsEndpoint = "http://127.0.0.1:1234/v1/models"
		}
		service, err := companion.NewService(companion.Config{Kind: *kind, Endpoint: endpoint, ModelsEndpoint: modelsEndpoint, Models: []string{*model}}, nil)
		if err != nil {
			panic(err)
		}
		models, err := service.Models(context.Background())
		if err != nil {
			panic(err)
		}
		json.NewEncoder(os.Stdout).Encode(models)
		return
	}
	provider, err := companion.NewHTTP(*kind, endpoint, *model, "", think)
	if err != nil {
		panic(err)
	}
	prompts := []struct{ ID, Question, Expected string }{
		{"architecture", "In at most 70 words: Is the PDP-11/70 a 16-bit or 22-bit architecture? Distinguish word width, virtual address space and physical addressing.", "16-bit words; 16-bit virtual addresses/64 KiB per address space; 22-bit physical/4 MiB; split I/D possible"},
		{"octal", "Answer concisely: Convert octal 177776 to decimal and hexadecimal. Is 178000 valid octal? Explain why.", "65534; FFFE; 8 invalid in octal"},
		{"commands", "In at most 60 words: Give the directory-listing command for UNIX V7 and for RT-11. Is sudo apt install a standard UNIX V7 command? Do not suggest installing anything.", "V7 ls; RT-11 DIR; sudo/apt not standard V7"},
		{"uncertainty", "A user asks you to diagnose their attached PiDP-11 from the name alone. What can you infer about its current OS, RUN lamp and switch register? Answer in 40 words.", "Cannot infer live state from name; require explicit evidence"},
	}
	encoder := json.NewEncoder(os.Stdout)
	for _, p := range prompts {
		begin := time.Now()
		reply, err := provider.Reply(context.Background(), []companion.Message{{Role: "user", Content: p.Question}})
		record := map[string]any{"model": *model, "case": p.ID, "prompt": p.Question, "expected": p.Expected, "seconds": time.Since(begin).Seconds(), "answer": reply}
		if err != nil {
			record["error"] = err.Error()
		}
		if err := encoder.Encode(record); err != nil {
			panic(err)
		}
	}
	begin := time.Now()
	_, err = provider.Reply(context.Background(), []companion.Message{{Role: "user", Content: string(make([]byte, 4097))}})
	fmt.Fprintf(os.Stderr, "oversized input refused=%v duration=%s\n", err != nil, time.Since(begin))
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	begin = time.Now()
	_, err = provider.Reply(ctx, []companion.Message{{Role: "user", Content: "Explain PDP-11 addressing modes in detail."}})
	fmt.Fprintf(os.Stderr, "short deadline error=%v duration=%s\n", err, time.Since(begin))
}
