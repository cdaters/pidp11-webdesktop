// Bounded reproduction of the accepted M5.26 personality, not a new modem.
package main

import (
	"encoding/hex"
	"encoding/json"
	"net"
	"os"
	"time"

	old "pidp11.local/webdesktop/lab/m526/modem"
)

func main() {
	interfaces, err := net.Interfaces()
	if err != nil || len(interfaces) != 1 || interfaces[0].Name != "lo" || os.Getenv("PIDP11_ISOLATED_LAB") != "1" {
		panic("isolated lab required")
	}
	connection, err := net.DialTimeout("tcp", "127.0.0.1:40103", time.Second)
	if err != nil {
		panic(err)
	}
	defer connection.Close()
	if err := connection.SetDeadline(time.Now().Add(30 * time.Second)); err != nil {
		panic(err)
	}
	machine := new(old.Machine)
	encoder := json.NewEncoder(os.Stdout)
	var byteBuffer [1]byte
	command := make([]byte, 0, 80)
	for replies := 0; replies < 6; {
		n, err := connection.Read(byteBuffer[:])
		if n != 1 || err != nil {
			panic("bounded reproduction read failed")
		}
		if len(command) >= 128 {
			panic("bounded capture exhausted")
		}
		b := byteBuffer[0]
		command = append(command, b)
		reply := machine.Feed(b)
		if len(reply) == 0 {
			continue
		}
		// Reconstructed command from exact observed bytes; original parser unchanged.
		if err := encoder.Encode(map[string]string{"modem_rx_command_hex": hex.EncodeToString(command), "modem_tx_hex": hex.EncodeToString(reply)}); err != nil {
			panic(err)
		}
		command = command[:0]
		if n, err := connection.Write(reply); err != nil || n != len(reply) {
			panic("uncertain response; no replay")
		}
		replies++
	}
}
