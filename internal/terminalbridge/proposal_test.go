package terminalbridge

import (
	"io"
	"net"
	"testing"
	"time"
)

func TestProposalSingleUseAndBinding(t *testing.T) {
	endpoint := NewEndpoint(Config{ID: "test"})
	defer endpoint.Close()
	service, guest := net.Pipe()
	defer guest.Close()
	if err := endpoint.Attach(service); err != nil {
		t.Fatal(err)
	}
	client, _ := endpoint.Subscribe()
	defer endpoint.Unsubscribe(client)
	other, _ := endpoint.Subscribe()
	defer endpoint.Unsubscribe(other)
	endpoint.Operation(client, "acquire", 0, 0, nil, 0)
	epoch := endpoint.epoch
	if err := endpoint.ProposalOperation(other, "propose", "", epoch, 0, []byte("ls\r")); err == nil {
		t.Fatal("observer proposed")
	}
	if err := endpoint.ProposalOperation(client, "propose", "", epoch, 0, []byte("shutdown\r")); err == nil {
		t.Fatal("lifecycle command allowed")
	}
	if err := endpoint.ProposalOperation(client, "propose", "", epoch, 0, []byte("pwd\r")); err != nil {
		t.Fatal(err)
	}
	id := client.proposal.id
	received := make(chan string, 1)
	go func() {
		guest.SetReadDeadline(time.Now().Add(time.Second))
		data := make([]byte, 4)
		_, err := io.ReadFull(guest, data)
		if err != nil {
			received <- "read failed"
			return
		}
		received <- string(data)
	}()
	if err := endpoint.ProposalOperation(client, "approve", id, epoch, 1, nil); err != nil {
		t.Fatal(err)
	}
	if value := <-received; value != "pwd\r" {
		t.Fatal(value)
	}
	if endpoint.ProposalOperation(client, "approve", id, epoch, 2, nil) == nil {
		t.Fatal("replayed")
	}
	endpoint.ProposalOperation(client, "propose", "", epoch, 0, []byte("ls\r"))
	id = client.proposal.id
	endpoint.Operation(client, "release", epoch, 0, nil, 0)
	endpoint.Operation(client, "acquire", 0, 0, nil, 0)
	if endpoint.ProposalOperation(client, "approve", id, endpoint.epoch, 2, nil) == nil {
		t.Fatal("lease transition retained approval")
	}
	endpoint.ProposalOperation(client, "propose", "", endpoint.epoch, 0, []byte("ls\r"))
	id = client.proposal.id
	client.proposal.expires = time.Now().Add(-time.Second)
	if endpoint.ProposalOperation(client, "approve", id, endpoint.epoch, 2, nil) == nil {
		t.Fatal("expired")
	}
	endpoint.ProposalOperation(client, "propose", "", endpoint.epoch, 0, []byte("ls\r"))
	id = client.proposal.id
	endpoint.Close()
	if endpoint.ProposalOperation(client, "approve", id, endpoint.epoch, 2, nil) == nil {
		t.Fatal("disconnected")
	}
}
