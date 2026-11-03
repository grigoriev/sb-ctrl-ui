# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before 0.6.1 are listed on the
[GitHub releases page](https://github.com/grigoriev/sb-ctrl-ui/releases).

## [Unreleased]

## [0.8.0] - 2026-11-03

### Added

- The wizard tells the same release from another version when a file is in the
  way. It compares the size the server reports with the size of the torrent, and
  still offers Replace. Sizes that round to the same value show in bytes. It needs
  sb-ctrl 0.9.0 or later, and shows the earlier warning with an older one.

### Fixed

- A failed Retry in the jobs view shows the error, as Log and Delete do. It
  failed without a message before, for example for a job deleted elsewhere.
- The error of Retry, Log or Delete stays above the job list until the next of
  these requests or Close. The poll every 3 s cleared it before, and it only
  flashed. It also stays when the poll empties the list or fails.
- Log shows the log of the last Log click. An earlier request that answered
  later replaced it before.

## [0.7.0] - 2026-11-03

### Changed

- **Breaking:** the image no longer runs Caddy or any web server. Run it once on a
  volume: it copies the app and `config.js` to `/out` and exits. The proxy serves the
  volume, with a fallback to `index.html`. sb-stack needs a matching change.
- The image is BusyBox with the built files and runs as UID 65534. Trivy finds no
  vulnerabilities in it. This closes the HIGH findings of Caddy and its Go modules.

- Vitest settings live in `vitest.config.ts` only. `vite.config.ts` held a second
  `test` block with lower coverage thresholds that never applied.
- The message for an unreachable server now reads "server unreachable: connect to VPN
  or LAN", without an em-dash.

## [0.6.2] - 2026-09-25

### Changed

- Release with the Bump Version & Release workflow. Its `v*` tag builds and pushes
  the image, then creates the GitHub release.
- The version bump moves the Unreleased entries of this changelog into a section for
  the new version. The GitHub release takes its notes from that section.
- CI builds the image on every pull request, scans it with Trivy (a fixable CRITICAL
  finding fails) and runs the new smoke test `tests/smoke-image.sh` on it.
- The publish workflow runs the same smoke test and pushes exactly the tested image,
  by digest from the local build cache, before it sets the tags.
- CI builds with Node.js 24, the version of the image build. `package.json` states it in
  `engines` and names the MIT license.
- Align the repository with the shared baseline: CI jobs have time limits, the version
  bump pushes without stored credentials, and a release run fails when the release
  exists already.
- CI also reports fixable HIGH findings of the image scan: in the job summary, and on
  `main` in one tracking issue that closes once the image is clean. A fixable CRITICAL
  finding still fails the build.

### Fixed

- The entrypoint writes a valid `config.js` in every case. An empty `SB_API_TOKEN`
  gave `window.SB_API_TOKEN=;`, a syntax error: the browser dropped the whole file,
  so a custom `SB_API_BASE` without a token was ignored. Values are now JSON string
  literals, with quotes, backslashes, control characters and `<` escaped.

### Security

- Rebuild Caddy v2.11.4 in the image with Go 1.26.8 and newer `golang.org/x/crypto`,
  `x/net`, `x/text` and `google.golang.org/grpc`. This fixes 17 HIGH findings in the
  Caddy binary, for which no Caddy release has a fix yet. The modules and the served
  configuration stay the same.

## [0.6.1] - 2026-09-24

### Security

- Audit the workflows with actionlint and zizmor in a new `lint` job.
- Lint the Dockerfile (Hadolint, `trivy config`) and the entrypoint (ShellCheck) in the `lint` job.
- Add the OpenSSF Scorecard workflow and its README badge.
- Limit the token permissions of every workflow.
- Stop persisting the checkout credentials.
- Let Renovate pin GitHub Actions by commit digest.
- Let Renovate refresh `package-lock.json` and raise OSV vulnerability alerts.
- Attest the published image: signed build provenance and an SPDX SBOM.
- Attach the provenance bundle and the SBOM to the GitHub release as assets.
- Renovate takes its common rules from the shared preset `github>grigoriev/renovate-config`.

### Added

- CHANGELOG.md, and Verify, Contributing and Disclaimer sections in the README.

### Changed

- Draw the job progress with a native `<progress>` element, styled like before.
- Trim trailing slashes of a release path without a backtracking regex.

### Fixed

- Run CI once per commit on a Renovate branch: drop `renovate/**` from the push trigger.
