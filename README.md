# sb-ctrl-ui

[![CI](https://github.com/grigoriev/sb-ctrl-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/grigoriev/sb-ctrl-ui/actions/workflows/ci.yml)
[![Publish image](https://github.com/grigoriev/sb-ctrl-ui/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/grigoriev/sb-ctrl-ui/actions/workflows/docker-publish.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/grigoriev/sb-ctrl-ui/badge)](https://scorecard.dev/viewer/?uri=github.com/grigoriev/sb-ctrl-ui)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/14806/badge)](https://www.bestpractices.dev/projects/14806)
[![Release](https://img.shields.io/github/v/release/grigoriev/sb-ctrl-ui)](https://github.com/grigoriev/sb-ctrl-ui/releases)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=grigoriev_sb-ctrl-ui&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=grigoriev_sb-ctrl-ui)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=grigoriev_sb-ctrl-ui&metric=coverage)](https://sonarcloud.io/summary/new_code?id=grigoriev_sb-ctrl-ui)

React web UI for the [sb-ctrl](https://github.com/grigoriev/sb-ctrl) seedbox to
Plex backend. Browse completed torrents, send a title to Plex through a TMDb
wizard, and watch transfer jobs — a browser client alongside the
[Alfred workflow](https://github.com/grigoriev/alfred-seedbox-workflow).

Vite + React + TypeScript. Talks to the sb-ctrl REST API with a bearer token;
the API URL, and a bearer token when a deployment needs one, come from the
container environment, never from the code or the browser.

## Views

- **Torrents** — completed torrents, filterable, across the full width so a
  release name fits on one line. A badge says what Plex already holds of it,
  and one button opens the dialog: the TMDb description, the destination the
  transfer lands in, and a warning when something is there already. TMDb only
  proposes: the search query, the name in the library and the library itself
  are all editable, and the destination line follows them. Nothing leaves
  until **Start transfer**. A running transfer shows its percent, rate
  and ETA in the row, refreshed from the job list.
The header names both builds, `ui <version> · api <version>`: the UI version
is baked in from package.json, the API version comes from `GET /health`.

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

## Container image

Each GitHub release publishes `ghcr.io/grigoriev/sb-ctrl-ui:<version>`.
[sb-stack](https://github.com/grigoriev/sb-stack) runs it.

### Verify

Images published after 0.6.0 carry a signed build provenance and an SPDX SBOM
attestation. Check that this repository's workflow built an image:

```sh
gh attestation verify oci://ghcr.io/grigoriev/sb-ctrl-ui:<tag> --owner grigoriev
```

Add `--predicate-type https://spdx.dev/Document/v2.3` to check the SBOM.

GitHub releases after 0.6.0 carry both as assets: `sb-ctrl-ui-<tag>.intoto.jsonl`
(the provenance bundle) and `sb-ctrl-ui-<tag>.spdx.json` (the SBOM). To check against
the downloaded bundle, add `--bundle sb-ctrl-ui-<tag>.intoto.jsonl`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

This software is provided "as is", without warranty of any kind, as the LICENSE states. Use
it at your own risk. Sergey Grigoriev is not liable for damage from its use, as far as the law
allows. It is published free of charge, outside of any commercial offering, with no
obligation to support it. Security reports are welcome, see [SECURITY.md](SECURITY.md).

## License

MIT License - see [LICENSE](LICENSE) for details.
