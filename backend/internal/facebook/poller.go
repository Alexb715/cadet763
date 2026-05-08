package facebook

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"time"

	"github.com/763cadets/backend/internal/images"
	"github.com/google/uuid"
)

type Poller struct {
	Client   *Client
	DB       *sql.DB
	Store    *images.Store
	Log      *slog.Logger
	Interval time.Duration

	mu            sync.Mutex
	trigger       chan struct{}
	lastFetchedAt time.Time
}

func NewPoller(c *Client, db *sql.DB, store *images.Store, log *slog.Logger, interval time.Duration) *Poller {
	return &Poller{
		Client:   c,
		DB:       db,
		Store:    store,
		Log:      log,
		Interval: interval,
		trigger:  make(chan struct{}, 1),
	}
}

// Trigger asks the poller to run an immediate refresh on its next loop tick.
// Non-blocking; if a refresh is already pending, this is a no-op.
func (p *Poller) Trigger() {
	select {
	case p.trigger <- struct{}{}:
	default:
	}
}

func (p *Poller) LastFetchedAt() time.Time {
	p.mu.Lock()
	defer p.mu.Unlock()
	return p.lastFetchedAt
}

// Run blocks until ctx is cancelled. Safe to call once per process.
func (p *Poller) Run(ctx context.Context) {
	if !p.Client.Configured() {
		p.Log.Info("facebook poller dormant (FB_PAGE_TOKEN not set)")
		<-ctx.Done()
		return
	}
	// First fetch after a 5s grace so the server is fully up.
	t := time.NewTimer(5 * time.Second)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			p.fetchOnce(ctx)
			t.Reset(p.Interval)
		case <-p.trigger:
			p.fetchOnce(ctx)
			if !t.Stop() {
				select {
				case <-t.C:
				default:
				}
			}
			t.Reset(p.Interval)
		}
	}
}

func (p *Poller) fetchOnce(ctx context.Context) {
	p.mu.Lock()
	defer p.mu.Unlock()

	// 7-day overlap so back-dated edits get picked up.
	since := time.Now().Add(-7 * 24 * time.Hour).Unix()
	resp, err := p.Client.FetchPage(ctx, since, 25)
	if err != nil {
		p.Log.WarnContext(ctx, "facebook fetch failed", slog.String("err", err.Error()))
		return
	}
	upserted := 0
	for _, gp := range resp.Data {
		if err := p.upsertPost(ctx, gp); err != nil {
			p.Log.WarnContext(ctx, "facebook upsert failed",
				slog.String("fb_post_id", gp.ID),
				slog.String("err", err.Error()))
			continue
		}
		upserted++
	}
	p.lastFetchedAt = time.Now()
	p.Log.InfoContext(ctx, "facebook fetch complete",
		slog.Int("posts_seen", len(resp.Data)),
		slog.Int("upserted", upserted))
}

func (p *Poller) upsertPost(ctx context.Context, gp GraphPost) error {
	now := time.Now().Unix()
	postedAt := ParseGraphTime(gp.CreatedTime).Unix()
	title := FirstSentence(gp.Message)

	imageID, imageExternal, err := p.resolveImage(ctx, gp.FullPicture)
	if err != nil {
		// Don't abort the upsert on image failure — counters and text are still useful.
		p.Log.WarnContext(ctx, "facebook image mirror failed",
			slog.String("fb_post_id", gp.ID),
			slog.String("err", err.Error()))
	}

	rawJSON, _ := json.Marshal(gp)

	// Find existing row.
	var existingID string
	var locallyEdited int
	err = p.DB.QueryRowContext(ctx,
		`SELECT id, locally_edited FROM posts WHERE fb_post_id = ?`, gp.ID,
	).Scan(&existingID, &locallyEdited)

	if errors.Is(err, sql.ErrNoRows) {
		_, err = p.DB.ExecContext(ctx, `
			INSERT INTO posts (id, fb_post_id, source, category, posted_at,
				title_en, title_fr, body_en, body_fr,
				image_id, image_external, likes, comments, shares,
				permalink, raw_json, locally_edited, created_at, updated_at)
			VALUES (?, ?, 'facebook', 'community', ?,
				?, ?, ?, ?,
				?, ?, ?, ?, ?,
				?, ?, 0, ?, ?)`,
			uuid.NewString(), gp.ID, postedAt,
			title, title, gp.Message, gp.Message,
			nullOrString(imageID), nullOrString(imageExternal),
			gp.Reactions.Summary.TotalCount,
			gp.Comments.Summary.TotalCount,
			gp.Shares.Count,
			gp.PermalinkURL, string(rawJSON),
			now, now,
		)
		return err
	}
	if err != nil {
		return err
	}

	// Existing: always refresh counters. Only refresh title/body if not locally edited.
	if locallyEdited == 0 {
		_, err = p.DB.ExecContext(ctx, `
			UPDATE posts SET
				title_en = ?, title_fr = ?, body_en = ?, body_fr = ?,
				image_id = COALESCE(?, image_id),
				image_external = COALESCE(?, image_external),
				likes = ?, comments = ?, shares = ?,
				permalink = ?, raw_json = ?, updated_at = ?
			WHERE id = ?`,
			title, title, gp.Message, gp.Message,
			nullOrString(imageID), nullOrString(imageExternal),
			gp.Reactions.Summary.TotalCount, gp.Comments.Summary.TotalCount, gp.Shares.Count,
			gp.PermalinkURL, string(rawJSON), now,
			existingID,
		)
	} else {
		_, err = p.DB.ExecContext(ctx, `
			UPDATE posts SET
				likes = ?, comments = ?, shares = ?,
				permalink = ?, raw_json = ?, updated_at = ?
			WHERE id = ?`,
			gp.Reactions.Summary.TotalCount, gp.Comments.Summary.TotalCount, gp.Shares.Count,
			gp.PermalinkURL, string(rawJSON), now,
			existingID,
		)
	}
	return err
}

// resolveImage either mirrors the FB CDN image into the local store and returns
// its image_id, or (if mirroring is disabled) returns the external URL only.
func (p *Poller) resolveImage(ctx context.Context, cdnURL string) (imageID string, externalURL string, err error) {
	if cdnURL == "" {
		return "", "", nil
	}
	if !p.Client.MirrorImages {
		return "", cdnURL, nil
	}
	body, declared, err := p.Client.DownloadImage(ctx, cdnURL)
	if err != nil {
		return "", cdnURL, err
	}
	dec, err := images.Validate(declared, body)
	if err != nil {
		return "", cdnURL, err
	}
	encoded, err := images.Encode(dec)
	if err != nil {
		return "", cdnURL, err
	}
	sha := images.Sha256Hex(encoded)
	name := sha + "." + dec.Ext

	// Dedupe: if a row with this sha already exists, reuse it.
	var existingID string
	err = p.DB.QueryRowContext(ctx, `SELECT id FROM images WHERE sha256 = ?`, sha).Scan(&existingID)
	if err == nil {
		return existingID, "", nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return "", cdnURL, err
	}

	if err := p.Store.Write(sha, name, encoded); err != nil {
		return "", cdnURL, err
	}
	for _, w := range []int{800, 1600} {
		thumb, _, _, err := images.Thumbnail(dec, w)
		if err != nil || thumb == nil {
			continue
		}
		_ = p.Store.Write(sha, sha+"-"+itoa(w)+"."+dec.Ext, thumb)
	}

	id := uuid.NewString()
	now := time.Now().Unix()
	_, err = p.DB.ExecContext(ctx, `
		INSERT INTO images (id, sha256, mime, ext, width, height, bytes, uploaded_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		id, sha, dec.Mime, dec.Ext, dec.Width, dec.Height, len(encoded), now,
	)
	if err != nil {
		return "", cdnURL, err
	}
	return id, "", nil
}

func nullOrString(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func itoa(i int) string {
	switch i {
	case 800:
		return "800"
	case 1600:
		return "1600"
	default:
		return ""
	}
}
