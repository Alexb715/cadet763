package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
)

// CORS builds a strict allowlist in prod, and a generous localhost allowlist in dev.
func CORS(allowed []string, devMode bool) func(http.Handler) http.Handler {
	origins := append([]string{}, allowed...)
	if devMode {
		origins = append(origins,
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:8081",
			"http://127.0.0.1:5173",
			"http://127.0.0.1:5174",
		)
	}
	c := cors.New(cors.Options{
		AllowedOrigins:   origins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-ID"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	})
	return c.Handler
}
