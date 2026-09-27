# smart-health-checkin.github.io

The apex of smart-health-checkin.org: the home page, the design system and
shared chrome in `assets/` that every section loads, the root `llms.txt`, and
`llms-background.md`, the background every section's `llms.txt` starts with.

The sections are separate repos that deploy themselves; GitHub mounts each
one beneath this site by name:

| repo | serves |
| --- | --- |
| this one | `/`, `/assets/`, `/ktc/` |
| [client](https://github.com/smart-health-checkin/client) | `/client/` |
| [spec](https://github.com/smart-health-checkin/spec) | `/spec/` |
| [connectathon](https://github.com/smart-health-checkin/connectathon) | `/connectathon/` |

Every page on the domain loads `assets/site-chrome.js` and
`assets/smart-design.css` from here at runtime, so the look is shared and
changes everywhere at once. Menus are not: each section publishes its own
`nav.json` (`/spec/nav.json`, `/client/nav.json`, `/client/demo/nav.json`,
`/connectathon/nav.json`), and the chrome fetches them in the browser. This
repo knows only the section names, front pages, and where their `nav.json`
lives (`SECTIONS` in `assets/site-chrome.js`). Add a page to a section by
editing that section's `nav.json`, not this repo.

    scripts/build.sh                 # the apex, into _site/
    scripts/preview.sh               # the whole site from sibling checkouts, for a look
    python3 -m http.server -d /tmp/shc-preview 8000
