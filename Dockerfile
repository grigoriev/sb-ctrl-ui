# sb-ctrl-ui: build the Vite SPA, then serve it as static files with Caddy.
FROM node:24-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# Caddy v2.11.4, the newest release, links Go and module versions with fixable
# HIGH findings. Rebuild the release the builder names ($CADDY_VERSION) with
# the same standard modules, a current Go and newer modules. go get only
# raises versions, so a later Caddy keeps its own newer ones. Drop this stage
# once a Caddy release carries the fixes.
FROM caddy:2-builder-alpine@sha256:2b9f32cbba6045e79212bb253f595588d20be8f7d1edf61582c519e124e0d2d8 AS caddy
WORKDIR /src
RUN printf '%s\n' 'package main' \
      'import (' \
      '	caddycmd "github.com/caddyserver/caddy/v2/cmd"' \
      '	_ "github.com/caddyserver/caddy/v2/modules/standard"' \
      ')' \
      'func main() { caddycmd.Main() }' > main.go \
    && go mod init caddy \
    && go get "github.com/caddyserver/caddy/v2@${CADDY_VERSION}" \
      golang.org/x/crypto@v0.55.0 \
      golang.org/x/net@v0.58.0 \
      golang.org/x/text@v0.41.0 \
      google.golang.org/grpc@v1.83.2 \
    && go mod tidy \
    && CGO_ENABLED=0 go build -trimpath -ldflags '-w -s' -o /caddy .

FROM caddy:2-alpine@sha256:6aeddd44c3078b0f9a35206472a11420648a79c184603ef95957d0a20044cb2b
COPY --from=caddy /caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
# Writes /srv/config.js from SB_API_BASE and SB_API_TOKEN, then starts Caddy.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
