# 763 Air Cadets — Site

Bilingual (EN/FR) site for 763 Squadron, Royal Canadian Air Cadets, Bouctouche NB.
React + Vite frontend, Go + Chi + SQLite backend, all in Docker.

## What's here

- `src/` — React frontend.
- `backend/` — Go service (auth, content CMS, image library, Facebook poller).
- `docker-compose.yml` + `docker-compose.dev.yml` — production and development stacks.
- `Dockerfile.frontend`, `nginx.conf` — frontend build + static serve.
- `backend/Dockerfile` — backend build (distroless, non-root, single static binary).

The backend talks to your **existing reverse proxy** (Caddy / Traefik / nginx /
HAProxy / etc.). This repo does not ship a proxy of its own.

---

## Quick start (production)

1. **Clone and configure**
   ```sh
   cp .env.example .env
   $EDITOR .env
   ```
   At minimum, set `FRONTEND_ORIGIN` to the public URL (e.g.
   `https://763aircadets.example.ca`) and pick **Pattern A** or **Pattern B**
   for proxy integration (see `.env.example` comments).

2. **Pattern A — proxy in Docker (preferred)**
   ```sh
   docker network create cadets_proxy           # one-time
   docker compose up -d --build
   ```
   Attach your reverse proxy container to the `cadets_proxy` network and
   route `/api/*` → `backend:8080`, everything else → `frontend:80`.

3. **Pattern B — proxy on host or off-box**
   - Uncomment the `ports:` blocks in `docker-compose.yml`.
   - Set `BACKEND_HOST_PORT` / `FRONTEND_HOST_PORT` (and optionally `*_BIND`).
   - Point your proxy at `localhost:${BACKEND_HOST_PORT}` for `/api/*` and
     `localhost:${FRONTEND_HOST_PORT}` for everything else.

4. **Bootstrap the first admin user**
   ```sh
   docker compose run --rm backend /usr/local/bin/cadets-seed
   ```
   Reads `ADMIN_BOOTSTRAP_USER` / `ADMIN_BOOTSTRAP_PASS` / `ADMIN_BOOTSTRAP_NAME`
   from `.env`. Pass `--force` to add another admin once one already exists.

5. **Verify**
   ```sh
   curl https://yourdomain/api/health
   ```
   Should return `{"ok":true,"env":"production","dbOk":true,"version":"..."}`.

---

## Quick start (development)

Two terminals:

```sh
# Terminal 1 — backend container with relaxed defaults, host-bound on :8080
docker compose -f docker-compose.yml -f docker-compose.dev.yml up backend --build

# Terminal 2 — Vite dev server with HMR, on :5173
npm install
npm run dev
```

The dev backend auto-seeds an admin (`admin` / `cadet763dev0`) on first boot
when the `users` table is empty. You can sign in immediately.

Direct backend access for `curl` testing: `http://localhost:8080/api/...`.

---

## Architecture

```
Browser ─▶ Your reverse proxy ─┬─▶ frontend (nginx, static SPA)
                                └─▶ backend  (Go, /api/*)  ─▶ SQLite + uploads volume
                                                            ─▶ Facebook Graph API
```

- The **backend** is a single static binary (`gcr.io/distroless/static-debian12`)
  running as `nonroot`. It owns the SQLite DB at `/data/app.db` and the image
  store at `/data/uploads/`.
- The **frontend** container is just nginx serving the Vite-built static files.
  It does **not** proxy `/api/*` — that's the external proxy's job.
- **Facebook integration** is dormant until `FB_PAGE_ID` and `FB_PAGE_TOKEN`
  are set; once configured, a goroutine in the backend polls the Graph API
  every 30 minutes (5 minutes in dev) and caches posts in SQLite.

---

## Configuration reference

All knobs are environment variables, settable in `.env`.

| Variable | Default | Required | Notes |
|---|---|---|---|
| `APP_ENV` | `production` | yes | `production` or `development`. Dev relaxes CORS, HSTS, CSP, rate limits. Logs a loud warning when not production. |
| `FRONTEND_ORIGIN` | — | prod | Comma-separated. Exact origins (scheme+host[+port], no trailing `/`) allowed by CORS. |
| `PROXY_NETWORK` | `cadets_proxy` | Pattern A | Name of the external Docker network shared with your reverse proxy. |
| `BACKEND_BIND` / `BACKEND_HOST_PORT` | `127.0.0.1` / `8080` | Pattern B | Host bind address and port for the backend. |
| `FRONTEND_BIND` / `FRONTEND_HOST_PORT` | `127.0.0.1` / `8081` | Pattern B | Same for the frontend. |
| `PUBLIC_BASE_URL` | empty | no | Absolute URL prefix used in `/api/posts` image fields. Empty = relative. |
| `TRUSTED_PROXIES` | empty | no | CIDRs whose `X-Forwarded-For` is trusted for rate limiting. |
| `SESSION_TTL` | `720h` | no | Session lifetime (Go duration). Capped to 24h in dev. |
| `FB_PAGE_ID` | empty | no | Numeric Facebook Page ID. Empty = poller stays dormant. |
| `FB_PAGE_TOKEN` | empty | no | Long-lived Page Access Token. **Never logged.** |
| `FB_MIRROR_IMAGES` | `true` | no | If true, downloads FB CDN images into local store. |
| `LOG_LEVEL` | `info` | no | `debug`, `info`, `warn`, `error`. Forced to `debug` in dev. |
| `ADMIN_BOOTSTRAP_*` | empty | first run | Used only by `cadets-seed`; not read by the server. |

---

## API surface

All under `/api`. JSON in/out except `POST /api/images` (multipart).

- **public**: `GET /api/health`, `POST /api/auth/login`, `GET /api/content`,
  `GET /api/posts`, `GET /api/images/file/{name}`.
- **bearer (any user)**: `POST /api/auth/logout`, `GET /api/auth/me`.
- **editor (or admin)**: `PUT /api/content`, `PATCH /api/posts/{id}`,
  `GET /api/images`, `POST /api/images`, `PATCH /api/images/{id}`.
- **admin**: `DELETE /api/content`, `POST /api/posts/refresh`,
  `DELETE /api/images/{id}`, `GET|POST|PATCH|DELETE /api/users[/...]`.

Login response body matches the frontend stub contract:
`{"ok":true,"token":"...","user":{"user":"admin","role":"admin","name":"Capt. Cormier"}}`.

---

## Operating the site

### Add an editor
```sh
TOKEN=...   # admin bearer from POST /api/auth/login
curl -sf -X POST https://yourdomain/api/users \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"username":"jdoe","password":"replace-with-long-pass","role":"editor","name":"Lt. J. Doe"}'
```

### Rotate an admin password
```sh
curl -sf -X PATCH https://yourdomain/api/users/<user-id> \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d '{"password":"new-long-password"}'
```
Changing a password invalidates all of that user's other sessions.

### Reset all editable content
```sh
curl -sf -X DELETE https://yourdomain/api/content \
    -H "Authorization: Bearer $TOKEN"
```

### Force a Facebook refresh
```sh
curl -sf -X POST https://yourdomain/api/posts/refresh \
    -H "Authorization: Bearer $TOKEN"
```

### Back up
```sh
docker compose exec backend sqlite3 /data/app.db ".backup /data/backup-$(date -u +%FT%H%M).db"
docker cp $(docker compose ps -q backend):/data/. ./backups/
```
For continuous replication, run [litestream](https://litestream.io) as a
sidecar pointed at `/data/app.db`.

---

## Reverse proxy wiring

Pick whichever proxy you run. In all snippets, `backend:8080` and `frontend:80`
are the service names from `docker-compose.yml`; replace with `localhost:<port>`
if you're on Pattern B.

### Caddy
```caddy
763aircadets.example.ca {
    encode zstd gzip
    handle_path /api/* {
        reverse_proxy backend:8080
    }
    handle {
        reverse_proxy frontend:80
    }
}
```
Note: Caddy's `handle_path` strips the `/api` prefix. The backend expects
the prefix, so use plain `handle` instead:
```caddy
763aircadets.example.ca {
    @api path /api/*
    reverse_proxy @api backend:8080
    reverse_proxy frontend:80
}
```

### Traefik (labels on the docker-compose services)
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.cadets-api.rule=Host(`763aircadets.example.ca`) && PathPrefix(`/api`)"
  - "traefik.http.routers.cadets-api.service=cadets-api"
  - "traefik.http.services.cadets-api.loadbalancer.server.port=8080"
  - "traefik.http.routers.cadets-web.rule=Host(`763aircadets.example.ca`)"
  - "traefik.http.routers.cadets-web.service=cadets-web"
  - "traefik.http.services.cadets-web.loadbalancer.server.port=80"
```

### nginx
```nginx
server {
    listen 443 ssl http2;
    server_name 763aircadets.example.ca;
    # ... ssl_certificate, etc.

    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # IMPORTANT: keep Authorization header.
        proxy_pass_request_headers on;
    }
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }
}
```

### HAProxy
```
frontend https
    bind :443 ssl crt /etc/haproxy/certs/
    use_backend cadets_api if { path -m beg /api/ }
    default_backend cadets_web

backend cadets_api
    server be backend:8080 check

backend cadets_web
    server fe frontend:80 check
```

---

## Getting a Facebook Page Access Token

The squadron's Facebook page exists, but you need a long-lived **Page Access
Token** before the news feed can pull live posts. Until that token is set,
the site still works — `GET /api/posts` just returns whatever's in the DB
(initially nothing).

### 1. Create a Meta Developer App

1. Go to <https://developers.facebook.com/apps> → **My Apps** → **Create App**.
2. App type: **Business**. Name it something obvious like `763 Cadets Site`.
3. After creation, note the **App ID** and **App Secret** from the dashboard.
   These don't go on the server, but you need them to exchange tokens.

### 2. Confirm you're a Page admin

You (the squadron CO or whoever owns the FB page) must be listed as a **Page Admin**
on `facebook.com/pg/<your-page>/settings/?tab=admin_roles`. Without that, the
permissions in step 3 won't grant a usable token.

### 3. Generate a User Access Token

1. Open <https://developers.facebook.com/tools/explorer/> (the Graph API Explorer).
2. Top-right: select your app from the dropdown.
3. Click **Get Token** → **Get User Access Token**.
4. Tick these permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `public_profile`
5. Click **Generate Access Token** and approve in the popup.
6. Copy the token from the input bar — call this `SHORT_USER_TOKEN`.

### 4. Exchange for a long-lived User Token

```sh
curl -sG "https://graph.facebook.com/v21.0/oauth/access_token" \
    --data-urlencode "grant_type=fb_exchange_token" \
    --data-urlencode "client_id=YOUR_APP_ID" \
    --data-urlencode "client_secret=YOUR_APP_SECRET" \
    --data-urlencode "fb_exchange_token=SHORT_USER_TOKEN" | jq .
```
The response contains `access_token` — call this `LONG_USER_TOKEN`. It lasts
~60 days, but you only need it for the next step.

### 5. Get the Page Access Token

```sh
curl -sG "https://graph.facebook.com/v21.0/me/accounts" \
    --data-urlencode "access_token=LONG_USER_TOKEN" | jq .
```
The response is a list of pages you admin. Find the one named "763 Squadron"
(or whatever your page is titled) and copy its `id` (the Page ID) and
`access_token` (the Page Access Token).

Page tokens derived from a long-lived user token **do not expire** as long as
you remain a Page Admin and the app stays in good standing.

### 6. Configure the backend

In `.env`:
```
FB_PAGE_ID=123456789012345
FB_PAGE_TOKEN=EAAJ...long-string...
```
Restart the backend:
```sh
docker compose restart backend
```
Trigger an immediate fetch (admin bearer required):
```sh
curl -sf -X POST https://yourdomain/api/posts/refresh \
    -H "Authorization: Bearer $ADMIN_TOKEN"
```
Posts should appear at `GET /api/posts` within a few seconds.

### 7. App Review (production)

In **Development Mode**, your app can only fetch data for users who are admins
of the app. To pull data on a public site, submit `pages_read_engagement` and
`pages_read_user_content` for **App Review** with a screencast showing how the
squadron's site uses the data. While review is pending or denied:

- Posts still cache and serve correctly *if* you can fetch them as the page
  admin (test by curling Graph directly with `LONG_USER_TOKEN`).
- Reaction / comment counts on `/api/posts` may come back as `null`. Hide
  those stats in the frontend (`src/components/BlogSection.jsx`) until review
  passes.

### 8. Verify token health

```sh
curl -sG "https://graph.facebook.com/v21.0/debug_token" \
    --data-urlencode "input_token=PAGE_TOKEN" \
    --data-urlencode "access_token=APP_ID|APP_SECRET" | jq .
```
Look for `"is_valid": true` and `"expires_at": 0` (page tokens with
`expires_at: 0` are non-expiring).

---

## Security notes

- All sessions are server-side opaque tokens, hashed with SHA-256 before
  storage. Logging out deletes the row; password change deletes all sessions.
- Passwords use Argon2id (m=64MiB, t=1, p=4). Minimum length 12.
- Image uploads are MIME-validated, decoded, then re-encoded — EXIF and any
  embedded scripts are stripped in the round-trip. Files are stored
  content-addressed by SHA-256 with regex-validated paths.
- The backend emits `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `COOP`, `CORP`, `Permissions-Policy`, and a strict CSP
  even when behind your proxy. HSTS is added in production only.
- Facebook tokens are read from env vars, never logged, never written to
  the DB. Rotation is a redeploy.
- Login is rate-limited to 5/min per IP in production. Constant-time on
  unknown users (we hash a dummy on the no-user branch).

After first login, **rotate `ADMIN_BOOTSTRAP_PASS`** by `PATCH`-ing your own
admin user, and remove the value from `.env`.
