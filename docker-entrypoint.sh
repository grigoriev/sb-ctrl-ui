#!/bin/sh
# Copies the built app from /srv to /out, the volume the proxy serves, then
# exits. The app is static, so it cannot read the environment. Write what it
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

OUT=/out

# The earlier build stays served until this one is complete. A failed step
# exits before index.html changes, and the earlier index.html names only its
# own assets.
#
# put <source> <target>: writes a temporary file next to the target, then
# renames it. The target is the old file or the new one, never a partial one.
put() {
  cp "$1" "$2.new"
  mv -f "$2.new" "$2"
}

# 1. Copy all but index.html. Asset names carry a hash, so they do not collide.
(cd /srv && find . -type d) | while IFS= read -r d; do
  mkdir -p "$OUT/$d"
done
(cd /srv && find . -type f ! -path ./index.html) | while IFS= read -r f; do
  put "/srv/$f" "$OUT/$f"
done

# 2. Replace config.js, then index.html, which switches the page to this build.
{
  printf 'window.SB_API_BASE=%s;\n' "$(js_string SB_API_BASE)"
  printf 'window.SB_API_TOKEN=%s;\n' "$(js_string SB_API_TOKEN)"
} > "$OUT/config.js.new"
mv -f "$OUT/config.js.new" "$OUT/config.js"
put /srv/index.html "$OUT/index.html"

# 3. Remove what the earlier build left and this one does not ship.
find "$OUT" -mindepth 1 -depth | while IFS= read -r f; do
  rel="${f#"$OUT"/}"
  [ "$rel" = config.js ] && continue
  [ -e "/srv/$rel" ] || rm -rf "$f"
done

echo "sb-ctrl-ui: copied the app to $OUT"
