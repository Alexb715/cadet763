CREATE TABLE content_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    document    TEXT NOT NULL,
    doc_hash    TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
    note        TEXT
);
CREATE INDEX idx_content_history_created_at ON content_history(created_at DESC);

ALTER TABLE images ADD COLUMN last_used_at INTEGER NOT NULL DEFAULT 0;
UPDATE images SET last_used_at = uploaded_at WHERE last_used_at = 0;
CREATE INDEX idx_images_last_used_at ON images(last_used_at);
