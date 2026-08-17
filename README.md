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
the API URL, and a bearer token when a deployment needs one, come from the
container environment, never from the code or the browser.

## Views

- **Torrents** — completed torrents, filterable; click one to open the
  Send-to-Plex wizard (pick the TMDb match, start the transfer).
- **Jobs** — transfer jobs with state / progress / ETA; retry a failed one.
- **Sign in** — shown when the API reports `login_required`. The session lives in
  an HttpOnly cookie the server sets, so the browser stores no credentials.
## Configuration

The built app is static, so its entrypoint writes `/config.js` from the
environment before Caddy starts.

| Variable | Default | Meaning |
|----------|---------|---------|
| `SB_API_BASE` | `/api` | Where the API lives. The default is right whenever one origin serves the UI and the API. |
| `SB_API_TOKEN` | empty | Bearer token, only for a deployment whose proxy does not add one. Anyone who can load the page can read it, so prefer the proxy. |

## Development

```sh
npm install
npm run dev        # local dev server
npm run lint       # oxlint
npm run typecheck  # tsc -b
npm test           # vitest + coverage
npm run build      # production build to dist/
```

Serve `dist/` behind the same reverse proxy as the API. Authentication belongs
to that proxy: it adds the bearer token, so no browser has to hold one.

## Status

Beta. The torrent list, wizard, jobs view, and settings are implemented against
the sb-ctrl REST API; ~94% test coverage.
