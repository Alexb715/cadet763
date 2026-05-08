package middleware

import (
	"log/slog"
	"net/http"
	"runtime/debug"
)

// Recover catches panics in handlers, logs the stack server-side, and returns
// a generic 500 with the request id so the client sees something opaque.
func Recover(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					reqID, _ := r.Context().Value(requestIDKey).(string)
					log.ErrorContext(r.Context(), "panic recovered",
						slog.Any("panic", rec),
						slog.String("request_id", reqID),
						slog.String("path", r.URL.Path),
						slog.String("stack", string(debug.Stack())),
					)
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = w.Write([]byte(`{"ok":false,"error":"internal","request_id":"` + reqID + `"}`))
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}
