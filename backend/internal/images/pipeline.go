package images

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"net/http"

	_ "image/jpeg"
	_ "image/png"

	"golang.org/x/image/draw"
	xwebp "golang.org/x/image/webp"
)

const (
	MaxDecodedDim   = 8000
	MaxDecodedPixel = 50 * 1000 * 1000 // 50 megapixels
	MinBytes        = 1024
)

var (
	ErrUnsupportedType = errors.New("unsupported image type")
	ErrUnreadable      = errors.New("unreadable image")
	ErrTooSmall        = errors.New("image too small")
	ErrTooLarge        = errors.New("image too large")
)

type Decoded struct {
	Image  image.Image
	Mime   string // image/jpeg | image/png | image/webp -> always re-encoded; webp is converted to JPEG
	Ext    string // jpg | png | webp (post-conversion)
	Width  int
	Height int
}

// Validate inspects the magic bytes and form-declared content type, then
// decodes through stdlib (or x/image/webp). Returns the decoded image and the
// final mime/ext we'll re-encode into.
func Validate(declared string, raw []byte) (*Decoded, error) {
	if len(raw) < MinBytes {
		return nil, ErrTooSmall
	}
	sniffed := http.DetectContentType(raw[:min(512, len(raw))])
	if !isAllowedMime(sniffed) || !isAllowedMime(declared) {
		return nil, ErrUnsupportedType
	}
	if !mimeMatch(declared, sniffed) {
		return nil, ErrUnsupportedType
	}
	var img image.Image
	var err error
	var outMime, outExt string
	switch sniffed {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(raw))
		outMime, outExt = "image/jpeg", "jpg"
	case "image/png":
		img, err = png.Decode(bytes.NewReader(raw))
		outMime, outExt = "image/png", "png"
	case "image/webp":
		img, err = xwebp.Decode(bytes.NewReader(raw))
		// stdlib has no WebP encoder; we down-convert WebP uploads to JPEG.
		outMime, outExt = "image/jpeg", "jpg"
	default:
		return nil, ErrUnsupportedType
	}
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrUnreadable, err)
	}
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= 0 || h <= 0 {
		return nil, ErrUnreadable
	}
	if w > MaxDecodedDim || h > MaxDecodedDim || w*h > MaxDecodedPixel {
		return nil, ErrTooLarge
	}
	return &Decoded{Image: img, Mime: outMime, Ext: outExt, Width: w, Height: h}, nil
}

// Encode re-encodes the decoded image back into bytes, stripping any metadata
// that was attached to the original (EXIF, ICC, embedded scripts).
func Encode(d *Decoded) ([]byte, error) {
	var buf bytes.Buffer
	switch d.Mime {
	case "image/jpeg":
		if err := jpeg.Encode(&buf, d.Image, &jpeg.Options{Quality: 88}); err != nil {
			return nil, err
		}
	case "image/png":
		enc := &png.Encoder{CompressionLevel: png.BestCompression}
		if err := enc.Encode(&buf, d.Image); err != nil {
			return nil, err
		}
	default:
		return nil, ErrUnsupportedType
	}
	return buf.Bytes(), nil
}

// Sha256Hex returns the hex sha256 of b.
func Sha256Hex(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

// Thumbnail returns a re-encoded thumbnail at the given target width,
// preserving aspect ratio. Returns nil if target is >= source width.
func Thumbnail(d *Decoded, targetWidth int) ([]byte, int, int, error) {
	if targetWidth >= d.Width {
		return nil, 0, 0, nil
	}
	scale := float64(targetWidth) / float64(d.Width)
	th := int(float64(d.Height) * scale)
	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, th))
	draw.CatmullRom.Scale(dst, dst.Rect, d.Image, d.Image.Bounds(), draw.Over, nil)
	thumbDecoded := &Decoded{Image: dst, Mime: d.Mime, Ext: d.Ext, Width: targetWidth, Height: th}
	out, err := Encode(thumbDecoded)
	if err != nil {
		return nil, 0, 0, err
	}
	return out, targetWidth, th, nil
}

func isAllowedMime(m string) bool {
	switch m {
	case "image/jpeg", "image/png", "image/webp":
		return true
	}
	return false
}

func mimeMatch(declared, sniffed string) bool {
	if declared == sniffed {
		return true
	}
	// Some browsers send `image/jpg` instead of `image/jpeg`.
	if declared == "image/jpg" && sniffed == "image/jpeg" {
		return true
	}
	return false
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// ReadAllCapped reads up to maxBytes+1 from r so callers can detect overflow.
func ReadAllCapped(r io.Reader, maxBytes int64) ([]byte, error) {
	return io.ReadAll(io.LimitReader(r, maxBytes+1))
}
