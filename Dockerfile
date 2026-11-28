# sb-ctrl-ui: build the Vite SPA, then ship the files only. The image holds no
# web server. On start it copies the app and a config.js into /out and exits.
# The proxy of sb-stack serves /out from a shared volume.
FROM node:26-slim@sha256:abe7e5a82b61a8ef67b315b85497c9e65173387ccf2f4a029248184b8e020be5 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

# BusyBox gives the entrypoint sh, awk, cp and find, and nothing else.
FROM busybox:musl@sha256:80e38f9a1b39188b8bdb28879178edb322a4402b081a9aedda1924609decd6f6
COPY --from=build /app/dist /srv
# Writes /out/config.js from SB_API_BASE and SB_API_TOKEN, copies /srv to /out.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# A new named volume takes the owner of /out, so the copy needs no root.
RUN mkdir /out && chown 65534:65534 /out
USER 65534:65534
VOLUME /out
ENTRYPOINT ["docker-entrypoint.sh"]
