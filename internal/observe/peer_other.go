//go:build !linux

package observe

import (
	"context"
	"fmt"
)

type Publisher struct{}

func PinPublisher(uid uint32, pid int) (Publisher, error) {
	return Publisher{}, fmt.Errorf("credential-verified publication requires Linux")
}
func (s *Store) ListenVerified(ctx context.Context, path string, p Publisher, group int) error {
	return fmt.Errorf("credential-verified publication requires Linux")
}
