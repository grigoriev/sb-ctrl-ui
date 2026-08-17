#!/bin/sh
# The built app is static, so it cannot read the environment. Write what it
# needs into a script the page loads before its bundle.
#
# SB_API_BASE  where the API lives, default /api (same origin as this page)
# SB_API_TOKEN bearer token, only for deployments whose proxy does not add one.
#              Anyone who can load the page can read it.
set -eu

: "${SB_API_BASE:=/api}"
: "${SB_API_TOKEN:=}"

{
  printf 'window.SB_API_BASE=%s;\n' "$(printf '%s' "$SB_API_BASE" | sed 's/\\/\\\\/g; s/"/\\"/g; s/.*/"&"/')"
  printf 'window.SB_API_TOKEN=%s;\n' "$(printf '%s' "$SB_API_TOKEN" | sed 's/\\/\\\\/g; s/"/\\"/g; s/.*/"&"/')"
} > /srv/config.js

exec "$@"
