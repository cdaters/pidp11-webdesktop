// Package web embeds built frontend files and serves them with the desktop's
// content-security policy. It has no device or terminal ownership responsibilities.
package web

import (
	"embed"
	"io/fs"
)

//go:embed static/*
var files embed.FS

// Assets returns the read-only embedded frontend. Run npm run build:server before
// building a usable desktop; a fresh clone contains only the embedding placeholder.
func Assets() fs.FS {
	f, err := fs.Sub(files, "static")
	if err != nil {
		panic(err)
	}
	return f
}
