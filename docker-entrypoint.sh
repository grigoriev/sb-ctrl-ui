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
export SB_API_BASE SB_API_TOKEN

# Prints the environment variable named $1 as a JSON string literal, which is
# also a JavaScript string. An empty value gives "". Escapes the backslash, the
# double quote, control characters and "<", so no value can end the string or
# a surrounding script element. awk reads the value from ENVIRON, since -v
# would interpret backslashes.
js_string() {
  awk -v name="$1" 'BEGIN {
    for (i = 1; i < 32; i++) esc[sprintf("%c", i)] = sprintf("\\u%04x", i)
    esc["\n"] = "\\n"; esc["\r"] = "\\r"; esc["\t"] = "\\t"
    esc["\\"] = "\\\\"; esc["\""] = "\\\""; esc["<"] = "\\u003c"
    s = ENVIRON[name]
    out = ""
    for (i = 1; i <= length(s); i++) {
      c = substr(s, i, 1)
      out = out ((c in esc) ? esc[c] : c)
    }
    printf "\"%s\"", out
  }'
}

{
  printf 'window.SB_API_BASE=%s;\n' "$(js_string SB_API_BASE)"
  printf 'window.SB_API_TOKEN=%s;\n' "$(js_string SB_API_TOKEN)"
} > /srv/config.js

exec "$@"
