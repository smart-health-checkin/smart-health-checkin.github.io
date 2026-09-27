# Agent notes: smart-health-checkin.github.io (the apex)

Serves `/`, `/assets/`, and `/ktc/` on smart-health-checkin.org. The other
sections deploy from their own repos. [MAINTAINING.md](MAINTAINING.md) is the
map of every repo: what each publishes and consumes, what triggers what, and
how to release. Read it before changing anything that crosses repositories.

- Build: `bun install && scripts/build.sh` (into `_site/`). Whole-site preview from sibling
  checkouts: `scripts/preview.sh`.
- Deploys on every push to `main`.
- `assets/site-chrome.js` and `assets/smart-design.css` load at runtime on
  every page of the domain, so a mistake here breaks every section at once.
  Check the pages of each section after changing them. Tools load
  `assets/smart-json.js`. `assets/components.html` shows every token and
  component; check it in light, `?theme=dark`, and `?theme=auto` with the
  reader's scheme set to dark.
- Colors: change a value in the `--theme-*` blocks (light, and both dark
  blocks), never in a section's CSS, and keep every text pair at 4.5:1.
  Keep old token names working.
- The page API (placeholders for the bar, breadcrumb, tool bar, and footer;
  `<main id="main">`; breakpoints 64rem and 46rem) is documented in
  MAINTAINING.md, "The shared site". Other repos build on it: keep it
  backward compatible, and update that section with any change.
- Test chrome changes on live pages by serving the local files through
  request interception (headless Chromium, 390x844 and 1280x800): no
  sideways scroll, bar height, menu contents against each `nav.json`,
  keyboard (Tab, Enter, Escape), and layout shift.
- `llms-background.md` is the hand-written background every section's
  `llms.txt` starts with; the sections fetch it from the live site at
  build time. `scripts/llms.ts` writes the root `llms.txt`: the background,
  the home page, and the KTC deck. Keep the background accurate against the spec and about 1,000
  words. See MAINTAINING.md, "llms.txt", including which parts of
  `scripts/llms.ts` must match the sections' copies.
- Menus belong to the sections: each publishes `nav.json`. Only edit
  `SECTIONS` in `assets/site-chrome.js` to add or rename a whole section.
- `/.well-known/assetlinks.json` vouches for the example native app
  (`org.smarthealthit.checkin.verifier`, shared signing key) so Chrome grants
  the client bridge page's message channel. Update it if the app's package or
  signing key changes (MAINTAINING.md, "Native apps").
