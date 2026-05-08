package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

type Env string

const (
	EnvProduction  Env = "production"
	EnvDevelopment Env = "development"
)

type Config struct {
	AppEnv          Env
	ListenAddr      string
	DBPath          string
	UploadsDir      string
	FrontendOrigin  []string
	TrustedProxies  []string
	SessionTTL      time.Duration
	FBPageID        string
	FBPageToken     string
	FBMirrorImages  bool
	LogLevel        slog.Level
	PublicBaseURL   string // optional, used to build absolute image URLs in /api/posts
	BootstrapUser   string
	BootstrapPass   string
	BootstrapName   string
	BootstrapForce  bool
	ImageGCDays     int
	ImageGCInterval time.Duration
}

func (c Config) IsDev() bool { return c.AppEnv == EnvDevelopment }

func Load() (*Config, error) {
	c := &Config{
		AppEnv:         Env(getenv("APP_ENV", "production")),
		ListenAddr:     getenv("LISTEN_ADDR", ":8080"),
		DBPath:         getenv("DB_PATH", "/data/app.db"),
		UploadsDir:     getenv("UPLOADS_DIR", "/data/uploads"),
		FBPageID:       os.Getenv("FB_PAGE_ID"),
		FBPageToken:    os.Getenv("FB_PAGE_TOKEN"),
		FBMirrorImages: parseBool(getenv("FB_MIRROR_IMAGES", "true")),
		PublicBaseURL:  os.Getenv("PUBLIC_BASE_URL"),
		BootstrapUser:  os.Getenv("ADMIN_BOOTSTRAP_USER"),
		BootstrapPass:  os.Getenv("ADMIN_BOOTSTRAP_PASS"),
		BootstrapName:  os.Getenv("ADMIN_BOOTSTRAP_NAME"),
	}

	if c.AppEnv != EnvProduction && c.AppEnv != EnvDevelopment {
		return nil, fmt.Errorf("APP_ENV must be 'production' or 'development', got %q", c.AppEnv)
	}

	c.FrontendOrigin = splitList(getenv("FRONTEND_ORIGIN", ""))
	if !c.IsDev() && len(c.FrontendOrigin) == 0 {
		return nil, fmt.Errorf("FRONTEND_ORIGIN is required in production")
	}
	c.TrustedProxies = splitList(os.Getenv("TRUSTED_PROXIES"))

	ttlStr := getenv("SESSION_TTL", "720h")
	ttl, err := time.ParseDuration(ttlStr)
	if err != nil {
		return nil, fmt.Errorf("invalid SESSION_TTL %q: %w", ttlStr, err)
	}
	c.SessionTTL = ttl
	if c.IsDev() && c.SessionTTL > 24*time.Hour {
		c.SessionTTL = 24 * time.Hour
	}

	gcDays, err := strconv.Atoi(getenv("IMAGE_GC_DAYS", "14"))
	if err != nil || gcDays < 1 {
		return nil, fmt.Errorf("IMAGE_GC_DAYS must be a positive integer")
	}
	c.ImageGCDays = gcDays

	gcIntervalStr := getenv("IMAGE_GC_INTERVAL", "6h")
	gcInterval, err := time.ParseDuration(gcIntervalStr)
	if err != nil || gcInterval < time.Second {
		return nil, fmt.Errorf("IMAGE_GC_INTERVAL must be a duration ≥ 1s")
	}
	c.ImageGCInterval = gcInterval
	if c.IsDev() && c.ImageGCInterval > 5*time.Minute {
		c.ImageGCInterval = 5 * time.Minute
	}

	switch strings.ToLower(getenv("LOG_LEVEL", "info")) {
	case "debug":
		c.LogLevel = slog.LevelDebug
	case "info":
		c.LogLevel = slog.LevelInfo
	case "warn":
		c.LogLevel = slog.LevelWarn
	case "error":
		c.LogLevel = slog.LevelError
	default:
		c.LogLevel = slog.LevelInfo
	}
	if c.IsDev() {
		c.LogLevel = slog.LevelDebug
	}

	return c, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parseBool(s string) bool {
	b, _ := strconv.ParseBool(s)
	return b
}
