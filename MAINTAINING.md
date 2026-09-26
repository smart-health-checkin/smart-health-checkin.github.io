# Maintaining SMART Health Check-in

How the repositories fit together: what each one publishes, what it consumes,
what triggers what, and what to update when something is released. Each repo's
`AGENTS.md` covers its own commands and points here for anything that crosses
repositories.

## The repositories

| Repo | What it is | Deploys | Publishes | Consumes |
| --- | --- | --- | --- | --- |
| [smart-health-checkin.github.io](https://github.com/smart-health-checkin/smart-health-checkin.github.io) (the apex) | Home page, shared look (`assets/`), this file | `/`, `/assets/`, `/ktc/` on every push to `main` | Nothing versioned | Each section's `nav.json`, in the browser |
| [spec](https://github.com/smart-health-checkin/spec) | The draft spec, explainers, capture inspector, conformance fixtures | `/spec/` on every push to `main` | `vX.Y.Z` tags (fixtures and conformance cases) | client (release tarball) |
| [client](https://github.com/smart-health-checkin/client) | The JavaScript library, its docs and demos | `/client/` on every push to `main`, and after every release | `vX.Y.Z` GitHub releases: npm tarball plus hosted bundles | spec fixtures (tag) |
| [connectathon](https://github.com/smart-health-checkin/connectathon) | Scenarios, Testing EHR, testing wallet, participant registry, results | `/connectathon/` on push to `main`, hourly, and on issue changes | Nothing versioned | client (release tarball), the Android APK (latest release) |
| [android-wallet](https://github.com/smart-health-checkin/android-wallet) | The reference Android wallet | Nothing | `vX.Y.Z` GitHub releases: the APK | spec fixtures (tag), client (release tarball, for test vectors) |
| [swift](https://github.com/smart-health-checkin/swift) | The Swift package | Nothing | `vX.Y.Z` tags (Swift Package Manager installs from tags; current `v0.2.0`) | spec fixtures (tag) |
| [notes](https://github.com/smart-health-checkin/notes), ktc (archived) | Working notes; the retired KTC site | Nothing | Nothing | Nothing |

Dependencies only run one way:

```
spec (vX.Y.Z) ──► client, android-wallet, swift, connectathon (fixtures, conformance cases)
client (vX.Y.Z)    ──► connectathon, spec, android-wallet, outside developers
android-wallet (vX.Y.Z) ──► connectathon's Android CI, download links
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
| Push a `vX.Y.Z` tag in android-wallet | `android-release.yml`: builds and signs the APK and attaches it to a release; `releases/latest/download/…` now serves it |
| connectathon site deploy completes | connectathon's self-test drives the live Testing EHR against the live testing wallet; failures open an issue |
| Nightly | connectathon: self-test, and the Android end-to-end run against the latest APK |
| Hourly | connectathon: site rebuild (registry, results) and wallet-registry liveness |
| Push or PR in android-wallet, swift | Their tests, which fetch the pinned spec fixtures and conformance cases |
| Pull request in spec | `check.yml`: the full spec build and its checks, without deploying |
| Push to a non-`main` branch or PR in client | `ci.yml`: typecheck, tests, conformance |
| Participant PR in connectathon | Validated, and auto-merged when the author owns the participant file |

No workflow triggers another repository. A client or wallet release reaches a
consumer only when that consumer's pin is bumped (client), or at the next
nightly run (the APK, which connectathon takes from `latest`).

## Releasing

### Client (`vX.Y.Z`)

1. In client, set `version` in `package.json`, and move the docs' pinned
   URLs (`/client/lib/<version>/…`, the tarball URL) to the new version:
   `grep -rn "<old version>" docs README.md` finds them.
2. Commit, push `main`, then `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
3. Watch `release.yml`. The release notes open with the install line.
4. Update consumers (each is a one-line change to the tarball URL, then `bun install` and commit the lockfile):
   - connectathon `package.json`
   - spec `package.json`
   - android-wallet `package.json` (then `bun run vectors` if the wire format changed)

The build fails if a doc pins a `/client/lib/<version>/` that has no release,
so a missed pin shows up before deploy.

### Android wallet (`vX.Y.Z`)

1. Tag in android-wallet: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
2. Nothing else to update: every link and connectathon's CI use
   `releases/latest/download/smart-health-checkin-wallet-debug.apk`.

### Spec (`vX.Y.Z`: fixtures and conformance cases)

A spec tag pins `fixtures/` (the real capture and synthetic fixtures) and
`conformance/` (the single-capability cases every implementation runs, with a
known-failures list) for everything that tests against them. Current:
`v1.0.0-draft.1`; the next draft is `v1.0.0-draft.2`.

1. Change `fixtures/`, or change and re-run `tools/conformance/generate.ts`,
   in spec. Consumers can try it first with `SPEC_DIR=../spec`.
2. Tag in spec: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
3. Bump `SPEC_REF` in `scripts/fetch-spec.sh` in client, android-wallet,
   swift, and connectathon. Run their tests, update each `known-failures.json`
   (a listed case that now passes fails CI until removed), and commit.

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

## Testing

Each layer has its own check, so a problem shows up where it starts. Run the
narrowest one that covers a change; CI runs the rest.

| What it proves | Check | Runs | Run it locally |
| --- | --- | --- | --- |
| The spec is consistent: requirement IDs unique, JSON examples valid, CDDL matches the real capture, Appendix A recomputes from it, old anchors and links resolve | spec `scripts/build-pages.sh` | spec push to `main` and PRs | `bun install && scripts/build-pages.sh` (needs `gem install cddl`) |
| Each implementation meets the spec, one capability at a time | the spec's conformance cases, with a `known-failures.json` per implementation (all empty today) | CI in client, android-wallet, swift, connectathon | each repo's test command (see its `AGENTS.md`) |
| Each wallet's output is accepted by the reference verifier | `spec-conformance/reference/verify-wallet-output.ts` on credentials the wallet built | android-wallet and swift CI | see android-wallet and swift `AGENTS.md` |
| The client library's hosted bundles run, and every docs link resolves | client `scripts/build-pages.sh` (`verify-lib.ts`, `check-links.ts`) | client push to `main` | `scripts/build-pages.sh` |
| The web flow works end to end: the live Testing EHR against the live testing wallet, every scenario and fault, warnings where the spec says warn | connectathon `scripts/self-test.ts` | after every connectathon deploy, and nightly | `bun scripts/self-test.ts` (or against a local build: see connectathon `AGENTS.md`) |
| Chrome on Android, the reference Android wallet, and the Testing EHR work together | connectathon `scripts/android-e2e.ts` | nightly on an emulator in CI, with the latest APK | `bun scripts/android-e2e.ts --release` with an emulator or phone |
| A native Android app can check in directly and through the browser (bridge page, message channel, large responses) | android-wallet `tools/verifier-app-e2e/run.ts` | local only (needs an emulator with Chrome) | see android-wallet `AGENTS.md` |
| The reference EHR demo still works against a wallet | connectathon `scripts/e2e-demo.ts` | by hand | `bun scripts/e2e-demo.ts` |

Before a release, the releasing repo's own checks must pass. After a release,
bump the consumers and let their CI run (see Releasing). After a change that
crosses repos, run the self-test.

## Native apps

A native app checks in through the web flow (platform notes and the client's
Native apps guide explain why). Three repos hold the pieces:

- **The bridge page** is `demo/native-bridge.html` in client, served at
  `/client/demo/native-bridge.html`. It runs the normal client library and
  returns the checked result over a Custom Tabs message channel, in pieces.
- **`/.well-known/assetlinks.json`** in the apex vouches for the example app,
  so Chrome grants the channel. It names the app's package
  (`org.smarthealthit.checkin.verifier`) and the SHA-256 of its signing
  certificate. Change it whenever either changes. Google's link service takes
  a few minutes to notice, and Chrome caches the old answer until its HTTP
  cache is cleared.
- **`verifier-app`** in android-wallet is the example app, with both the
  direct Credential Manager path and the browser path, and the end-to-end test
  above.

## Experience reporting

The connectathon collects free-text experience reports through a Google Form
(<https://forms.gle/fXJf1H3zfZcyTNum7>). Reports are public, credited with the
name and organization people give. The prompts that help people write a report,
and the "Share your experience" page that offers them, live in connectathon
(details in its `AGENTS.md`).

To change the form, edit `connectathon/tools/experience-form/form.gs`, open the
form's editor, three-dot menu > Apps Script, paste, and run `buildForm`. It
rebuilds the form in place, keeping its address and responses. The script
needs only the `forms.currentonly` scope, set in the project's
`appsscript.json`.

## Secrets and settings

| Where | What | Used for |
| --- | --- | --- |
| android-wallet repo secret `ANDROID_DEBUG_KEYSTORE_B64` | The shared debug signing key (certificate SHA-256 `84:64:3E:B6:…:DD:A4`) | Signing every wallet release and `verifier-app`, so releases install over each other and `assetlinks.json` matches. The release fails if the APK has any other signer. |
| client repo setting | Immutable releases | Published client releases can't be edited or replaced |
| `GITHUB_TOKEN` in workflows | Built in | Client's site build reads releases; connectathon's build reads result issues |
