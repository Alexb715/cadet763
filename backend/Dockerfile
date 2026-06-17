FROM docker.io/library/golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath \
        -ldflags="-s -w -X github.com/763cadets/backend/internal/version.Version=${VERSION}" \
        -o /out/cadets-server ./cmd/server && \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
        -o /out/cadets-seed ./cmd/seed

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/cadets-server /usr/local/bin/cadets-server
COPY --from=build /out/cadets-seed   /usr/local/bin/cadets-seed
USER nonroot:nonroot
EXPOSE 8080
VOLUME ["/data"]
ENV DB_PATH=/data/app.db UPLOADS_DIR=/data/uploads LISTEN_ADDR=:8080
ENTRYPOINT ["/usr/local/bin/cadets-server"]
