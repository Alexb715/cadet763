package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/763cadets/backend/internal/facebook"
	"github.com/763cadets/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
)

type PostsDeps struct {
	*Server
	DB           *sql.DB
	Poller       *facebook.Poller
	PublicBaseURL string // used to absolutize image URLs in responses
	Auditor      *middleware.Auditor
}

type clientPost struct {
	ID        string         `json:"id"`
	Cat       string         `json:"cat"`
	Date      string         `json:"date"`
	Likes     int            `json:"likes"`
	Comments  int            `json:"comments"`
	Shares    int            `json:"shares"`
	Image     *string        `json:"image"`
	Title     map[string]any `json:"title"`
	Body      map[string]any `json:"body"`
	Permalink string         `json:"permalink"`
}

func (p *PostsDeps) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	cat := q.Get("category")
	limit, _ := strconv.Atoi(q.Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(q.Get("offset"))
	if offset < 0 {
		offset = 0
	}

	args := []any{}
	where := []string{"hidden_at IS NULL"}
	if cat != "" {
		where = append(where, "category = ?")
		args = append(args, cat)
	}
	args = append(args, limit, offset)

	query := `
		SELECT p.id, p.category, p.posted_at,
			p.title_en, p.title_fr, p.body_en, p.body_fr,
			p.image_id, p.image_external,
			p.likes, p.comments, p.shares, p.permalink,
			i.sha256, i.ext
		FROM posts p
		LEFT JOIN images i ON i.id = p.image_id
		WHERE ` + strings.Join(where, " AND ") + `
		ORDER BY p.posted_at DESC
		LIMIT ? OFFSET ?`
	rows, err := p.DB.QueryContext(r.Context(), query, args...)
	if err != nil {
		p.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	defer rows.Close()

	out := make([]clientPost, 0, limit)
	for rows.Next() {
		var (
			id, cat, titleEn, titleFr, bodyEn, bodyFr string
			postedAt                                  int64
			imageID, imageExt                          sql.NullString
			imageSha                                   sql.NullString
			imageExternal                              sql.NullString
			likes, comments, shares                   int
			permalink                                 sql.NullString
		)
		if err := rows.Scan(&id, &cat, &postedAt,
			&titleEn, &titleFr, &bodyEn, &bodyFr,
			&imageID, &imageExternal,
			&likes, &comments, &shares, &permalink,
			&imageSha, &imageExt); err != nil {
			p.Error(w, r, http.StatusInternalServerError, "internal", err)
			return
		}
		var imgURL *string
		if imageSha.Valid && imageExt.Valid {
			u := p.PublicBaseURL + "/api/images/file/" + imageSha.String + "-800." + imageExt.String
			imgURL = &u
		} else if imageExternal.Valid && imageExternal.String != "" {
			u := imageExternal.String
			imgURL = &u
		}
		out = append(out, clientPost{
			ID:        id,
			Cat:       cat,
			Date:      time.Unix(postedAt, 0).UTC().Format("2006-01-02"),
			Likes:     likes,
			Comments:  comments,
			Shares:    shares,
			Image:     imgURL,
			Title:     map[string]any{"en": titleEn, "fr": titleFr},
			Body:      map[string]any{"en": bodyEn, "fr": bodyFr},
			Permalink: permalink.String,
		})
	}
	w.Header().Set("Cache-Control", "public, max-age=300")
	p.WriteJSON(w, http.StatusOK, out)
}

func (p *PostsDeps) Refresh(w http.ResponseWriter, r *http.Request) {
	if !p.Poller.Client.Configured() {
		p.Error(w, r, http.StatusBadRequest, "facebook_not_configured", nil)
		return
	}
	p.Poller.Trigger()
	p.Auditor.Record(r.Context(), "posts.refresh", "", nil, clientIP(r), r.UserAgent())
	p.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "started": true})
}

type patchPostReq struct {
	Category *string         `json:"category"`
	Title    *map[string]any `json:"title"`
	Body     *map[string]any `json:"body"`
	Hidden   *bool           `json:"hidden"`
	ImageID  *string         `json:"image_id"`
}

func (p *PostsDeps) Patch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		p.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	var in patchPostReq
	if !p.DecodeJSON(w, r, &in, 64*1024) {
		return
	}

	sets := []string{"locally_edited = 1", "updated_at = ?"}
	args := []any{time.Now().Unix()}

	if in.Category != nil {
		switch *in.Category {
		case "events", "training", "community":
		default:
			p.Error(w, r, http.StatusBadRequest, "bad_category", nil)
			return
		}
		sets = append(sets, "category = ?")
		args = append(args, *in.Category)
	}
	if in.Title != nil {
		en, _ := (*in.Title)["en"].(string)
		fr, _ := (*in.Title)["fr"].(string)
		sets = append(sets, "title_en = ?", "title_fr = ?")
		args = append(args, en, fr)
	}
	if in.Body != nil {
		en, _ := (*in.Body)["en"].(string)
		fr, _ := (*in.Body)["fr"].(string)
		sets = append(sets, "body_en = ?", "body_fr = ?")
		args = append(args, en, fr)
	}
	if in.Hidden != nil {
		if *in.Hidden {
			sets = append(sets, "hidden_at = ?")
			args = append(args, time.Now().Unix())
		} else {
			sets = append(sets, "hidden_at = NULL")
		}
	}
	if in.ImageID != nil {
		if *in.ImageID == "" {
			sets = append(sets, "image_id = NULL")
		} else {
			sets = append(sets, "image_id = ?")
			args = append(args, *in.ImageID)
		}
	}
	args = append(args, id)
	q := "UPDATE posts SET " + strings.Join(sets, ", ") + " WHERE id = ?"
	res, err := p.DB.ExecContext(r.Context(), q, args...)
	if err != nil {
		p.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		p.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	p.Auditor.Record(r.Context(), "posts.update", id, nil, clientIP(r), r.UserAgent())
	p.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

