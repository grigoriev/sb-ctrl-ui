#!/usr/bin/env bash
# Smoke test of a built sb-ctrl-ui image: run it on a volume, as sb-stack does,
# then check what it leaves there. The page, its assets, the config.js the
# entrypoint writes, and no files of an earlier run. Then evaluate config.js
# for several environments in the Node image of the build stage.
#
# Usage: tests/smoke-image.sh <image>    (needs Docker)
# CI runs it on every pull request, and docker-publish.yml on the image it pushes.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${1:?usage: tests/smoke-image.sh <image>}"
VOLUME="sb-ctrl-ui-smoke-$$"

cleanup() {
  docker volume rm -f "$VOLUME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

fail() {
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

# deploy [docker run args...]: runs the image on the volume, as sb-stack does.
deploy() {
  docker run --rm ${platform[@]+"${platform[@]}"} -v "$VOLUME:/out" "$@" "$IMAGE"
}

# in_volume <command...>: runs a command of the image on the volume.
in_volume() {
  local cmd="$1"
  shift
  docker run --rm ${platform[@]+"${platform[@]}"} -v "$VOLUME:/out" \
    --entrypoint "$cmd" "$IMAGE" "$@"
}

docker volume create "$VOLUME" >/dev/null || fail "cannot create volume $VOLUME"

out="$(deploy 2>&1)" || fail "the image did not exit with 0. Output: $out"
pass "the image copies the app and exits with 0"

# check_file <name> <path> <want>: the file in the volume holds the text.
check_file() {
  local name="$1" path="$2" want="$3" body
  body="$(in_volume cat "/out/$path")" || fail "$name: no /out/$path"
  case "$body" in
    *"$want"*) ;;
    *) fail "$name: /out/$path lacks '$want'. Body: $body" ;;
  esac
  pass "$name"
}

check_file "copies index.html" index.html '<title>sb-ctrl</title>'
check_file "index.html loads config.js" index.html '<script src="/config.js"></script>'
check_file "writes config.js with the default /api base" config.js 'window.SB_API_BASE="/api";'

# Every asset index.html names must be in the volume.
assets="$(in_volume cat /out/index.html | grep -o '/assets/[^"]*' | sort -u)"
[ -n "$assets" ] || fail "index.html names no assets"
for asset in $assets; do
  in_volume test -s "/out$asset" || fail "missing asset $asset"
done
pass "copies the assets index.html names"

# An upgrade runs the new image on the old volume. Files of the old version go.
in_volume touch /out/stale.js || fail "cannot write to the volume"
deploy >/dev/null 2>&1 || fail "the second run did not exit with 0"
if in_volume test -e /out/stale.js; then
  fail "a file of an earlier run stays in the volume"
fi
pass "a new run removes the files of an earlier run"

# A run that cannot copy keeps the earlier build served. A read-only assets
# directory makes the copy fail.
in_volume sh -c 'echo old-build > /out/index.html && chmod 555 /out/assets' \
  || fail "cannot prepare the failing run"
if deploy >/dev/null 2>&1; then
  fail "a run that cannot copy exits with 0"
fi
check_file "a failed run keeps the earlier index.html" index.html old-build
in_volume chmod 755 /out/assets || fail "cannot restore the assets directory"
deploy >/dev/null 2>&1 || fail "the run after a failed one did not exit with 0"
check_file "the run after a failed one copies index.html" index.html '<title>sb-ctrl</title>'

uid="$(docker image inspect -f '{{.Config.User}}' "$IMAGE")"
case "$uid" in
  '' | 0 | 0:* | root | root:*) fail "the image runs as root" ;;
  *) pass "the image runs as $uid" ;;
esac

# The browser drops a config.js with a syntax error, and the app then falls
# back to its defaults. So run it as JavaScript with a stand-in window, in the
# Node image of the build stage, and compare what it sets.
NODE_IMAGE="$(sed -n 's/^FROM \(node:[^ ]*\) AS build$/\1/p' Dockerfile)"
[ -n "$NODE_IMAGE" ] || fail "no node image in the Dockerfile"

# config_js [docker run args...]: the config.js the entrypoint writes.
config_js() {
  deploy "$@" >/dev/null 2>&1 || fail "the image did not exit with 0 for: $*"
  in_volume cat /out/config.js
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
