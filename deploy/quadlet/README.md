# Podman Quadlet (build + run)

Builds the two images from this repo and runs the full stack rootless, behind a
single published port (`8088`) — the Quadlet equivalent of a one-container app.

```
your tunnel ─▶ cadets-web :8088 ─┬─ /api/* ─▶ cadets-backend :8080 ─▶ cadets-data volume
                                 └─ /*     ─▶ cadets-frontend :80 (nginx SPA)
```

Units:
| file | what it does |
|---|---|
| `cadets.network` | private bridge so the containers find each other by name |
| `cadets-data.volume` | named volume for the SQLite db + uploaded images |
| `cadets-backend.build` / `.container` | build + run the Go API |
| `cadets-frontend.build` / `.container` | build + run the nginx SPA |
| `cadets-web.container` | Caddy gateway: publishes `:8088`, routes `/api` vs `/` |
| `Caddyfile` | gateway routing (+ optional viewing password) |

> Requires **Podman 5.0+** (for `.build` units). Older Podman: see the fallback
> at the bottom.

## Setup

1. **Clone the repo on the server** and edit these placeholders to match its path:
   - `SetWorkingDirectory=` in `cadets-backend.build` (→ `<repo>/backend`) and
     `cadets-frontend.build` (→ `<repo>`).
   - `Volume=...` Caddyfile path in `cadets-web.container` (→ `<repo>/deploy/quadlet/Caddyfile`).
   - `FRONTEND_ORIGIN=` and `ADMIN_BOOTSTRAP_PASS=` in `cadets-backend.container`.

2. **Install the unit files** (rootless):
   ```sh
   loginctl enable-linger "$USER"            # so it runs at boot
   mkdir -p ~/.config/containers/systemd
   cp deploy/quadlet/cadets.network \
      deploy/quadlet/cadets-data.volume \
      deploy/quadlet/cadets-backend.build  deploy/quadlet/cadets-backend.container \
      deploy/quadlet/cadets-frontend.build deploy/quadlet/cadets-frontend.container \
      deploy/quadlet/cadets-web.container \
      ~/.config/containers/systemd/
   ```
   (The `Caddyfile` stays in the repo; it's mounted by the absolute path you set above.)

3. **Build + start** (the gateway pulls in the rest, and the `.build` units run first):
   ```sh
   systemctl --user daemon-reload
   systemctl --user start cadets-backend.service cadets-frontend.service cadets-web.service
   ```

4. **Create the admin login** (one-time):
   ```sh
   podman exec cadets-backend /usr/local/bin/cadets-seed
   ```

5. Open `http://<host>:8088`, or point your existing tunnel at port `8088`.

## Optional: viewing password

Edit `deploy/quadlet/Caddyfile`, generate a hash and uncomment the `basic_auth`
block:
```sh
podman run --rm docker.io/library/caddy:2-alpine caddy hash-password --plaintext 'your-pass'
systemctl --user restart cadets-web.service
```

## Rebuild after a `git pull`

```sh
systemctl --user restart cadets-backend-build.service cadets-frontend-build.service
systemctl --user restart cadets-backend.service cadets-frontend.service cadets-web.service
```

## Common tweaks

- **Host-path data instead of a named volume** (your Wanime style): in
  `cadets-backend.container` swap the volume line for
  `Volume=%h/.local/share/cadets:/data:U` and delete `cadets-data.volume`.
- **Status / logs:** `systemctl --user status cadets-web`, `podman logs cadets-backend`.
- **Stop everything:** `systemctl --user stop cadets-web cadets-frontend cadets-backend`.

## Fallback for Podman < 5 (no `.build` units)

Build the images by hand, then point the containers at them:
```sh
podman build -t localhost/cadets-backend:latest  -f backend/Dockerfile backend
podman build -t localhost/cadets-frontend:latest -f Dockerfile.frontend .
```
In `cadets-backend.container` / `cadets-frontend.container` replace
`Image=cadets-*.build` with `Image=localhost/cadets-*:latest`, and don't copy
the `.build` files.
