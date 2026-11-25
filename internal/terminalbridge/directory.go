package terminalbridge

// Directory pins each browser connection to the attachment it explicitly chose.
// The pilot Bridge is immutable; the optional service supplies fresh generations.
type Directory interface {
	List() []Listing
	Lookup(id, generation string) *Endpoint
}

// Listing is public terminal metadata; it contains no network target or token.
type Listing struct {
	Serial     SerialProfile `json:"serial,omitzero"`
	ID         string        `json:"id"`
	Label      string        `json:"label"`
	Connected  bool          `json:"connected"`
	State      string        `json:"state"`
	Generation string        `json:"generation,omitempty"`
	Kind       string        `json:"kind"`
	Columns    int           `json:"columns"`
	Rows       int           `json:"rows"`
}

// List reports the immutable pilot bridge through the common directory.
func (b *Bridge) List() []Listing {
	rows := make([]Listing, 0, len(b.Endpoints))
	for id, e := range b.Endpoints {
		state := "unavailable"
		connected := e.Connected()
		if connected {
			state = "attached"
		}
		rows = append(rows, Listing{Serial: e.Config.Serial, ID: id, Label: e.Config.Label, Connected: connected, State: state, Kind: "real-guest-line", Columns: 80, Rows: 24})
	}
	return rows
}

// Lookup retains the pilot's original generation-free endpoint routing.
func (b *Bridge) Lookup(id, generation string) *Endpoint {
	if generation != "" {
		return nil
	}
	return b.Endpoints[id]
}
