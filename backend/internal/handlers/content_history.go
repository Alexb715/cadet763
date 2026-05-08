package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type ContentHistoryDeps struct {
	*Server
	DB      *sql.DB
	Auditor *middleware.Auditor
}

type historyRow struct {
	ID         int64  `json:"id"`
	CreatedAt  int64  `json:"created_at"`
	DocHash    string `json:"doc_hash"`
	SizeBytes  int    `json:"size_bytes"`
	Note       string `json:"note,omitempty"`
	UpdatedBy  *struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"updated_by,omitempty"`
}

func (h *ContentHistoryDeps) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.QueryContext(r.Context(), `
		SELECT ch.id, ch.created_at, ch.doc_hash, length(ch.document), ch.note,
		       u.id, u.display_name
		FROM content_history ch
		LEFT JOIN users u ON u.id = ch.updated_by
		ORDER BY ch.id DESC
		LIMIT 50`)
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	defer rows.Close()

	out := make([]historyRow, 0, 50)
	for rows.Next() {
		var hr historyRow
		var note sql.NullString
		var userID, userName sql.NullString
		if err := rows.Scan(&hr.ID, &hr.CreatedAt, &hr.DocHash, &hr.SizeBytes, &note, &userID, &userName); err != nil {
			h.Error(w, r, http.StatusInternalServerError, "internal", err)
			return
		}
		if note.Valid {
			hr.Note = note.String
		}
		if userID.Valid {
			hr.UpdatedBy = &struct {
				ID   string `json:"id"`
				Name string `json:"name"`
			}{ID: userID.String, Name: userName.String}
		}
		out = append(out, hr)
	}
	h.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": out})
}

func (h *ContentHistoryDeps) Get(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return
	}
	var doc, hash string
	var createdAt int64
	err = h.DB.QueryRowContext(r.Context(),
		`SELECT document, doc_hash, created_at FROM content_history WHERE id = ?`, id,
	).Scan(&doc, &hash, &createdAt)
	if errors.Is(err, sql.ErrNoRows) {
		h.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	// Hand-craft response so the embedded `document` is raw JSON, not a string.
	_, _ = w.Write([]byte(`{"ok":true,"id":` + strconv.FormatInt(id, 10) +
		`,"created_at":` + strconv.FormatInt(createdAt, 10) +
		`,"doc_hash":"` + hash + `","document":` + doc + `}`))
}

func (h *ContentHistoryDeps) Restore(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		h.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return
	}
	var doc string
	err = h.DB.QueryRowContext(r.Context(),
		`SELECT document FROM content_history WHERE id = ?`, id,
	).Scan(&doc)
	if errors.Is(err, sql.ErrNoRows) {
		h.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	if err != nil {
		h.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	u, _ := auth.FromContext(r.Context())
	now := time.Now().Unix()
	var updatedBy any
	if u != nil {
		updatedBy = u.ID
	}

	note := fmt.Sprintf("restore from #%d", id)
	if err := writeContentWithHistory(r.Context(), h.DB, []byte(doc), updatedBy, now, note); err != nil {
		h.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	h.Auditor.Record(r.Context(), "content.restore", strconv.FormatInt(id, 10), nil, clientIP(r), r.UserAgent())
	h.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "restored_from": id})
}
