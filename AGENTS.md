# Agent notes: smart-health-checkin.github.io (the apex)

Serves `/`, `/assets/`, and `/ktc/` on smart-health-checkin.org. The other
sections deploy from their own repos. [MAINTAINING.md](MAINTAINING.md) is the
map of every repo: what each publishes and consumes, what triggers what, and
how to release. Read it before changing anything that crosses repositories.

- Build: `scripts/build.sh` (into `_site/`). Whole-site preview from sibling
  checkouts: `scripts/preview.sh`.
- Deploys on every push to `main`.
- `assets/site-chrome.js` and `assets/smart-design.css` load at runtime on
  every page of the domain, so a mistake here breaks every section at once.
  Check the pages of each section after changing them.
- The page API (placeholders for the bar, breadcrumb, tool bar, and footer;
  `<main id="main">`; breakpoints 64rem and 46rem) is documented in
  MAINTAINING.md, "The shared site". Other repos build on it: keep it
  backward compatible, and update that section with any change.
- Test chrome changes on live pages by serving the local files through
  request interception (headless Chromium, 390x844 and 1280x800): no
  sideways scroll, bar height, menu contents against each `nav.json`,
  keyboard (Tab, Enter, Escape), and layout shift.
- Menus belong to the sections: each publishes `nav.json`. Only edit
  `SECTIONS` in `assets/site-chrome.js` to add or rename a whole section.
- `/.well-known/assetlinks.json` vouches for the example native app
  (`org.smarthealthit.checkin.verifier`, shared signing key) so Chrome grants
  the client bridge page's message channel. Update it if the app's package or
  signing key changes (MAINTAINING.md, "Native apps").
