// The modem peer is a one-shot network-none laboratory endpoint. It cannot dial
// user-selected destinations; the modem package itself has no network access.
package main

import (
	"fmt"
	"io"
	"net"
	"os"
	"time"

	"pidp11.local/webdesktop/lab/m526/modem"
)

func run() error {
	interfaces, err := net.Interfaces()
	if err != nil || len(interfaces) != 1 || interfaces[0].Name != "lo" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		return fmt.Errorf("network-none laboratory required")
	}
	connection, err := net.DialTimeout("tcp", "127.0.0.1:40103", time.Second)
	if err != nil {
		return err
	}
	defer connection.Close()
	if err := connection.SetDeadline(time.Now().Add(60 * time.Second)); err != nil {
		return err
	}
	machine := new(modem.Machine)
	buffer := make([]byte, 256)
	for total := 0; total < 16384; {
		n, err := connection.Read(buffer)
		total += n
		if total > 16384 {
			return fmt.Errorf("bounded exchange exhausted")
		}
		for _, b := range buffer[:n] {
			response := machine.Feed(b)
			for len(response) > 0 {
				n, err := connection.Write(response)
				if err != nil {
					return err
				}
				if n == 0 {
					return fmt.Errorf("uncertain reply; no replay")
				}
				response = response[n:]
			}
		}
		// A Reader may deliver a final prefix together with EOF/error.
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
	}
	return fmt.Errorf("bounded exchange exhausted")
}
func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
