# CLAUDE.md

This file guides Claude Code when it works on or reviews this repository.

## Project Overview

sb-ctrl-ui is the React web UI for the `sb-ctrl` seedbox to Plex backend. It lists completed
torrents, sends a title to Plex through a TMDb wizard, and shows transfer jobs. The image serves
the static build with Caddy. `sb-stack` runs it behind a TLS proxy, with the API under `/api`.

## Tech Stack

- **Language**: TypeScript 7 (`tsc -b`), React 19, Bootstrap 5
- **Build**: Vite 8, Node.js 24 (`engines` in `package.json`)
- **Lint**: oxlint (`.oxlintrc.json`)
- **Tests**: Vitest 5 with jsdom, Testing Library, v8 coverage
- **Image**: Node build stage, then a Caddy rebuilt from source, all bases pinned by digest

## Common Commands

```sh
npm ci                                  # install the dependencies
npm run dev                             # local dev server
npm run lint                            # oxlint
npm run typecheck                       # tsc -b
npm test                                # vitest with coverage
npm run build                           # production build to dist/
docker build -t sb-ctrl-ui:test .       # build the image
tests/smoke-image.sh sb-ctrl-ui:test    # start the image and check what Caddy serves
```

## Architecture

- `src/api.ts`: the typed REST client (`Api`), response types, formatting helpers, `runtimeConfig`
- `src/App.tsx`: tabs (`torrents`, `jobs`) from the URL fragment, login gate, version header
- `src/components/`: `Torrents`, `Wizard`, `Jobs`, `Login`, `Ring`. Each has a `*.test.tsx`
- `src/theme.ts`: mirrors the OS color scheme onto Bootstrap `data-bs-theme`
- `src/test/setup.ts`: jest-dom matchers and an in-memory `localStorage`
- `docker-entrypoint.sh`: writes `/srv/config.js` from `SB_API_BASE` and `SB_API_TOKEN`
- `Caddyfile`: plain HTTP on `:80`, gzip, single-page fallback to `index.html`
- `index.html` loads `/config.js` before the bundle. `__UI_VERSION__` comes from `package.json`

Vitest reads `vitest.config.ts`, which sets 100% coverage thresholds. `vite.config.ts` holds the
build settings only. Do not add a `test` block there.

## Code Style

- Function components with hooks. Props typed as `Readonly<{ ... }>`
- All network calls go through the `Api` class in `src/api.ts`
- Type API fields that older sb-ctrl versions omit as optional, with a comment on the version
- Bootstrap classes for layout. Add CSS to `src/index.css` only when Bootstrap has no class
- Tests next to the source file, named `*.test.ts` or `*.test.tsx`
- No em-dash in user-visible strings

## Review Focus

Flag these in a pull request:

- A secret or API URL in source code. Both come from the container environment only
- Credentials in `localStorage`, `sessionStorage` or a readable cookie. The session is an HttpOnly cookie
- A `fetch` outside `src/api.ts`, or a change to `credentials: 'same-origin'`
- A change to `js_string` in `docker-entrypoint.sh` that stops escaping quotes, `\` or `<`
- A new field read as required when older sb-ctrl versions do not send it
- A change that assumes an sb-ctrl API not yet released
- `dangerouslySetInnerHTML` or other raw HTML from API or TMDb data
- Polling without cleanup on unmount (`Torrents` polls the job list every 3 s)
- Missing or weakened tests. Coverage gates are strict
- New runtime dependencies. The runtime set is React, React DOM and Bootstrap
- An unpinned base image or a changed Go module pin in the `Dockerfile` without reason
- No `## [Unreleased]` entry in `CHANGELOG.md`, or README not updated for a behavior change
- Workflow changes without SHA-pinned actions, `persist-credentials: false`, or `timeout-minutes`

## CI/CD and Release

- `ci.yml`: ShellCheck, Hadolint, actionlint, zizmor, `trivy config`, lint, type check, tests,
  build, SonarCloud, image build with Trivy scan and smoke test. A fixable CRITICAL finding fails
- `bump-version.yml`: manual, runs `npm version`, cuts the changelog section, tags `vX.Y.Z`
- `docker-publish.yml`: on `v*` tags, pushes the tested image to `ghcr.io/grigoriev/sb-ctrl-ui`
  by digest, attests provenance and SBOM, creates the immutable GitHub release
- CI installs with `npm ci --ignore-scripts`. Renovate updates the dependencies

Commit, branch and pull request rules are in `CONTRIBUTING.md`.
