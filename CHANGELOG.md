# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

Earlier releases are listed on the
[GitHub releases page](https://github.com/grigoriev/sb-ctrl-ui/releases).
