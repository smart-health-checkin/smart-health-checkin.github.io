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
- Menus belong to the sections: each publishes `nav.json`. Only edit
  `SECTIONS` in `assets/site-chrome.js` to add or rename a whole section.
