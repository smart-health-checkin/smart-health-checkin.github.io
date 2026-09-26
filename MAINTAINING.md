# Maintaining SMART Health Check-in

How the repositories fit together: what each one publishes, what it consumes,
what triggers what, and what to update when something is released. Each repo's
`AGENTS.md` covers its own commands and points here for anything that crosses
repositories.

## The repositories

| Repo | What it is | Deploys | Publishes | Consumes |
| --- | --- | --- | --- | --- |
| [smart-health-checkin.github.io](https://github.com/smart-health-checkin/smart-health-checkin.github.io) (the apex) | Home page, shared look (`assets/`), this file | `/`, `/assets/`, `/ktc/` on every push to `main` | Nothing versioned | Each section's `nav.json`, in the browser |
| [spec](https://github.com/smart-health-checkin/spec) | The draft spec, explainers, capture inspector, conformance fixtures | `/spec/` on every push to `main` | `fixtures-vN` tags | client (release tarball) |
| [client](https://github.com/smart-health-checkin/client) | The JavaScript library, its docs and demos | `/client/` on every push to `main`, and after every release | `vX.Y.Z` GitHub releases: npm tarball plus hosted bundles | spec fixtures (tag) |
| [connectathon](https://github.com/smart-health-checkin/connectathon) | Scenarios, Testing EHR, testing wallet, participant registry, results | `/connectathon/` on push to `main`, hourly, and on issue changes | Nothing versioned | client (release tarball), the Android APK (latest release) |
| [android-wallet](https://github.com/smart-health-checkin/android-wallet) | The sample Android wallet | Nothing | `wallet-vX.Y.Z` GitHub releases: the APK | spec fixtures (tag), client (release tarball, for test vectors) |
| [swift](https://github.com/smart-health-checkin/swift) | The Swift package | Nothing | `vX.Y.Z` tags (Swift Package Manager installs from tags; first is `v0.1.0`) | spec fixtures (tag) |
| [notes](https://github.com/smart-health-checkin/notes), ktc (archived) | Working notes; the retired KTC site | Nothing | Nothing | Nothing |

Dependencies only run one way:

```
spec (fixtures-vN) ──► client, android-wallet, swift, connectathon (conformance cases)
client (vX.Y.Z)    ──► connectathon, spec, android-wallet, outside developers
android-wallet (wallet-vX.Y.Z) ──► connectathon's Android CI, download links
apex (assets/, runtime) ──► every page on the domain
each section (nav.json, runtime) ──► the apex's menus
```

Nothing is shared by copying files between repos, and there are no submodules.

## Rules

- **Tags and releases never move.** Fix a mistake with a new version. Client
  releases are immutable once published (the repo setting is on).
- **Consumers pin.** Every consumer names an exact client version or fixtures
  tag. Upgrading is a commit in the consumer.
- **Everyone pushes to `main`.** Each repo's site deploys from `main`.

## What triggers what

| Event | What runs |
| --- | --- |
| Push to `main` in apex, spec, client, or connectathon | That repo's site builds and deploys |
| Push a `vX.Y.Z` tag in client | `release.yml`: checks the tag matches `package.json`, tests, attaches the tarball and bundles to a GitHub release, then runs the client's Pages deploy, which serves the new `/client/lib/X.Y.Z/` |
| Push a `wallet-vX.Y.Z` tag in android-wallet | `android-release.yml`: builds and signs the APK and attaches it to a release; `releases/latest/download/…` now serves it |
| connectathon site deploy completes | connectathon's self-test drives the live Testing EHR against the live testing wallet; failures open an issue |
| Nightly | connectathon: self-test, and the Android end-to-end run against the latest APK |
| Hourly | connectathon: site rebuild (registry, results) and wallet-registry liveness |
| Push or PR in android-wallet, swift | Their tests, which fetch the pinned spec fixtures and conformance cases |
| Participant PR in connectathon | Validated, and auto-merged when the author owns the participant file |

No workflow triggers another repository. A client or wallet release reaches a
consumer only when that consumer's pin is bumped (client), or at the next
nightly run (the APK, which connectathon takes from `latest`).

## Releasing

### Client (`vX.Y.Z`)

1. In client, set `version` in `package.json`, and move the docs' pinned
   URLs (`/client/lib/<version>/…`, the tarball URL) to the new version:
   `grep -rn "0\.2\.1" docs README.md` finds them.
2. Commit, push `main`, then `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
3. Watch `release.yml`. The release notes open with the install line.
4. Update consumers (each is a one-line change to the tarball URL, then `bun install` and commit the lockfile):
   - connectathon `package.json`
   - spec `package.json`
   - android-wallet `package.json` (then `bun run vectors` if the wire format changed)

The build fails if a doc pins a `/client/lib/<version>/` that has no release,
so a missed pin shows up before deploy.

### Android wallet (`wallet-vX.Y.Z`)

1. Tag in android-wallet: `git tag -a wallet-vX.Y.Z -m wallet-vX.Y.Z && git push origin wallet-vX.Y.Z`.
2. Nothing else to update: every link and connectathon's CI use
   `releases/latest/download/smart-checkin-wallet-debug.apk`.

### Spec fixtures and conformance cases (`fixtures-vN`)

A `fixtures-vN` tag covers both `fixtures/` (real captures) and
`conformance/` (the single-capability cases every implementation runs, with a
known-failures list). Current: `fixtures-v2`.

1. Change `fixtures/`, or change and re-run `tools/conformance/generate.ts`,
   in spec. Consumers can try it first with `SPEC_FIXTURES_DIR=../spec/fixtures`
   or `SPEC_CONFORMANCE_DIR=../spec/conformance`.
2. Tag in spec: `git tag -a fixtures-vN -m fixtures-vN && git push origin fixtures-vN`.
3. Bump `SPEC_FIXTURES_REF` in `scripts/fetch-fixtures.sh` (client,
   android-wallet, swift) and `SPEC_CONFORMANCE_REF` in
   `scripts/fetch-conformance.sh` (client, connectathon, android-wallet,
   swift). Run their tests, update each `known-failures.json` (a listed case
   that now passes fails CI until removed), and commit.

spec also carries old `wallet-v*` tags from before the Android wallet moved
out. They're historical; wallet releases live in android-wallet.

### Swift package (`vX.Y.Z`)

Tag in swift. Swift Package Manager resolves versions from tags, so the tag is
the release. Add a GitHub release only for notes.

### Spec text, connectathon, apex

Not versioned. Push to `main` and they deploy.

## The shared site

- **Look:** every page loads `/assets/site-chrome.js` and
  `/assets/smart-design.css` from the apex at runtime. A change there shows
  everywhere at once.
- **Menus:** each section publishes `nav.json` (`/spec/nav.json`,
  `/client/nav.json`, `/client/demo/nav.json`, `/connectathon/nav.json`), with
  hrefs relative to the file. To add a page to a menu, edit that section's
  `nav.json` in its own repo. The apex only knows the sections' names, front
  pages, and `nav.json` locations (`SECTIONS` in `assets/site-chrome.js`).
  Adding a whole new section is the only menu change that touches the apex.
- **Links between sections:** link to a section's front page, or to the
  spec's section anchors (`/spec/#6-4-verifier-cross-validation`), which are
  part of the spec. Deeper links into another repo's pages can break without
  that repo knowing.

## Checks worth running after cross-repo changes

- `bun scripts/self-test.ts` in connectathon: the live Testing EHR against the
  live testing wallet, every scenario and fault.
- `scripts/build-pages.sh` in client: builds every hosted bundle, runs them,
  and checks every link inside the client site.
- `scripts/build-pages.sh` in spec: validates every JSON example in the model
  explainer against the client's validators.
