package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/763cadets/backend/internal/auth"
	"github.com/763cadets/backend/internal/db"
	"github.com/google/uuid"
	"golang.org/x/term"
)

func main() {
	force := flag.Bool("force", false, "create the admin even if users already exist")
	flag.Parse()

	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/data/app.db"
	}

	username := strings.TrimSpace(os.Getenv("ADMIN_BOOTSTRAP_USER"))
	password := os.Getenv("ADMIN_BOOTSTRAP_PASS")
	name := strings.TrimSpace(os.Getenv("ADMIN_BOOTSTRAP_NAME"))

	if username == "" {
		username = prompt("Admin username: ", false)
	}
	if name == "" {
		name = prompt("Display name: ", false)
	}
	if password == "" {
		password = prompt("Admin password (min 12 chars): ", true)
	}
	if username == "" || name == "" || password == "" {
		fail("username, name, and password are all required")
	}
	if len(password) < 12 {
		fail("password must be at least 12 characters")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	database, err := db.Open(ctx, dbPath)
	if err != nil {
		fail("open db: " + err.Error())
	}
	defer database.Close()

	if err := db.Migrate(ctx, database); err != nil {
		fail("migrate: " + err.Error())
	}

	var existing int
	if err := database.QueryRowContext(ctx, `SELECT COUNT(*) FROM users`).Scan(&existing); err != nil {
		fail("count users: " + err.Error())
	}
	if existing > 0 && !*force {
		fail(fmt.Sprintf("users table already has %d row(s); pass --force to add anyway", existing))
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		fail("hash: " + err.Error())
	}

	id := uuid.NewString()
	now := time.Now().Unix()
	_, err = database.ExecContext(ctx, `
		INSERT INTO users (id, username, password_hash, role, display_name, created_at, updated_at)
		VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
		id, username, hash, name, now, now)
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE") {
			fail("a user with that username already exists")
		}
		fail("insert user: " + err.Error())
	}
	_, _ = database.ExecContext(ctx, `
		INSERT INTO audit_log (at, actor_id, actor_username, action, target, details)
		VALUES (?, ?, ?, 'user.bootstrap', ?, NULL)`,
		now, id, username, id)

	fmt.Printf("created admin %s (id=%s)\n", username, id)
}

func prompt(label string, secret bool) string {
	fmt.Print(label)
	if secret && term.IsTerminal(int(os.Stdin.Fd())) {
		b, err := term.ReadPassword(int(os.Stdin.Fd()))
		fmt.Println()
		if err != nil {
			return ""
		}
		return string(b)
	}
	var s string
	_, err := fmt.Scanln(&s)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		// ignore Scanln errors on empty input
	}
	return strings.TrimSpace(s)
}

func fail(msg string) {
	fmt.Fprintln(os.Stderr, "seed:", msg)
	os.Exit(1)
}
