package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"runtime"
	"time"

	"github.com/763cadets/backend/internal/version"
)

type HealthDeps struct {
	*Server
	DB            *sql.DB
	Env           string
	DBPath        string
	LastFBFetchAt func() time.Time
}

func (h *HealthDeps) Get(w http.ResponseWriter, r *http.Request) {
	body := map[string]any{
		"ok":      true,
		"version": version.Version,
		"env":     h.Env,
	}
	if err := h.DB.PingContext(r.Context()); err == nil {
		body["dbOk"] = true
	} else {
		body["dbOk"] = false
	}
	if h.DevMode {
		body["goroutines"] = runtime.NumGoroutine()
		if st, err := os.Stat(h.DBPath); err == nil {
			body["db_size_bytes"] = st.Size()
		}
		if h.LastFBFetchAt != nil {
			t := h.LastFBFetchAt()
			if !t.IsZero() {
				body["last_fb_fetch_at"] = t.Unix()
			} else {
				body["last_fb_fetch_at"] = nil
			}
		}
	}
	h.WriteJSON(w, http.StatusOK, body)
}
