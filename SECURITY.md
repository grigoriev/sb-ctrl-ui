# Security policy

## Reporting a vulnerability

Report a vulnerability privately through GitHub:
https://github.com/grigoriev/sb-ctrl-ui/security/advisories/new
(the **Security** tab, **Report a vulnerability**). Do not open a public issue for it.

We answer within a week. The fix goes into the next release, and its release notes name it.

## Supported versions

Only the latest release gets fixes, and with it the image `ghcr.io/grigoriev/sb-ctrl-ui:latest`.

## Scope

The code in `src/`, the Dockerfile, the Caddyfile, the entrypoint, the scripts and the workflows
belong to this repository.

Vulnerabilities in upstream software (React, Bootstrap and the other npm packages, Caddy, Node.js
and the base images) belong to the upstream project. Tell us as well if this project is affected,
so we can release a fix when the upstream fix is out.
