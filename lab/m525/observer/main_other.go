//go:build !linux

package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "M5.25 event reader requires the isolated Linux lab; no local simulator is contacted.")
	os.Exit(2)
}
