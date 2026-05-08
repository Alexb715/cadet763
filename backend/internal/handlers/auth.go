package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/middleware"
)

type AuthDeps struct {
	*Server
	DB         *sql.DB
	SessionTTL time.Duration
	Auditor    *middleware.Auditor
}

type loginReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type clientUser struct {
	User string `json:"user"`
	Role string `json:"role"`
	Name string `json:"name"`
}

func (a *AuthDeps) Login(w http.ResponseWriter, r *http.Request) {
	var in loginReq
	if !a.DecodeJSON(w, r, &in, 4*1024) {
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	if in.Username == "" || in.Password == "" {
		a.Error(w, r, http.StatusUnauthorized, "invalid", nil)
		return
	}

	var (
		userID, passHash, role, name string
		disabledAt                   sql.NullInt64
	)
	err := a.DB.QueryRowContext(r.Context(),
		`SELECT id, password_hash, role, display_name, disabled_at FROM users WHERE username = ? COLLATE NOCASE`,
		in.Username,
	).Scan(&userID, &passHash, &role, &name, &disabledAt)

	switch {
	case errors.Is(err, sql.ErrNoRows):
		// Burn argon2 cycles on the dummy hash so timing matches the success path.
		_ = auth.VerifyPassword(in.Password, auth.DummyHash)
		a.Auditor.Record(r.Context(), "login.fail", in.Username, map[string]string{"reason": "no_user"}, clientIP(r), r.UserAgent())
		a.Error(w, r, http.StatusUnauthorized, "invalid", nil)
		return
	case err != nil:
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	if disabledAt.Valid {
		_ = auth.VerifyPassword(in.Password, auth.DummyHash)
		a.Auditor.Record(r.Context(), "login.fail", in.Username, map[string]string{"reason": "disabled"}, clientIP(r), r.UserAgent())
		a.Error(w, r, http.StatusUnauthorized, "invalid", nil)
		return
	}

	if !auth.VerifyPassword(in.Password, passHash) {
		a.Auditor.Record(r.Context(), "login.fail", in.Username, map[string]string{"reason": "bad_pass"}, clientIP(r), r.UserAgent())
		a.Error(w, r, http.StatusUnauthorized, "invalid", nil)
		return
	}

	raw, hashed, err := auth.NewToken()
	if err != nil {
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	if err := auth.CreateSession(r.Context(), a.DB, userID, hashed, r.UserAgent(), clientIP(r), a.SessionTTL); err != nil {
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	a.Auditor.Record(r.Context(), "login.success", userID, nil, clientIP(r), r.UserAgent())

	a.WriteJSON(w, http.StatusOK, map[string]any{
		"ok":    true,
		"token": raw,
		"user":  clientUser{User: in.Username, Role: role, Name: name},
	})
}

func (a *AuthDeps) Logout(w http.ResponseWriter, r *http.Request) {
	if tok := bearer(r); tok != "" {
		_ = auth.DeleteSession(r.Context(), a.DB, auth.HashToken(tok))
	}
	if u, ok := auth.FromContext(r.Context()); ok && u != nil {
		a.Auditor.Record(r.Context(), "logout", u.ID, nil, clientIP(r), r.UserAgent())
	}
	a.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (a *AuthDeps) Me(w http.ResponseWriter, r *http.Request) {
	u, ok := auth.FromContext(r.Context())
	if !ok || u == nil {
		a.Error(w, r, http.StatusUnauthorized, "unauthorized", nil)
		return
	}
	a.WriteJSON(w, http.StatusOK, map[string]any{
		"ok":   true,
		"user": clientUser{User: u.Username, Role: u.Role, Name: u.DisplayName},
	})
}

type changePasswordReq struct {
	Current string `json:"current_password"`
	New     string `json:"new_password"`
}

// ChangePassword lets a signed-in user rotate their own password. They must
// present the current password to prove the session isn't a stolen token.
// All OTHER sessions for the same user are revoked; the calling session stays
// alive so the UI doesn't bounce them back to login.
func (a *AuthDeps) ChangePassword(w http.ResponseWriter, r *http.Request) {
	u, ok := auth.FromContext(r.Context())
	if !ok || u == nil {
		a.Error(w, r, http.StatusUnauthorized, "unauthorized", nil)
		return
	}
	var in changePasswordReq
	if !a.DecodeJSON(w, r, &in, 4*1024) {
		return
	}
	if len(in.New) < 12 {
		a.Error(w, r, http.StatusBadRequest, "weak_password", nil)
		return
	}
	if in.New == in.Current {
		a.Error(w, r, http.StatusBadRequest, "same_password", nil)
		return
	}

	var currentHash string
	if err := a.DB.QueryRowContext(r.Context(),
		`SELECT password_hash FROM users WHERE id = ?`, u.ID,
	).Scan(&currentHash); err != nil {
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	if !auth.VerifyPassword(in.Current, currentHash) {
		a.Auditor.Record(r.Context(), "user.password_change.fail", u.ID, nil, clientIP(r), r.UserAgent())
		a.Error(w, r, http.StatusUnauthorized, "wrong_password", nil)
		return
	}

	newHash, err := auth.HashPassword(in.New)
	if err != nil {
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	if _, err := a.DB.ExecContext(r.Context(),
		`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`,
		newHash, time.Now().Unix(), u.ID,
	); err != nil {
		a.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	// Revoke every other session of this user; keep the calling one alive.
	tok := bearer(r)
	if tok != "" {
		_, _ = a.DB.ExecContext(r.Context(),
			`DELETE FROM sessions WHERE user_id = ? AND token_hash != ?`,
			u.ID, auth.HashToken(tok))
	}

	a.Auditor.Record(r.Context(), "user.password_change", u.ID, nil, clientIP(r), r.UserAgent())
	a.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func bearer(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if !strings.HasPrefix(h, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(h[len("Bearer "):])
}

func clientIP(r *http.Request) string {
	// chi/middleware.RealIP rewrites RemoteAddr if X-Forwarded-For is trusted.
	// We only read it here; trust is decided by config + middleware ordering.
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return ip
	}
	if r.RemoteAddr != "" {
		// strip :port if present
		if i := strings.LastIndex(r.RemoteAddr, ":"); i > 0 {
			return r.RemoteAddr[:i]
		}
		return r.RemoteAddr
	}
	return ""
}

