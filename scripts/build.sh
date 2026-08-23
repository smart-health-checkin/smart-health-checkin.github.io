#!/usr/bin/env bash
# Builds the apex of smart-health-checkin.org: the home page, the assets every
# section loads, CNAME, the KTC deck, and llms.txt.
#
# The sections deploy themselves. GitHub mounts each repo in the org beneath
# this one by name — client → /client/, spec → /spec/ — so nothing here builds
# them; scripts/preview.sh assembles the whole site locally for a look.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${OUT_DIR:-_site}"
KTC="${KTC_DIR:-../ktc}"
ORIGIN="https://smart-health-checkin.org"

rm -rf "$OUT" && mkdir -p "$OUT"
cp index.html 404.html CNAME "$OUT/"
cp -r assets "$OUT/assets"
touch "$OUT/.nojekyll"

# The Closing the Loop deck: hosted here at its original URL, not in the nav.
if [ -f "$KTC/closing-the-loop.html" ]; then
  mkdir -p "$OUT/ktc/closing-the-loop"
  cp "$KTC/closing-the-loop.html" "$OUT/ktc/closing-the-loop/index.html"
  echo "ktc: copied"
else
  echo "warning: $KTC/closing-the-loop.html not found; skipping /ktc/" >&2
fi

# llms.txt indexes the sections; llms-full.txt concatenates their own bundles,
# fetched from the live site because they deploy separately. A section that
# isn't up yet is noted, not fatal.
{
  echo "# SMART Health Check-in"
  echo
  echo "> An open protocol for pre-visit check-in: a provider's page asks the patient's health app for what the visit needs over the W3C Digital Credentials API, and the verified answer comes back to that same page."
  echo
  echo "## Sections"
  echo "- [Specification]($ORIGIN/spec/llms.txt): the protocol, explainers, wire format, conformance fixtures"
  echo "- [JavaScript client]($ORIGIN/client/llms.txt): install, guides, API reference"
  echo
  echo "## Optional"
  echo "- [Everything in one file]($ORIGIN/llms-full.txt)"
} > "$OUT/llms.txt"
{
  echo "# SMART Health Check-in — everything"
  for section in spec client; do
    echo; echo; echo "---"; echo
    if body=$(curl -fsS --max-time 20 "$ORIGIN/$section/llms-full.txt" 2>/dev/null); then
      printf '%s\n' "$body"
    else
      echo "($ORIGIN/$section/llms-full.txt was not reachable when this file was built)"
    fi
  done
} > "$OUT/llms-full.txt"

echo "Built $OUT"
