# sb-ctrl-ui: build the Vite SPA, then serve it as static files with Caddy.
FROM node:24-slim@sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
# Writes /srv/config.js from SB_API_BASE and SB_API_TOKEN, then starts Caddy.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
EXPOSE 80
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
