# smart-health-checkin.github.io

The apex of smart-health-checkin.org: the home page, the design system and
shared chrome in `assets/` that every section loads, and `llms.txt`.

The sections are separate repos that deploy themselves; GitHub mounts each
one beneath this site by name:

| repo | serves |
| --- | --- |
| this one | `/`, `/assets/`, `/ktc/` |
| [client](https://github.com/smart-health-checkin/client) | `/client/` |
| [spec](https://github.com/smart-health-checkin/spec) | `/spec/` |

    scripts/build.sh                 # the apex, into _site/
    scripts/preview.sh               # the whole site from sibling checkouts, for a look
    python3 -m http.server -d /tmp/shc-preview 8000
