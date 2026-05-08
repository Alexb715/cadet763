package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

// LimitConfig groups all rate-limit knobs so dev/prod profiles can be applied
// in one place.
type LimitConfig struct {
	LoginPerMin      int
	ContentPerMin    int
	UploadPerHour    int
	RefreshPerWindow int
	RefreshWindow    time.Duration
	DefaultPerMin    int
}

func ProductionLimits() LimitConfig {
	return LimitConfig{
		LoginPerMin:      5,
		ContentPerMin:    60,
		UploadPerHour:    30,
		RefreshPerWindow: 1,
		RefreshWindow:    time.Minute,
		DefaultPerMin:    600,
	}
}

func DevelopmentLimits() LimitConfig {
	return LimitConfig{
		LoginPerMin:      60,
		ContentPerMin:    10000,
		UploadPerHour:    10000,
		RefreshPerWindow: 1,
		RefreshWindow:    5 * time.Second,
		DefaultPerMin:    10000,
	}
}

func LoginLimit(c LimitConfig) func(http.Handler) http.Handler {
	return httprate.LimitByIP(c.LoginPerMin, time.Minute)
}

func ContentLimit(c LimitConfig) func(http.Handler) http.Handler {
	return httprate.Limit(c.ContentPerMin, time.Minute, httprate.WithKeyFuncs(httprate.KeyByIP))
}

func UploadLimit(c LimitConfig) func(http.Handler) http.Handler {
	return httprate.Limit(c.UploadPerHour, time.Hour, httprate.WithKeyFuncs(httprate.KeyByIP))
}

func RefreshLimit(c LimitConfig) func(http.Handler) http.Handler {
	return httprate.Limit(c.RefreshPerWindow, c.RefreshWindow, httprate.WithKeyFuncs(func(r *http.Request) (string, error) {
		return "global", nil
	}))
}

func DefaultLimit(c LimitConfig) func(http.Handler) http.Handler {
	return httprate.LimitByIP(c.DefaultPerMin, time.Minute)
}
