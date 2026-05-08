package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/images"
	"github.com/763cadets/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const (
	maxUploadProd = 8 << 20  // 8 MiB
	maxUploadDev  = 32 << 20 // 32 MiB
)

type ImagesDeps struct {
	*Server
	DB      *sql.DB
	Store   *images.Store
	Auditor *middleware.Auditor
}

func (i *ImagesDeps) maxUpload() int64 {
	if i.DevMode {
		return maxUploadDev
	}
	return maxUploadProd
}

type clientImage struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	ThumbURL string `json:"thumbUrl"`
	Mime     string `json:"mime"`
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	AltEn    string `json:"alt_en"`
	AltFr    string `json:"alt_fr"`
	Bytes    int64  `json:"bytes"`
}

func toURL(sha, ext string, width int) string {
	if width == 0 {
		return "/api/images/file/" + sha + "." + ext
	}
	return "/api/images/file/" + sha + "-" + strconv.Itoa(width) + "." + ext
}

// thumbURL returns a thumbnail URL when the source is wider than the target,
// otherwise falls back to the original URL (we don't upscale).
func thumbURL(sha, ext string, sourceWidth, targetWidth int) string {
	if sourceWidth > targetWidth {
		return toURL(sha, ext, targetWidth)
	}
	return toURL(sha, ext, 0)
}

func (i *ImagesDeps) Upload(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, i.maxUpload())
	if err := r.ParseMultipartForm(i.maxUpload()); err != nil {
		i.Error(w, r, http.StatusRequestEntityTooLarge, "too_large", err)
		return
	}
	file, fh, err := r.FormFile("file")
	if err != nil {
		i.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return
	}
	defer file.Close()
	declared := fh.Header.Get("Content-Type")

	body, err := images.ReadAllCapped(file, i.maxUpload())
	if err != nil {
		i.Error(w, r, http.StatusBadRequest, "bad_request", err)
		return
	}
	if int64(len(body)) > i.maxUpload() {
		i.Error(w, r, http.StatusRequestEntityTooLarge, "too_large", nil)
		return
	}

	dec, err := images.Validate(declared, body)
	if err != nil {
		switch {
		case errors.Is(err, images.ErrUnsupportedType):
			i.Error(w, r, http.StatusUnsupportedMediaType, "unsupported_type", err)
		case errors.Is(err, images.ErrTooLarge):
			i.Error(w, r, http.StatusRequestEntityTooLarge, "too_large", err)
		case errors.Is(err, images.ErrTooSmall):
			i.Error(w, r, http.StatusBadRequest, "too_small", err)
		default:
			i.Error(w, r, http.StatusBadRequest, "unreadable", err)
		}
		return
	}
	encoded, err := images.Encode(dec)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	sha := images.Sha256Hex(encoded)
	name := sha + "." + dec.Ext

	// Dedupe.
	var existingID, existingMime, existingExt string
	var existingW, existingH int
	var existingBytes int64
	err = i.DB.QueryRowContext(r.Context(),
		`SELECT id, mime, ext, width, height, bytes FROM images WHERE sha256 = ?`, sha,
	).Scan(&existingID, &existingMime, &existingExt, &existingW, &existingH, &existingBytes)
	if err == nil {
		i.WriteJSON(w, http.StatusOK, map[string]any{
			"ok": true,
			"image": clientImage{
				ID:       existingID,
				URL:      toURL(sha, existingExt, 0),
				ThumbURL: thumbURL(sha, existingExt, existingW, 800),
				Mime:     existingMime,
				Width:    existingW,
				Height:   existingH,
				Bytes:    existingBytes,
			},
		})
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}

	// Store original.
	if err := i.Store.Write(sha, name, encoded); err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	// Thumbnails.
	for _, wpx := range []int{800, 1600} {
		thumb, _, _, terr := images.Thumbnail(dec, wpx)
		if terr != nil || thumb == nil {
			continue
		}
		_ = i.Store.Write(sha, sha+"-"+strconv.Itoa(wpx)+"."+dec.Ext, thumb)
	}

	altEn := r.FormValue("alt_en")
	altFr := r.FormValue("alt_fr")

	id := uuid.NewString()
	now := time.Now().Unix()
	var uploadedBy any
	if u, ok := auth.FromContext(r.Context()); ok && u != nil {
		uploadedBy = u.ID
	}
	_, err = i.DB.ExecContext(r.Context(), `
		INSERT INTO images (id, sha256, mime, ext, width, height, bytes,
			alt_text_en, alt_text_fr, uploaded_by, uploaded_at, last_used_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		id, sha, dec.Mime, dec.Ext, dec.Width, dec.Height, len(encoded),
		altEn, altFr, uploadedBy, now, now,
	)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	i.Auditor.Record(r.Context(), "image.upload", id, map[string]any{"sha256": sha}, clientIP(r), r.UserAgent())
	i.WriteJSON(w, http.StatusCreated, map[string]any{
		"ok": true,
		"image": clientImage{
			ID:       id,
			URL:      toURL(sha, dec.Ext, 0),
			ThumbURL: thumbURL(sha, dec.Ext, dec.Width, 800),
			Mime:     dec.Mime,
			Width:    dec.Width,
			Height:   dec.Height,
			AltEn:    altEn,
			AltFr:    altFr,
			Bytes:    int64(len(encoded)),
		},
	})
}

func (i *ImagesDeps) List(w http.ResponseWriter, r *http.Request) {
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if offset < 0 {
		offset = 0
	}
	rows, err := i.DB.QueryContext(r.Context(), `
		SELECT id, sha256, mime, ext, width, height, bytes, alt_text_en, alt_text_fr, uploaded_at
		FROM images
		ORDER BY uploaded_at DESC
		LIMIT ? OFFSET ?`, limit, offset)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	defer rows.Close()
	out := make([]map[string]any, 0, limit)
	for rows.Next() {
		var (
			id, sha, mime, ext, altEn, altFr string
			width, height                    int
			bytes, uploadedAt                int64
		)
		if err := rows.Scan(&id, &sha, &mime, &ext, &width, &height, &bytes, &altEn, &altFr, &uploadedAt); err != nil {
			i.Error(w, r, http.StatusInternalServerError, "internal", err)
			return
		}
		out = append(out, map[string]any{
			"id":         id,
			"url":        toURL(sha, ext, 0),
			"thumbUrl":   thumbURL(sha, ext, width, 800),
			"mime":       mime,
			"width":      width,
			"height":     height,
			"bytes":      bytes,
			"alt_en":     altEn,
			"alt_fr":     altFr,
			"uploadedAt": uploadedAt,
		})
	}
	i.WriteJSON(w, http.StatusOK, map[string]any{"ok": true, "items": out})
}

type patchImageReq struct {
	AltEn *string `json:"alt_en"`
	AltFr *string `json:"alt_fr"`
}

func (i *ImagesDeps) Patch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		i.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	var in patchImageReq
	if !i.DecodeJSON(w, r, &in, 8*1024) {
		return
	}
	sets := []string{}
	args := []any{}
	if in.AltEn != nil {
		sets = append(sets, "alt_text_en = ?")
		args = append(args, *in.AltEn)
	}
	if in.AltFr != nil {
		sets = append(sets, "alt_text_fr = ?")
		args = append(args, *in.AltFr)
	}
	if len(sets) == 0 {
		i.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
		return
	}
	args = append(args, id)
	q := "UPDATE images SET " + joinSets(sets) + " WHERE id = ?"
	res, err := i.DB.ExecContext(r.Context(), q, args...)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		i.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	i.Auditor.Record(r.Context(), "image.update", id, nil, clientIP(r), r.UserAgent())
	i.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (i *ImagesDeps) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		i.Error(w, r, http.StatusBadRequest, "bad_request", nil)
		return
	}
	var inUse int
	err := i.DB.QueryRowContext(r.Context(),
		`SELECT COUNT(*) FROM posts WHERE image_id = ?`, id).Scan(&inUse)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	if inUse > 0 {
		i.Error(w, r, http.StatusConflict, "in_use", nil)
		return
	}
	res, err := i.DB.ExecContext(r.Context(), `DELETE FROM images WHERE id = ?`, id)
	if err != nil {
		i.Error(w, r, http.StatusInternalServerError, "internal", err)
		return
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		i.Error(w, r, http.StatusNotFound, "not_found", nil)
		return
	}
	// Disk files are left in place for safety; a separate GC sweeps orphans.
	i.Auditor.Record(r.Context(), "image.delete", id, nil, clientIP(r), r.UserAgent())
	i.WriteJSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Serve handles GET /api/images/file/{name}. The filename is regex-validated
// before any disk access via images.Store.Path.
var fileNameRe = regexp.MustCompile(`^([a-f0-9]{64})(-(800|1600))?\.(jpg|png|webp)$`)

func (i *ImagesDeps) Serve(w http.ResponseWriter, r *http.Request) {
	name := chi.URLParam(r, "name")
	m := fileNameRe.FindStringSubmatch(name)
	if m == nil {
		http.NotFound(w, r)
		return
	}
	sha := m[1]
	path, err := i.Store.Path(sha, name)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	w.Header().Set("ETag", `"`+sha+`"`)
	if match := r.Header.Get("If-None-Match"); match != "" && match == `"`+sha+`"` {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	switch filepath.Ext(name) {
	case ".jpg":
		w.Header().Set("Content-Type", "image/jpeg")
	case ".png":
		w.Header().Set("Content-Type", "image/png")
	case ".webp":
		w.Header().Set("Content-Type", "image/webp")
	}
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Disposition", "inline")
	http.ServeFile(w, r, path)
}

func joinSets(sets []string) string {
	out := ""
	for i, s := range sets {
		if i > 0 {
			out += ", "
		}
		out += s
	}
	return out
}
