# sb-ctrl-ui: build the Vite SPA, then serve it as static files with Caddy.
FROM node:24-slim@sha256:55fb5f5a527ea2c5c4a95f963e48ef90aa38c7b346054fdc8ee9957a2b55d205 AS build
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
FROM caddy:2-builder-alpine@sha256:ef9b65adf9a224770c6d5f6d1ae1bf99bc3caaa78d8c4bae3ea949ee6984f301 AS caddy
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

FROM caddy:2-alpine@sha256:eb4d35b7452d1ab6171fbdbe8d9275b2301dad6dad92115d91e19fb9b24d510f
COPY --from=caddy /caddy /usr/bin/caddy
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
# Writes /srv/config.js from SB_API_BASE and SB_API_TOKEN, then starts Caddy.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
