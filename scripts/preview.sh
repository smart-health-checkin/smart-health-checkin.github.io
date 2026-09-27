#!/usr/bin/env bash
# Assemble the whole site locally, the way GitHub composes it: this repo at
# the apex, client at /client/, spec at /spec/. For looking at it before you
# push — each repo deploys itself.
#
#   scripts/preview.sh [out-dir]     siblings in ..; SKIP_SPEC=1 skips the slow one
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/shc-preview}"
SRC="${SRC_DIR:-..}"

OUT_DIR="$OUT" KTC_DIR="$SRC/ktc" scripts/build.sh >/dev/null
OUT="$(cd "$OUT" && pwd)"
# The sections' llms.txt starts with this checkout's background, not the live one.
export LLMS_BACKGROUND="$PWD/llms-background.md"

if [ -d "$SRC/client" ]; then
  ( cd "$SRC/client" && SITE_BASE=/client OUT_DIR="$OUT/client" scripts/build-pages.sh >/dev/null ) && echo "client: built"
else echo "warning: $SRC/client not found" >&2; fi

if [ -d "$SRC/spec" ] && [ -z "${SKIP_SPEC:-}" ]; then
  [ -d "$SRC/spec/node_modules" ] || ( cd "$SRC/spec" && bun install --frozen-lockfile >/dev/null )
  ( cd "$SRC/spec" && scripts/build-pages.sh "$OUT/spec" >/dev/null ) && echo "spec: built"
else echo "warning: $SRC/spec not found or SKIP_SPEC set" >&2; fi

echo "Assembled $OUT:"
find "$OUT" -maxdepth 2 -type d | sed "s|$OUT|.|" | sort
