# Podman Quadlet (pull from GHCR)

The three images are built in **CI** (GitHub Actions, `.github/workflows/build-images.yml`)
and pushed to GHCR. This server only **pulls** them — no building here, so a
small box won't get crushed by Go/Vite builds.

```
your tunnel ─▶ cadets-web :8088 ─┬─ /api/* ─▶ cadets-backend :8080 ─▶ cadets-data volume
                                 └─ /*     ─▶ cadets-frontend :80 (nginx SPA)

CI (GitHub runners) ─build─▶ ghcr.io/alexb715/cadet763-{backend,frontend,web}:latest
```

Images:
| image | from |
|---|---|
| `ghcr.io/alexb715/cadet763-backend` | `backend/Dockerfile` (Go API) |
| `ghcr.io/alexb715/cadet763-frontend` | `Dockerfile.frontend` (nginx SPA) |
| `ghcr.io/alexb715/cadet763-web` | `deploy/quadlet/caddy.Containerfile` (Caddy + baked `Caddyfile`) |

Server units (in `deploy/quadlet/`): `cadets.network`, `cadets-data.volume`,
`cadets-backend.container`, `cadets-frontend.container`, `cadets-web.container`.

## One-time: get the images built

1. **Push-mirror this repo to GitHub** (Forgejo/Gitea → Settings → Mirroring →
   *Push mirror* to `github.com/alexb715/cadet763`). The mirror push triggers the
   Actions workflow, which builds and pushes the three images to GHCR.
   (Or run the workflow manually from the GitHub Actions tab.)
2. **Make the packages pullable by the server.** Either set the three GHCR
   packages to **public** (GitHub → your packages → Package settings → Change
   visibility), or — since this server already pulls `ghcr.io/alexb715/*`
   images — leave them private; the existing `podman login ghcr.io` will work.

## Deploy on the server (no clone, no build)

1. Copy the five unit files to `~/.config/containers/systemd/`:
   ```sh
   scp deploy/quadlet/cadets.network deploy/quadlet/cadets-data.volume \
       deploy/quadlet/cadets-backend.container \
       deploy/quadlet/cadets-frontend.container \
       deploy/quadlet/cadets-web.container \
       you@server:~/.config/containers/systemd/
   ```
2. On the server, edit `~/.config/containers/systemd/cadets-backend.container`:
   set `FRONTEND_ORIGIN=` (the URL it's opened on) and `ADMIN_BOOTSTRAP_PASS=`.
3. Start it:
   ```sh
   loginctl enable-linger "$USER"
   systemctl --user daemon-reload
   systemctl --user start cadets-backend cadets-frontend cadets-web
   podman exec cadets-backend /usr/local/bin/cadets-seed   # creates the admin login
   ```
4. Open `http://<host>:8088`, or point your tunnel at port `8088`.

## Updating

Push to the repo → mirror → CI rebuilds and pushes `:latest`. Then on the server:
```sh
podman auto-update                       # pulls newer images + restarts changed units
# or force one service:
systemctl --user restart cadets-backend
```
(`AutoUpdate=registry` + the `podman-auto-update.timer` will also do this on a schedule.)

## Optional: viewing password

The gateway image bakes in `deploy/quadlet/Caddyfile`. To require a password,
edit that file, uncomment the `basic_auth` block, and add a hash:
```sh
podman run --rm docker.io/library/caddy:2-alpine caddy hash-password --plaintext 'your-pass'
```
Commit + push → CI rebuilds `cadet763-web` → `podman auto-update` on the server.

## Notes

- **Port:** the gateway publishes `8088` (3001 is taken by another app). To change
  it, edit `PublishPort=` (cadets-web.container), the `:8088` site address in
  `deploy/quadlet/Caddyfile`, and `FRONTEND_ORIGIN=` (cadets-backend.container) —
  the Caddyfile change goes through CI.
- **Data** lives in the `cadets-data` named volume (SQLite db + uploads).
- **Status / logs:** `systemctl --user status cadets-web`, `podman logs cadets-backend`.
- **Stop:** `systemctl --user stop cadets-web cadets-frontend cadets-backend`.
