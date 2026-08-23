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

if [ -d "$SRC/client" ]; then
  ( cd "$SRC/client" && SITE_BASE=/client OUT_DIR="$OUT/client" scripts/build-pages.sh >/dev/null ) && echo "client: built"
else echo "warning: $SRC/client not found" >&2; fi

if [ -d "$SRC/spec" ] && [ -z "${SKIP_SPEC:-}" ]; then
  [ -d "$SRC/spec/rp-web/node_modules" ] || ( cd "$SRC/spec/rp-web" && bun install --frozen-lockfile >/dev/null )
  ( cd "$SRC/spec" && scripts/build-pages.sh "$OUT/spec" >/dev/null ) && echo "spec: built"
else echo "warning: $SRC/spec not found or SKIP_SPEC set" >&2; fi

# Locally the sections' bundles are on disk, so the site-wide file can be real.
{
  echo "# SMART Health Check-in — everything"
  for f in "$OUT/spec/llms-full.txt" "$OUT/client/llms-full.txt"; do
    [ -f "$f" ] && { echo; echo; echo "---"; echo; cat "$f"; }
  done
} > "$OUT/llms-full.txt"

echo "Assembled $OUT:"
find "$OUT" -maxdepth 2 -type d | sed "s|$OUT|.|" | sort
