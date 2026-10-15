# sb-ctrl-ui: build the Vite SPA, then serve it as static files with Caddy.
FROM node:24-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS build
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
FROM caddy:2-builder-alpine@sha256:d6161a2c82fd58b3205048958fb6246d0c5d892beee8a47e90944610c4efd100 AS caddy
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

FROM caddy:2-alpine@sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f
COPY --from=caddy /caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
# Writes /srv/config.js from SB_API_BASE and SB_API_TOKEN, then starts Caddy.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
