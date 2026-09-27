#!/usr/bin/env bash
# Builds the apex of smart-health-checkin.org: the home page, the assets every
# section loads, CNAME, the KTC deck, the shared llms background, and llms.txt.
#
# The sections deploy themselves. GitHub mounts each repo in the org beneath
# this one by name — client → /client/, spec → /spec/ — so nothing here builds
# them; scripts/preview.sh assembles the whole site locally for a look.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${OUT_DIR:-_site}"
ORIGIN="https://smart-health-checkin.org"

rm -rf "$OUT" && mkdir -p "$OUT"
cp index.html 404.html CNAME favicon.ico favicon.svg apple-touch-icon.png "$OUT/"
cp -r assets "$OUT/assets"
touch "$OUT/.nojekyll"
# Digital Asset Links: lets the example native app (android-wallet/verifier-app, signed
# with the shared key) open a message channel to pages on this domain from a
# Custom Tab. See /client/docs/native-apps.html.
cp -r .well-known "$OUT/.well-known"

# The Closing the Loop deck (moved here from the archived ktc repo), at its original URL, not in the nav.
mkdir -p "$OUT/ktc/closing-the-loop"
cp ktc/closing-the-loop.html "$OUT/ktc/closing-the-loop/index.html"

# llms-background.md is the background every section's llms.txt starts with;
# the sections fetch it from here at build time. This section's llms.txt is the
# background, the home page, and the KTC deck (scripts/llms.ts).
cp llms-background.md "$OUT/llms-background.md"
bun scripts/llms.ts "$OUT"

echo "Built $OUT"
