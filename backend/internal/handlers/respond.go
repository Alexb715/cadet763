package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/763cadets/backend/internal/middleware"
)

// Server bundles the shared dependencies most handlers need. A single value
// is constructed in cmd/server/main.go and passed to each handler factory.
type Server struct {
	Log    *slog.Logger
	DevMode bool
}

func (s *Server) WriteJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		s.Log.Warn("encode response", slog.String("err", err.Error()))
	}
}

// Error writes a generic error envelope. In dev mode, an extra `dev_detail`
// field carries the underlying error string for easier debugging.
func (s *Server) Error(w http.ResponseWriter, r *http.Request, status int, code string, err error) {
	body := map[string]any{
		"ok":         false,
		"error":      code,
		"request_id": middleware.RequestIDFromContext(r.Context()),
	}
	if s.DevMode && err != nil {
		body["dev_detail"] = err.Error()
	}
	s.WriteJSON(w, status, body)
	if err != nil && status >= 500 {
		s.Log.ErrorContext(r.Context(), "handler error",
			slog.String("code", code),
			slog.String("err", err.Error()),
			slog.String("path", r.URL.Path),
		)
	}
}

// DecodeJSON enforces a small request size and returns a generic 400 on bad input.
func (s *Server) DecodeJSON(w http.ResponseWriter, r *http.Request, dst any, maxBytes int64) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		s.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, nil) && err.Error() != "EOF" {
		s.Error(w, r, http.StatusBadRequest, "bad_request", errors.New("trailing data"))
		return false
	}
	return true
}
