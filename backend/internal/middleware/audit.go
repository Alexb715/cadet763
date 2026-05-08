package middleware

import (
	"context"
	"database/sql"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/763cadets/backend/internal/auth"
)

type Auditor struct {
	DB  *sql.DB
	Log *slog.Logger
}

// Record writes an audit_log row. Best-effort — never blocks the request on
// the DB, never returns an error to the caller.
func (a *Auditor) Record(ctx context.Context, action, target string, details any, ip, userAgent string) {
	var actorID, actorUsername string
	if u, ok := auth.FromContext(ctx); ok && u != nil {
		actorID = u.ID
		actorUsername = u.Username
	}
	var detailsJSON sql.NullString
	if details != nil {
		if b, err := json.Marshal(details); err == nil {
			detailsJSON = sql.NullString{String: string(b), Valid: true}
		}
	}
	_, err := a.DB.ExecContext(ctx, `
		INSERT INTO audit_log (at, actor_id, actor_username, action, target, ip, user_agent, details)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		time.Now().Unix(),
		nullIfEmpty(actorID),
		nullIfEmpty(actorUsername),
		action,
		nullIfEmpty(target),
		nullIfEmpty(ip),
		nullIfEmpty(userAgent),
		detailsJSON,
	)
	if err != nil && a.Log != nil {
		a.Log.WarnContext(ctx, "audit log insert failed",
			slog.String("action", action),
			slog.String("err", err.Error()))
	}
}

func nullIfEmpty(s string) any {
	if s == "" {
		return nil
	}
	return s
}
