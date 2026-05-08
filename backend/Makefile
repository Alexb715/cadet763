.PHONY: build run dev seed test vet vuln fmt clean

VERSION := $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)
LDFLAGS := -s -w -X github.com/763cadets/backend/internal/version.Version=$(VERSION)

build:
	go build -trimpath -ldflags="$(LDFLAGS)" -o bin/cadets-server ./cmd/server
	go build -trimpath -ldflags="-s -w" -o bin/cadets-seed ./cmd/seed

run: build
	APP_ENV=development DB_PATH=./data/app.db UPLOADS_DIR=./data/uploads ./bin/cadets-server

dev:
	APP_ENV=development DB_PATH=./data/app.db UPLOADS_DIR=./data/uploads go run ./cmd/server

seed: build
	./bin/cadets-seed

test:
	go test ./...

vet:
	go vet ./...

vuln:
	command -v govulncheck >/dev/null 2>&1 || go install golang.org/x/vuln/cmd/govulncheck@latest
	govulncheck ./...

fmt:
	gofmt -w .

clean:
	rm -rf bin/ data/
