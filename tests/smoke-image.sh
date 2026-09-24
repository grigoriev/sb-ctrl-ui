#!/usr/bin/env bash
# Smoke test of a built sb-ctrl-ui image: start it, then check that Caddy serves
# the page, the config.js the entrypoint writes, and the single-page fallback.
# Then evaluate config.js for several environments in the Node image of the
# build stage.
#
# Usage: tests/smoke-image.sh <image>    (needs Docker and curl)
# CI runs it on every pull request, and docker-publish.yml on the image it pushes.
# SMOKE_PORT sets the local port, default 18080.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${1:?usage: tests/smoke-image.sh <image>}"
SMOKE_PORT="${SMOKE_PORT:-18080}"
BASE="http://127.0.0.1:${SMOKE_PORT}"
NAME="sb-ctrl-ui-smoke-$$"

failed=0
cleanup() {
  if [ "$failed" -ne 0 ]; then
    echo "--- container logs ---"
    docker logs "$NAME" 2>&1 || true
  fi
  docker rm -f "$NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
  failed=1
  echo "FAIL: $*" >&2
  exit 1
}

pass() {
  echo "ok: $*"
}

# Run the image on its own platform: an amd64 image on an arm64 host then
# prints no warning. A pulled multi-arch image can report no platform.
platform=()
os_arch="$(docker image inspect -f '{{.Os}}/{{.Architecture}}' "$IMAGE")" || fail "no image $IMAGE"
[ "$os_arch" = / ] || platform=(--platform "$os_arch")
docker run -d --name "$NAME" ${platform[@]+"${platform[@]}"} \
  -p "127.0.0.1:${SMOKE_PORT}:80" \
  "$IMAGE" >/dev/null || fail "container did not start"

# GET <path> [curl args...]: prints the body, then the status code on the last line.
get() {
  local path="$1"
  shift
  curl -sS --max-time 10 -w '\n%{http_code}' "$@" "${BASE}${path}"
}

for _ in $(seq 1 30); do
  if out="$(get / 2>/dev/null)" && [ "${out##*$'\n'}" = 200 ]; then
    break
  fi
  [ "$(docker inspect -f '{{.State.Running}}' "$NAME")" = true ] || fail "container exited"
  sleep 1
done

check() {
  local name="$1" path="$2" want_code="$3" want_body="$4"
  shift 4
  local out code body
  out="$(get "$path" "$@")" || fail "$name: request failed"
  code="${out##*$'\n'}"
  body="${out%$'\n'*}"
  [ "$code" = "$want_code" ] || fail "$name: HTTP $code, want $want_code. Body: $body"
  case "$body" in
    *"$want_body"*) ;;
    *) fail "$name: body lacks '$want_body'. Body: $body" ;;
  esac
  pass "$name"
}

check "serves index.html" / 200 '<title>sb-ctrl</title>'
check "index.html loads config.js" / 200 '<script src="/config.js"></script>'
check "serves config.js with the default /api base" /config.js 200 'window.SB_API_BASE="/api";'
check "falls back to index.html for a client route" /jobs 200 '<title>sb-ctrl</title>'

# The browser drops a config.js with a syntax error, and the app then falls
# back to its defaults. So run it as JavaScript with a stand-in window, in the
# Node image of the build stage, and compare what it sets.
NODE_IMAGE="$(sed -n 's/^FROM \(node:[^ ]*\) AS build$/\1/p' Dockerfile)"
[ -n "$NODE_IMAGE" ] || fail "no node image in the Dockerfile"

# config_js [docker run args...]: the config.js the entrypoint writes.
config_js() {
  docker run --rm ${platform[@]+"${platform[@]}"} "$@" "$IMAGE" cat /srv/config.js
}

# check_config <name> <want JSON> [docker run args...]
check_config() {
  local name="$1" want="$2"
  shift 2
  local got
  got="$(config_js "$@" | docker run --rm -i "$NODE_IMAGE" node -e '
    const window = {}
    new Function("window", require("fs").readFileSync(0, "utf8"))(window)
    process.stdout.write(JSON.stringify(window))')" || fail "$name: config.js is not valid JavaScript"
  [ "$got" = "$want" ] || fail "$name: got $got, want $want"
  pass "$name"
}

check_config "default env gives base /api and an empty token" \
  '{"SB_API_BASE":"/api","SB_API_TOKEN":""}'
check_config "an empty SB_API_BASE gives /api" \
  '{"SB_API_BASE":"/api","SB_API_TOKEN":""}' -e SB_API_BASE=
check_config "a custom SB_API_BASE without a token is honored" \
  '{"SB_API_BASE":"https://api.example.test/sb","SB_API_TOKEN":""}' \
  -e SB_API_BASE=https://api.example.test/sb
token=$'q"uo\'te\\back</script>\nline\ttab'
check_config "a token with quotes, backslashes and newlines is escaped" \
  '{"SB_API_BASE":"/api","SB_API_TOKEN":"q\"uo'"'"'te\\back</script>\nline\ttab"}' \
  -e "SB_API_TOKEN=$token"
case "$(config_js -e "SB_API_TOKEN=$token")" in
  *'</'*) fail "config.js carries a literal </ that could end a script element" ;;
  *) pass "config.js escapes < in values" ;;
esac

echo "smoke test passed: $IMAGE"
