package facebook

import (
	"strings"
	"time"
)

// FirstSentence returns the first 80 chars or the first sentence-ending
// punctuation, whichever comes first. Used as a fallback post title.
func FirstSentence(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	// Stop at first newline, period, or 80 chars.
	for i, r := range s {
		if r == '\n' || r == '.' || r == '?' || r == '!' {
			return strings.TrimSpace(s[:i])
		}
		if i >= 80 {
			return strings.TrimSpace(s[:80]) + "…"
		}
	}
	return s
}

// ParseGraphTime accepts either RFC3339 ("2025-10-22T18:00:00+0000") or RFC3339Nano.
// Falls back to time.Now if unparseable.
func ParseGraphTime(s string) time.Time {
	for _, layout := range []string{"2006-01-02T15:04:05-0700", time.RFC3339, time.RFC3339Nano} {
		if t, err := time.Parse(layout, s); err == nil {
			return t
		}
	}
	return time.Now()
}
