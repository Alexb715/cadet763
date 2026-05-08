package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/config"
	"github.com/763cadets/backend/internal/db"
	"github.com/763cadets/backend/internal/facebook"
	"github.com/763cadets/backend/internal/handlers"
	"github.com/763cadets/backend/internal/imagegc"
	"github.com/763cadets/backend/internal/images"
	mw "github.com/763cadets/backend/internal/middleware"
	"github.com/763cadets/backend/internal/version"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
)

func main() {
	healthcheck := flag.Bool("healthcheck", false, "perform a healthcheck against the local server and exit")
	flag.Parse()

	if *healthcheck {
		os.Exit(runHealthcheck())
	}

	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintln(os.Stderr, "config:", err)
		os.Exit(1)
	}

	logger := newLogger(cfg)
	slog.SetDefault(logger)

	logger.Info("starting", slog.String("version", version.Version), slog.String("env", string(cfg.AppEnv)))
	if cfg.IsDev() {
		logger.Warn("development mode active — security relaxed; do not run this configuration in production")
	}

	ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer cancel()

	database, err := db.Open(ctx, cfg.DBPath)
	if err != nil {
		logger.Error("db open failed", slog.String("err", err.Error()))
		os.Exit(1)
	}
	defer database.Close()

	if err := db.Migrate(ctx, database); err != nil {
		logger.Error("db migrate failed", slog.String("err", err.Error()))
		os.Exit(1)
	}

	if cfg.IsDev() {
		if err := autoSeedDevAdmin(ctx, database, logger); err != nil {
			logger.Warn("dev auto-seed skipped", slog.String("err", err.Error()))
		}
	}

	store, err := images.NewStore(cfg.UploadsDir)
	if err != nil {
		logger.Error("images store init failed", slog.String("err", err.Error()))
		os.Exit(1)
	}

	auditor := &mw.Auditor{DB: database, Log: logger}

	pollInterval := 30 * time.Minute
	if cfg.IsDev() {
		pollInterval = 5 * time.Minute
	}
	fbClient := facebook.NewClient(cfg.FBPageID, cfg.FBPageToken, cfg.FBMirrorImages)
	poller := facebook.NewPoller(fbClient, database, store, logger, pollInterval)
	go poller.Run(ctx)
	go runSessionGC(ctx, database, logger)

	imgGC := imagegc.New(database, cfg.UploadsDir, logger,
		time.Duration(cfg.ImageGCDays)*24*time.Hour, cfg.ImageGCInterval)
	go imgGC.Run(ctx)

	limits := mw.ProductionLimits()
	if cfg.IsDev() {
		limits = mw.DevelopmentLimits()
	}

	srv := &handlers.Server{Log: logger, DevMode: cfg.IsDev()}

	r := chi.NewRouter()
	r.Use(mw.RequestID)
	r.Use(middleware.RealIP)
	r.Use(mw.Recover(logger))
	r.Use(mw.SecurityHeaders(cfg.IsDev()))
	r.Use(mw.CORS(cfg.FrontendOrigin, cfg.IsDev()))
	r.Use(middleware.NoCache) // default: no-cache; handlers override per route

	r.Route("/api", func(r chi.Router) {
		r.Use(mw.DefaultLimit(limits))

		health := &handlers.HealthDeps{Server: srv, DB: database, Env: string(cfg.AppEnv), DBPath: cfg.DBPath, LastFBFetchAt: poller.LastFetchedAt}
		r.Get("/health", health.Get)

		// Auth
		authH := &handlers.AuthDeps{Server: srv, DB: database, SessionTTL: cfg.SessionTTL, Auditor: auditor}
		r.With(mw.LoginLimit(limits)).Post("/auth/login", authH.Login)
		r.With(auth.RequireBearer(database)).Post("/auth/logout", authH.Logout)
		r.With(auth.RequireBearer(database)).Get("/auth/me", authH.Me)
		r.With(auth.RequireBearer(database), mw.LoginLimit(limits)).Post("/auth/password", authH.ChangePassword)

		// Content
		contentH := &handlers.ContentDeps{Server: srv, DB: database, Auditor: auditor}
		r.Get("/content", contentH.Get)
		r.With(auth.RequireBearer(database), auth.RequireRole("editor", "admin"), mw.ContentLimit(limits)).Put("/content", contentH.Put)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Delete("/content", contentH.Delete)

		// Content history (admin undo)
		histH := &handlers.ContentHistoryDeps{Server: srv, DB: database, Auditor: auditor}
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Get("/content/history", histH.List)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Get("/content/history/{id}", histH.Get)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Post("/content/restore/{id}", histH.Restore)

		// Posts
		publicBase := cfg.PublicBaseURL // empty -> relative URLs (works behind proxy)
		postsH := &handlers.PostsDeps{Server: srv, DB: database, Poller: poller, PublicBaseURL: publicBase, Auditor: auditor}
		r.Get("/posts", postsH.List)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin"), mw.RefreshLimit(limits)).Post("/posts/refresh", postsH.Refresh)
		r.With(auth.RequireBearer(database), auth.RequireRole("editor", "admin")).Patch("/posts/{id}", postsH.Patch)

		// Images
		imgH := &handlers.ImagesDeps{Server: srv, DB: database, Store: store, Auditor: auditor}
		imgH.DevMode = cfg.IsDev()
		r.With(auth.RequireBearer(database), auth.RequireRole("editor", "admin")).Get("/images", imgH.List)
		r.With(auth.RequireBearer(database), auth.RequireRole("editor", "admin"), mw.UploadLimit(limits)).Post("/images", imgH.Upload)
		r.With(auth.RequireBearer(database), auth.RequireRole("editor", "admin")).Patch("/images/{id}", imgH.Patch)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Delete("/images/{id}", imgH.Delete)
		r.Get("/images/file/{name}", imgH.Serve)

		// Users (admin only)
		usersH := &handlers.UsersDeps{Server: srv, DB: database, Auditor: auditor}
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Get("/users", usersH.List)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Post("/users", usersH.Create)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Patch("/users/{id}", usersH.Patch)
		r.With(auth.RequireBearer(database), auth.RequireRole("admin")).Delete("/users/{id}", usersH.Delete)
	})

	httpSrv := &http.Server{
		Addr:              cfg.ListenAddr,
		Handler:           r,
		ReadTimeout:       10 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 14,
	}

	go func() {
		logger.Info("listening", slog.String("addr", cfg.ListenAddr))
		if err := httpSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server", slog.String("err", err.Error()))
			cancel()
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")

	shutdownCtx, sc := context.WithTimeout(context.Background(), 15*time.Second)
	defer sc()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Warn("shutdown", slog.String("err", err.Error()))
	}
}

func newLogger(cfg *config.Config) *slog.Logger {
	opts := &slog.HandlerOptions{Level: cfg.LogLevel, AddSource: cfg.IsDev()}
	if cfg.IsDev() {
		return slog.New(slog.NewTextHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, opts))
}

func runSessionGC(ctx context.Context, database *sql.DB, log *slog.Logger) {
	t := time.NewTicker(1 * time.Hour)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			n, err := auth.GCSessions(ctx, database)
			if err != nil {
				log.Warn("session gc", slog.String("err", err.Error()))
				continue
			}
			if n > 0 {
				log.Info("session gc", slog.Int64("expired", n))
			}
		}
	}
}

func autoSeedDevAdmin(ctx context.Context, database *sql.DB, log *slog.Logger) error {
	var n int
	if err := database.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	hash, err := auth.HashPassword("cadet763dev0")
	if err != nil {
		return err
	}
	now := time.Now().Unix()
	_, err = database.ExecContext(ctx, `
		INSERT INTO users (id, username, password_hash, role, display_name, created_at, updated_at)
		VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
		uuid.NewString(), "admin", hash, "Capt. Cormier", now, now)
	if err != nil {
		return err
	}
	log.Warn("dev admin auto-seeded — credentials admin/cadet763dev0 — DO NOT use in production")
	return nil
}

func runHealthcheck() int {
	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		addr = ":8080"
	}
	if addr[0] == ':' {
		addr = "127.0.0.1" + addr
	}
	url := "http://" + addr + "/api/health"
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		fmt.Fprintln(os.Stderr, "healthcheck:", err)
		return 1
	}
	defer res.Body.Close()
	_, _ = io.Copy(io.Discard, res.Body)
	if res.StatusCode != http.StatusOK {
		return 1
	}
	return 0
}
