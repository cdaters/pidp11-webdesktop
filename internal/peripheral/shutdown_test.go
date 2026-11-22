package peripheral

import (
	"context"
	"os"
	"testing"
)

func TestClosedFollowerCannotReopenOrRestart(t *testing.T) {
	f, _, a := setupFollower(t)
	f.Start(context.Background())
	f.Close()
	a = nextApproval(f, a)
	if err := f.Apply("follow", a); err == nil {
		t.Fatal("closed follower reopened a spool")
	}
	f.Start(context.Background())
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.entries["lp"].file != nil {
		t.Fatal("descriptor survived shutdown")
	}
}

func TestTruncateRegrowBetweenPollsRetiresObservedBytes(t *testing.T) {
	f, path, _ := setupFollower(t)
	appendSpool(t, path, []byte("original"))
	f.poll()
	// Same inode, larger final length: size and modification time alone cannot
	// distinguish append from truncate/regrow before the next poll.
	if err := os.WriteFile(path, []byte("replaced plus appended bytes"), 0600); err != nil {
		t.Fatal(err)
	}
	f.poll()
	if f.List()[0].State != "faulted" {
		t.Fatal("rewritten observed prefix accepted as append")
	}
}
