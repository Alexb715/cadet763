package middleware

import "net/http"

// SecurityHeaders emits defensive headers regardless of upstream proxy config.
// HSTS is omitted in dev so localhost over HTTP isn't pinned.
func SecurityHeaders(devMode bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
			h.Set("Cross-Origin-Opener-Policy", "same-origin")
			h.Set("Cross-Origin-Resource-Policy", "same-site")
			h.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
			if !devMode {
				h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
				h.Set("Content-Security-Policy",
					"default-src 'none'; img-src 'self' https:; connect-src 'self'; "+
						"script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
						"font-src https://fonts.gstatic.com; frame-ancestors 'none'; base-uri 'self'")
			} else {
				h.Set("Content-Security-Policy",
					"default-src 'self'; img-src 'self' https: data: blob:; "+
						"connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*; "+
						"script-src 'self' 'unsafe-eval' 'unsafe-inline'; "+
						"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
						"font-src https://fonts.gstatic.com data:; frame-ancestors 'none'; base-uri 'self'")
			}
			next.ServeHTTP(w, r)
		})
	}
}
