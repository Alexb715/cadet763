// Package imagegc periodically deletes images that haven't been referenced
// from the editable content document or any post for a configurable number
// of days. Images that are currently referenced have their last_used_at bumped
// on every tick so they're never deleted while in use.
package imagegc

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"sync"
	"time"
)

type Runner struct {
	DB         *sql.DB
	UploadsDir string
	Log        *slog.Logger
	StaleAfter time.Duration
	Interval   time.Duration

	mu sync.Mutex
}

func New(db *sql.DB, uploadsDir string, log *slog.Logger, staleAfter, interval time.Duration) *Runner {
	return &Runner{DB: db, UploadsDir: uploadsDir, Log: log, StaleAfter: staleAfter, Interval: interval}
}

// Run blocks until ctx is cancelled. Sweeps every Interval, plus an initial
// fire 30s after start so we surface config issues quickly.
func (r *Runner) Run(ctx context.Context) {
	t := time.NewTimer(30 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := r.Sweep(ctx); err != nil {
				r.Log.WarnContext(ctx, "image gc sweep failed", slog.String("err", err.Error()))
			}
			t.Reset(r.Interval)
		}
	}
}

var imageURLRe = regexp.MustCompile(`/api/images/file/([a-f0-9]{64})`)

// Sweep performs one mark-and-sweep pass. Safe to call concurrently with
// Run — they share a mutex.
func (r *Runner) Sweep(ctx context.Context) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now().Unix()
	cutoff := now - int64(r.StaleAfter.Seconds())

	// 1. Collect referenced sha256s from the content document.
	var contentDoc string
	err := r.DB.QueryRowContext(ctx, `SELECT document FROM content WHERE id = 1`).Scan(&contentDoc)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	referencedShas := map[string]struct{}{}
	for _, m := range imageURLRe.FindAllStringSubmatch(contentDoc, -1) {
		referencedShas[m[1]] = struct{}{}
	}

	// 2. Collect referenced image_ids from posts.
	referencedIDs := map[string]struct{}{}
	rows, err := r.DB.QueryContext(ctx, `SELECT image_id FROM posts WHERE image_id IS NOT NULL`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		referencedIDs[id] = struct{}{}
	}
	rows.Close()

	// 3. Resolve referenced shas → IDs and union.
	if len(referencedShas) > 0 {
		shaList := make([]any, 0, len(referencedShas))
		placeholders := ""
		for sha := range referencedShas {
			if placeholders != "" {
				placeholders += ","
			}
			placeholders += "?"
			shaList = append(shaList, sha)
		}
		q := `SELECT id FROM images WHERE sha256 IN (` + placeholders + `)`
		rows, err := r.DB.QueryContext(ctx, q, shaList...)
		if err != nil {
			return err
		}
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err != nil {
				rows.Close()
				return err
			}
			referencedIDs[id] = struct{}{}
		}
		rows.Close()
	}

	// 4. Bump last_used_at on every referenced image.
	if len(referencedIDs) > 0 {
		idList := make([]any, 0, len(referencedIDs)+1)
		idList = append(idList, now)
		placeholders := ""
		for id := range referencedIDs {
			if placeholders != "" {
				placeholders += ","
			}
			placeholders += "?"
			idList = append(idList, id)
		}
		_, err := r.DB.ExecContext(ctx,
			`UPDATE images SET last_used_at = ? WHERE id IN (`+placeholders+`)`, idList...)
		if err != nil {
			return err
		}
	}

	// 5. Find stale rows.
	stale, err := r.DB.QueryContext(ctx,
		`SELECT id, sha256, ext FROM images WHERE last_used_at < ?`, cutoff)
	if err != nil {
		return err
	}
	type victim struct{ id, sha, ext string }
	var victims []victim
	for stale.Next() {
		var v victim
		if err := stale.Scan(&v.id, &v.sha, &v.ext); err != nil {
			stale.Close()
			return err
		}
		victims = append(victims, v)
	}
	stale.Close()

	// 6. Delete each: row first (so a crash mid-loop leaves the FS slightly
	// over-budget rather than orphaning rows pointing at missing files).
	deleted := 0
	for _, v := range victims {
		// Skip anything still referenced (race: someone PUT content between
		// our read in step 1 and now). FK-safe — referenced posts.image_id
		// would prevent the delete anyway via referential check, but we'd
		// rather skip cleanly.
		if _, isRef := referencedIDs[v.id]; isRef {
			continue
		}
		if _, err := r.DB.ExecContext(ctx, `DELETE FROM images WHERE id = ?`, v.id); err != nil {
			r.Log.WarnContext(ctx, "image gc delete row failed",
				slog.String("id", v.id), slog.String("err", err.Error()))
			continue
		}
		r.removeFiles(v.sha, v.ext)
		deleted++
	}

	if deleted > 0 {
		r.Log.InfoContext(ctx, "image gc swept", slog.Int("deleted", deleted))
		_, _ = r.DB.ExecContext(ctx, `
			INSERT INTO audit_log (at, action, details)
			VALUES (?, 'image.gc', ?)`,
			now, `{"deleted":`+strconv.Itoa(deleted)+`}`)
	}
	return nil
}

func (r *Runner) removeFiles(sha, ext string) {
	if len(sha) < 2 {
		return
	}
	dir := filepath.Join(r.UploadsDir, sha[:2])
	for _, name := range []string{
		sha + "." + ext,
		sha + "-800." + ext,
		sha + "-1600." + ext,
	} {
		path := filepath.Join(dir, name)
		if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
			r.Log.Warn("image gc remove file failed",
				slog.String("path", path), slog.String("err", err.Error()))
		}
	}
}
