package auth

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2id parameters tuned for ~50ms hashing on a modest server.
// Memory in KiB, iterations, parallelism, key length, salt length.
const (
	argonMemory  uint32 = 64 * 1024
	argonTime    uint32 = 1
	argonThreads uint8  = 4
	argonKeyLen  uint32 = 32
	argonSaltLen        = 16
)

// HashPassword returns an Argon2id PHC string: $argon2id$v=19$m=...,t=...,p=...$<salt-b64>$<hash-b64>
func HashPassword(plain string) (string, error) {
	if len(plain) < 12 {
		return "", errors.New("password too short")
	}
	salt := make([]byte, argonSaltLen)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	h := argon2.IDKey([]byte(plain), salt, argonTime, argonMemory, argonThreads, argonKeyLen)
	enc := fmt.Sprintf("$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, argonMemory, argonTime, argonThreads,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(h),
	)
	return enc, nil
}

// VerifyPassword runs in constant time relative to a correct hash; on a malformed
// stored hash it still consumes Argon2 work to keep timing similar.
func VerifyPassword(plain, encoded string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		// Burn cycles on a fixed dummy so timing on missing/invalid users
		// matches the success path.
		_ = argon2.IDKey([]byte(plain), []byte("dummysaltdummysa"), argonTime, argonMemory, argonThreads, argonKeyLen)
		return false
	}
	var version int
	if _, err := fmt.Sscanf(parts[2], "v=%d", &version); err != nil || version != argon2.Version {
		return false
	}
	var m, t uint32
	var p uint8
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &m, &t, &p); err != nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	want, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	got := argon2.IDKey([]byte(plain), salt, t, m, p, uint32(len(want)))
	return subtle.ConstantTimeCompare(got, want) == 1
}

// DummyHash is used by handlers to keep login timing constant for unknown users.
var DummyHash, _ = HashPassword("dummy-hash-for-timing-only-not-a-real-credential")
