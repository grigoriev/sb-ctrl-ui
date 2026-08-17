# sb-ctrl-ui

![CI](https://github.com/grigoriev/sb-ctrl-ui/actions/workflows/ci.yml/badge.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=grigoriev_sb-ctrl-ui&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=grigoriev_sb-ctrl-ui)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=grigoriev_sb-ctrl-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=grigoriev_sb-ctrl-ui)

React web UI for the [sb-ctrl](https://github.com/grigoriev/sb-ctrl) seedbox to
Plex backend. Browse completed torrents, send a title to Plex through a TMDb
wizard, and watch transfer jobs — a browser client alongside the
[Alfred workflow](https://github.com/grigoriev/alfred-seedbox-workflow).

Vite + React + TypeScript. Talks to the sb-ctrl REST API with a bearer token;
the API URL and token are kept in the browser (localStorage), never in the code.

## Views

- **Torrents** — completed torrents, filterable; click one to open the
  Send-to-Plex wizard (pick the TMDb match, start the transfer).
- **Jobs** — transfer jobs with state / progress / ETA; retry a failed one.
- **Settings** — the API URL and bearer token. The URL defaults to `/api`, which
  is correct on any host that serves the UI and the API on one origin, so a new
  browser only needs the token.

## Development

```sh
npm install
npm run dev        # local dev server
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm test           # vitest + coverage
npm run build      # production build to dist/
```

Point it at a running sb-ctrl instance via **Settings**. Serve `dist/` behind
the same reverse proxy as the API, or from any static host on the LAN/VPN.

## Status

Beta. The torrent list, wizard, jobs view, and settings are implemented against
the sb-ctrl REST API; ~94% test coverage.
