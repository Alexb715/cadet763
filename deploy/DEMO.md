# Private demo (full stack, one password)

Run the whole site (frontend + Go backend + SQLite) behind a single viewing
password, on a server you already expose with a tunnel. A small Caddy gateway
container does the password gate and path routing, so your tunnel only points
at one port.

```
Browser ─▶ your tunnel (HTTPS) ─▶ gateway :8088 ─┬─ password gate ─▶ frontend:80
                                                  └─ /api/*  ───────▶ backend:8080
```

## Steps

1. **One-time:** create the proxy network the base compose expects (left empty here).
   ```sh
   docker network create cadets_proxy
   ```

2. **Configure `.env`** (copy `.env.example`). Minimum:
   ```sh
   APP_ENV=production
   FRONTEND_ORIGIN=https://YOUR-TUNNEL-DOMAIN      # the public URL your tunnel serves
   ADMIN_BOOTSTRAP_USER=admin
   ADMIN_BOOTSTRAP_PASS=<long-random-password>     # the EDITING login
   ADMIN_BOOTSTRAP_NAME=Capt. Cormier
   # FB_* left empty (news shows the bundled sample posts)
   # optional: DEMO_PORT=8088   DEMO_BIND=127.0.0.1
   ```

3. **Set the viewing password** (separate from the admin login):
   ```sh
   cp deploy/Caddyfile.example deploy/Caddyfile
   HASH=$(docker run --rm caddy:2-alpine caddy hash-password --plaintext 'the-shared-view-password')
   sed -i "s#REPLACE_WITH_HASH#${HASH}#" deploy/Caddyfile
   ```
   Username is `squadron` (change it in `deploy/Caddyfile` if you want).

4. **Build & run:**
   ```sh
   docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build
   docker compose run --rm backend /usr/local/bin/cadets-seed
   ```

5. **Point your tunnel** at `http://localhost:8088` (or `127.0.0.1:$DEMO_PORT`).
   If your tunnel runs in its own container, set `DEMO_BIND=0.0.0.0` in `.env`
   and point it at the host IP, or attach it to the compose `internal` network.

## Result

- Anyone hitting your tunnel URL gets a **username/password prompt before they
  see anything**. `X-Robots-Tag: noindex` keeps it out of search engines.
- **Editing** still works: sign in inside the app with the admin user from
  step 2 (the gate password and the editor login are independent).
- Stop the demo: `docker compose -f docker-compose.yml -f docker-compose.demo.yml down`.

## Notes

- The gate uses HTTP Basic auth, which sits in the **`Authorization` header**.
  The in-app editor also uses that header (bearer tokens), so `/api/*` is left
  **ungated** to avoid the collision. The API only exposes the same public
  content the gated site already shows, and all writes still require the admin
  login. If you need the API itself behind the gate too, use a cookie/forward-auth
  proxy instead of Basic auth.
- The gateway speaks plain HTTP on `:8088`; your tunnel is expected to terminate
  HTTPS (e.g. Cloudflare Tunnel), so view-password credentials are encrypted
  end-to-end to the browser.
- `deploy/Caddyfile` (with your real hash) is gitignored; only the `.example`
  is committed.
