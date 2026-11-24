package main

import (
	"net"
	"sync"
)

// boundedListener refuses excess connections before HTTP starts a handler.
// Closing one owned connection releases its slot exactly once.
type boundedListener struct {
	net.Listener
	slots chan struct{}
}
type boundedConnection struct {
	net.Conn
	once    sync.Once
	release func()
}

func (c *boundedConnection) Close() error { err := c.Conn.Close(); c.once.Do(c.release); return err }
func (l *boundedListener) Accept() (net.Conn, error) {
	for {
		connection, err := l.Listener.Accept()
		if err != nil {
			return nil, err
		}
		select {
		case l.slots <- struct{}{}:
			return &boundedConnection{Conn: connection, release: func() { <-l.slots }}, nil
		default:
			connection.Close()
		}
	}
}
