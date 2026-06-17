# Tiny gateway image: Caddy with the routing config baked in, so there's no
# runtime config bind-mount to go wrong. Rebuild after editing Caddyfile:
#   systemctl --user restart cadets-web-build.service cadets-web.service
FROM docker.io/library/caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
