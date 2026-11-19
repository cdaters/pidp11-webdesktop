package terminalservice

import (
	"net"
	"sync"
)

// LimitListener bounds live sockets, including TLS handshakes and idle HTTP
// connections before they can become authenticated WebSocket viewers.
func LimitListener(listener net.Listener, maximum int) net.Listener {
	return &limitedListener{Listener: listener, slots: make(chan struct{}, maximum)}
}

type limitedListener struct {
	net.Listener
	slots chan struct{}
}

func (l *limitedListener) Accept() (net.Conn, error) {
	for {
		conn, err := l.Listener.Accept()
		if err != nil {
			return nil, err
		}
		select {
		case l.slots <- struct{}{}:
			return &limitedConn{Conn: conn, release: func() { <-l.slots }}, nil
		default:
			conn.Close()
		}
	}
}

type limitedConn struct {
	net.Conn
	once    sync.Once
	release func()
}

func (c *limitedConn) Close() error { err := c.Conn.Close(); c.once.Do(c.release); return err }
