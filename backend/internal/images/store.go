package images

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

// FileLayout: <root>/<sha[0:2]>/<sha>.<ext> for original.
//             <root>/<sha[0:2]>/<sha>-<width>.<ext> for thumbnails.
// All path components are tightly regex-validated before touching disk.

var (
	shardRe = regexp.MustCompile(`^[a-f0-9]{2}$`)
	fileRe  = regexp.MustCompile(`^[a-f0-9]{64}(-(800|1600))?\.(jpg|png|webp)$`)
)

type Store struct {
	Root string
}

func NewStore(root string) (*Store, error) {
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("mkdir uploads: %w", err)
	}
	return &Store{Root: root}, nil
}

// Path returns the on-disk path for a content-addressed object after validating
// the shard and filename components.
func (s *Store) Path(sha, name string) (string, error) {
	if !shardRe.MatchString(sha[:2]) {
		return "", errors.New("bad shard")
	}
	if !fileRe.MatchString(name) {
		return "", errors.New("bad filename")
	}
	return filepath.Join(s.Root, sha[:2], name), nil
}

// Write writes data atomically to <root>/<shard>/<name>.
func (s *Store) Write(sha, name string, data []byte) error {
	path, err := s.Path(sha, name)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

func (s *Store) Exists(sha, name string) (bool, error) {
	path, err := s.Path(sha, name)
	if err != nil {
		return false, err
	}
	_, err = os.Stat(path)
	if errors.Is(err, os.ErrNotExist) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return true, nil
}
