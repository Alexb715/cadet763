package handlers

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/middleware"
	"github.com/763cadets/backend/internal/models"
)

const ContentHistoryRetention = 50

type ContentDeps struct {
	*Server
	DB      *sql.DB
	Auditor *middleware.Auditor
}

func (c *ContentDeps) Get(w http.ResponseWriter, r *http.Request) {
	var doc string
	err := c.DB.QueryRowContext(r.Context(),
		`SELECT document FROM content WHERE id = 1`,
	).Scan(&doc)
	if errors.Is(err, sql.ErrNoRows) {
		w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write([]byte(`{}`))
		return
	}
	if err != nil {
		c.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write([]byte(doc))
}

func (c *ContentDeps) Put(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, models.MaxContentBytes+1024)
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		c.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return
	}
	if err := models.ValidateContent(raw); err != nil {
		c.Error(w, r, http.StatusBadRequest, "invalid_content", err)
		return
	}
	var v any
	if err := json.Unmarshal(raw, &v); err != nil {
		c.Error(w, r, http.StatusBadRequest, "invalid_content", err)
		return
	}
	canon, err := json.Marshal(v)
	if err != nil {
		c.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	u, _ := auth.FromContext(r.Context())
	now := time.Now().Unix()
	var updatedBy any
	if u != nil {
		updatedBy = u.ID
	}

	if err := writeContentWithHistory(r.Context(), c.DB, canon, updatedBy, now, ""); err != nil {
		c.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	c.Auditor.Record(r.Context(), "content.update", "", nil, clientIP(r), r.UserAgent())
	c.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (c *ContentDeps) Delete(w http.ResponseWriter, r *http.Request) {
	_, err := c.DB.ExecContext(r.Context(), `DELETE FROM content WHERE id = 1`)
	if err != nil {
		c.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	c.Auditor.Record(r.Context(), "content.reset", "", nil, clientIP(r), r.UserAgent())
	c.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// writeContentWithHistory upserts the canonical content document and, when the
// document hash differs from the most recent history row, appends a new history
// row. Old history rows beyond ContentHistoryRetention are pruned afterward.
// Used by both PUT /content and POST /content/restore/:id.
func writeContentWithHistory(ctx context.Context, db *sql.DB, canon []byte, updatedBy any, now int64, note string) error {
	hash := hashHex(canon)

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var lastHash string
	err = tx.QueryRowContext(ctx,
		`SELECT doc_hash FROM content_history ORDER BY id DESC LIMIT 1`,
	).Scan(&lastHash)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	if lastHash != hash {
		var noteVal any
		if note != "" {
			noteVal = note
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO content_history (document, doc_hash, created_at, updated_by, note)
			VALUES (?, ?, ?, ?, ?)`,
			string(canon), hash, now, updatedBy, noteVal,
		); err != nil {
			return err
		}
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO content (id, document, updated_at, updated_by) VALUES (1, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET document = excluded.document,
			updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
		string(canon), now, updatedBy,
	); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		DELETE FROM content_history
		WHERE id NOT IN (
			SELECT id FROM content_history ORDER BY id DESC LIMIT ?
		)`, ContentHistoryRetention,
	); err != nil {
		return err
	}

	return tx.Commit()
}

func hashHex(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
