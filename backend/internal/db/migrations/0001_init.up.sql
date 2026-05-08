PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin','editor')),
    display_name  TEXT NOT NULL,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL,
    disabled_at   INTEGER
);

CREATE TABLE sessions (
    token_hash    TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    INTEGER NOT NULL,
    last_used_at  INTEGER NOT NULL,
    expires_at    INTEGER NOT NULL,
    user_agent    TEXT,
    ip            TEXT
);
CREATE INDEX idx_sessions_user    ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

CREATE TABLE content (
    id          INTEGER PRIMARY KEY CHECK (id = 1),
    document    TEXT NOT NULL,
    updated_at  INTEGER NOT NULL,
    updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE images (
    id           TEXT PRIMARY KEY,
    sha256       TEXT NOT NULL UNIQUE,
    mime         TEXT NOT NULL,
    ext          TEXT NOT NULL,
    width        INTEGER NOT NULL,
    height       INTEGER NOT NULL,
    bytes        INTEGER NOT NULL,
    alt_text_en  TEXT NOT NULL DEFAULT '',
    alt_text_fr  TEXT NOT NULL DEFAULT '',
    uploaded_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at  INTEGER NOT NULL
);
CREATE INDEX idx_images_uploaded_at ON images(uploaded_at DESC);

CREATE TABLE posts (
    id              TEXT PRIMARY KEY,
    fb_post_id      TEXT UNIQUE,
    source          TEXT NOT NULL CHECK (source IN ('facebook','manual')),
    category        TEXT NOT NULL CHECK (category IN ('events','training','community')) DEFAULT 'community',
    posted_at       INTEGER NOT NULL,
    title_en        TEXT NOT NULL DEFAULT '',
    title_fr        TEXT NOT NULL DEFAULT '',
    body_en         TEXT NOT NULL DEFAULT '',
    body_fr         TEXT NOT NULL DEFAULT '',
    image_id        TEXT REFERENCES images(id) ON DELETE SET NULL,
    image_external  TEXT,
    likes           INTEGER NOT NULL DEFAULT 0,
    comments        INTEGER NOT NULL DEFAULT 0,
    shares          INTEGER NOT NULL DEFAULT 0,
    permalink       TEXT,
    raw_json        TEXT,
    locally_edited  INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL,
    hidden_at       INTEGER
);
CREATE INDEX idx_posts_posted_at ON posts(posted_at DESC);
CREATE INDEX idx_posts_category  ON posts(category);

CREATE TABLE audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    at              INTEGER NOT NULL,
    actor_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
    actor_username  TEXT,
    action          TEXT NOT NULL,
    target          TEXT,
    ip              TEXT,
    user_agent      TEXT,
    details         TEXT
);
CREATE INDEX idx_audit_at    ON audit_log(at DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
