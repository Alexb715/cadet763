package handlers

import (
	"database/sql"
	"net/http"
	"strings"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

type UsersDeps struct {
	*Server
	DB      *sql.DB
	Auditor *middleware.Auditor
}

type clientUserAdmin struct {
	ID         string `json:"id"`
	Username   string `json:"username"`
	Role       string `json:"role"`
	Name       string `json:"name"`
	CreatedAt  int64  `json:"created_at"`
	UpdatedAt  int64  `json:"updated_at"`
	Disabled   bool   `json:"disabled"`
}

func (u *UsersDeps) List(w http.ResponseWriter, r *http.Request) {
	rows, err := u.DB.QueryContext(r.Context(), `
		SELECT id, username, role, display_name, created_at, updated_at, disabled_at
		FROM users
		ORDER BY username COLLATE NOCASE`)
	if err != nil {
		u.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	defer rows.Close()
	out := make([]clientUserAdmin, 0, 8)
	for rows.Next() {
		var c clientUserAdmin
		var disabledAt sql.NullInt64
		if err := rows.Scan(&c.ID, &c.Username, &c.Role, &c.Name, &c.CreatedAt, &c.UpdatedAt, &disabledAt); err != nil {
			u.Error(w, r, http.StatusInternalServerError, "internal", err)
			return
		}
		c.Disabled = disabledAt.Valid
		out = append(out, c)
	}
	u.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": out})
}

type createUserReq struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Name     string `json:"name"`
}

func (u *UsersDeps) Create(w http.ResponseWriter, r *http.Request) {
	var in createUserReq
	if !u.DecodeJSON(w, r, &in, 4*1024) {
		return
	}
	in.Username = strings.TrimSpace(in.Username)
	in.Name = strings.TrimSpace(in.Name)
	if in.Username == "" || in.Name == "" {
		u.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	if in.Role != "admin" && in.Role != "editor" {
		u.Error(w, r, http.StatusBadRequest, "bad_role", nil)
		return
	}
	if len(in.Password) < 12 {
		u.Error(w, r, http.StatusBadRequest, "weak_password", nil)
		return
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		u.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	id := uuid.NewString()
	now := time.Now().Unix()
	_, err = u.DB.ExecContext(r.Context(), `
		INSERT INTO users (id, username, password_hash, role, display_name, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		id, in.Username, hash, in.Role, in.Name, now, now)
	if err != nil {
		// SQLite unique constraint violation maps cleanly to 409.
		if strings.Contains(err.Error(), "UNIQUE") {
			u.Error(w, r, http.StatusConflict, "username_taken", err)
			return
		}
		u.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	u.Auditor.Record(r.Context(), "user.create", id, map[string]any{"username": in.Username, "role": in.Role}, clientIP(r), r.UserAgent())
	u.WriteJSON(w, http.StatusCreated, map[string]any{"ok": true, "id": id})
}

type patchUserReq struct {
	Password *string `json:"password"`
	Role     *string `json:"role"`
	Name     *string `json:"name"`
	Disabled *bool   `json:"disabled"`
}

func (u *UsersDeps) Patch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		u.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	var in patchUserReq
	if !u.DecodeJSON(w, r, &in, 4*1024) {
		return
	}

	actor, _ := auth.FromContext(r.Context())

	// Self-protection: admin cannot disable themselves or demote themselves.
	if actor != nil && actor.ID == id {
		if in.Disabled != nil && *in.Disabled {
			u.Error(w, r, http.StatusBadRequest, "self_disable_forbidden", nil)
			return
		}
		if in.Role != nil && *in.Role != "admin" {
			u.Error(w, r, http.StatusBadRequest, "self_demote_forbidden", nil)
			return
		}
	}

	sets := []string{"updated_at = ?"}
	args := []any{time.Now().Unix()}
	if in.Password != nil {
		if len(*in.Password) < 12 {
			u.Error(w, r, http.StatusBadRequest, "weak_password", nil)
			return
		}
		hash, err := auth.HashPassword(*in.Password)
		if err != nil {
			u.Error(w, r, http.StatusInternalServerError, "internal", err)
			return
		}
		sets = append(sets, "password_hash = ?")
		args = append(args, hash)
		// Invalidate other sessions on password change.
		_ = auth.DeleteUserSessions(r.Context(), u.DB, id)
	}
	if in.Role != nil {
		if *in.Role != "admin" && *in.Role != "editor" {
			u.Error(w, r, http.StatusBadRequest, "bad_role", nil)
			return
		}
		sets = append(sets, "role = ?")
		args = append(args, *in.Role)
	}
	if in.Name != nil {
		sets = append(sets, "display_name = ?")
		args = append(args, strings.TrimSpace(*in.Name))
	}
	if in.Disabled != nil {
		if *in.Disabled {
			sets = append(sets, "disabled_at = ?")
			args = append(args, time.Now().Unix())
			_ = auth.DeleteUserSessions(r.Context(), u.DB, id)
		} else {
			sets = append(sets, "disabled_at = NULL")
		}
	}
	args = append(args, id)
	res, err := u.DB.ExecContext(r.Context(),
		"UPDATE users SET "+joinSets(sets)+" WHERE id = ?", args...)
	if err != nil {
		u.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		u.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	u.Auditor.Record(r.Context(), "user.update", id, nil, clientIP(r), r.UserAgent())
	u.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (u *UsersDeps) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		u.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	actor, _ := auth.FromContext(r.Context())
	if actor != nil && actor.ID == id {
		u.Error(w, r, http.StatusBadRequest, "self_delete_forbidden", nil)
		return
	}
	res, err := u.DB.ExecContext(r.Context(), `DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		u.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		u.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	u.Auditor.Record(r.Context(), "user.delete", id, nil, clientIP(r), r.UserAgent())
	u.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

