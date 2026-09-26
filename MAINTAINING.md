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
  hrefs relative to the file. An entry with its own `items` (and a `title`,
  no `href`) is a group: a labeled set of links shown together in the same
  menu. Groups nest one level; menus never fly out. Apart from the section's own front page, every entry sits in a named group; if the only honest name for a group is vague ("Other", "More"), regroup. To add a page to a
  menu, edit that section's `nav.json` in its own repo. The apex only knows the sections' names, front
  pages, and `nav.json` locations (`SECTIONS` in `assets/site-chrome.js`).
  Adding a whole new section is the only menu change that touches the apex.
  If nothing in a section's menu links to its front page, the chrome adds
  "Overview" at the top. A menu with more than 8 links shows in two
  columns; menus never scroll inside.
- **Links between sections:** link to a section's front page, or to the
  spec's section anchors (`/spec/#6-4-verifier-cross-validation`), which are
  part of the spec. Deeper links into another repo's pages can break without
  that repo knowing.

### Page template

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Page title · Section</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/assets/smart-design.css">
<script src="/assets/site-chrome.js" defer></script>
</head>
<body>
<div data-smart-topbar></div>
<nav data-smart-breadcrumb></nav>   <!-- optional; see Breadcrumb -->
<main id="main">
  <h1>Page title</h1>
  …
</main>
<div data-smart-footer></div>
</body>
</html>
```

- **One `<main id="main">` and one `<h1>` per page.** The bar's "Skip to
  content" link targets `#main`. Without one it uses the first `<main>`
  (giving it `id="main"`), or else the first element after the bar.
- **Placeholders are replaced, not filled.** Put nothing inside
  `data-smart-topbar` except tool actions (below). The CSS reserves each
  placeholder's final height (bar: 59px at 64rem and wider, 55px below;
  breadcrumb: 40px), so the page doesn't jump when the script runs.
- **Page CSS must not style bare `header` or `nav` elements** (use a class).
  The bar resets its own margin, padding, border, and background, but other
  properties from a global `header {…}` or `nav {…}` rule still leak in.
- **Fonts:** `smart-design.css` loads Inter, Source Serif 4, and JetBrains
  Mono from Google Fonts with `font-display: swap`, and `--font-sans` falls
  back to local fonts sized to match Inter at each weight, so the swap doesn't reflow text.
  The two `preconnect` lines let the fonts start sooner. Widths set in `ch`
  still change a little when Inter arrives; prefer `rem` for layout widths.
- **Dark mode:** the bar, menus, phone panel, breadcrumb, tool bar, and
  footer are light unless the page's own content has a dark mode. Such a
  page opts in with `<html data-theme="auto">` (follow the reader's
  `prefers-color-scheme`) or forces `data-theme="dark"`; without either, a
  dark bar would sit over a light page. Their colors are the `--chrome-*`
  tokens in `smart-design.css`; inside the chrome they stand in for
  `--surface`, `--fg-1`, `--brand` and the rest, so page content keeps its
  own colors. Today the Testing EHR and the client's demo wallet opt in. In
  dark the logo's purple petal is `#A04CA0` (`--smart-logo-purple`) instead of
  `#722772`, which is too dark on the dark bar.

### The bar

`<div data-smart-topbar></div>` becomes, in order: a "Skip to content"
link (visible on focus), the spectrum stripe, and `<header
class="smart-topbar">`.

- **64rem and wider:** 56px tall, sticky. The logo and "SMART Health
  Check-in" link to `/` (there is no Home item). Then one button per section
  (Spec, Developers, Demos, Connectathon) opening that section's menu, and a
  "⋯" button with GitHub, "Copy llms.txt", and the llms.txt files for the
  current section and the whole site.
- **Below 64rem:** 52px tall, one row: the logo, the current section's name
  (a link to its front page; "SMART Check-in" outside any section below
  46rem), and a "Menu" button. Menu opens a full-screen panel listing every
  section as a button that expands its menu in place (the current section
  starts expanded), then GitHub and the llms.txt links. The bar slides away
  while scrolling down and comes back on scrolling up, unless the reader
  asks for reduced motion.
- **Accessibility:** menus are disclosures (`<button aria-expanded
  aria-controls>` and plain links; no `role="menu"`). Escape closes the open
  menu or panel and returns focus to its button. The phone panel keeps Tab
  inside it while open. Every control shows a focus ring; every bar control is
  at least 44px square below 64rem.

### Breadcrumb

```html
<nav data-smart-breadcrumb></nav>
<nav data-smart-breadcrumb data-current="Short page name"></nav>
<nav data-smart-breadcrumb data-parent-href="/client/docs/api/"
     data-parent-label="API reference" data-current="ui"></nav>
```

Put it right after the bar placeholder. It renders `Section › Group › Page`
as `<nav class="smart-breadcrumb" aria-label="Breadcrumb"><ol>…</ol></nav>`:
the section links to its front page, the group is plain text, and the page
is the current item (`aria-current="page"`). The chrome finds the page in the
section's `nav.json` by path (ignoring `index.html`, the query, and the
hash). A page not in the menu gets `Section › Page`, where Page is
`data-current`, else the first `<h1>`, else the `<title>` up to its first
" · ", " — ", " | ", or " - ". `data-current` always wins.

A page not in the menu can name its parent with `data-parent-href` (relative
or absolute) and `data-parent-label`. The parent becomes a link before the
page, and if the parent is in the menu its group is shown too:
`Developers › Reference › API reference › ui`. Without `data-parent-label`
the parent's menu label is used; a parent that is neither labeled nor in
the menu is left out. Pages in the menu ignore these attributes.

On a section's front page, and outside any section, the breadcrumb is
hidden; a template shared with the front page should add `hidden` there
itself, since the CSS reserves 40px for the breadcrumb until the script
runs.

### Tool bar

For full-screen tools (the Testing EHR, the testing wallet, the demos) that
need their own controls in place of the site menus:

```html
<div data-smart-topbar="tool"
     data-tool-title="SMART Testing EHR"
     data-back-href="/connectathon/"
     data-back-label="Connectathon">
  <div data-smart-tool-actions>
    <button class="smart-btn">Reset</button>
  </div>
</div>
```

It renders the logo (a link to `/`), "‹ Connectathon" (the back link),
the tool's title, and the tool's actions: the children of every
`[data-smart-tool-actions]` element are moved, not copied, into the bar, so
event listeners and ids set before the chrome runs survive. Script that
looks for them after the page loads finds them inside
`header.smart-topbar .smart-tool-actions`. Same heights as the site bar;
it stays put while scrolling.

- `data-tool-title`: defaults to the first `<h1>`, then the `<title>`.
- `data-back-href` and `data-back-label`: default to the current
  section's front page and name.
- Below 46rem the back link shrinks to its arrow (still labelled "Back to
  …" for screen readers), the title truncates, and the actions scroll
  sideways if they don't fit. Keep phone actions to one or two short
  buttons. `.smart-btn` in the actions is 40px tall (44px below 46rem).

### Footer

`<div data-smart-footer></div>`: one column per section (Overview, then its
first five other menu links, groups flattened) and a Project column (Home,
GitHub).

## Testing

Each layer has its own check, so a problem shows up where it starts. Run the
narrowest one that covers a change; CI runs the rest.

| What it proves | Check | Runs | Run it locally |
| --- | --- | --- | --- |
| The spec is consistent: requirement IDs unique, JSON examples valid, CDDL matches the real capture, Appendix A recomputes from it, old anchors and links resolve | spec `scripts/build-pages.sh` | spec push to `main` and PRs | `bun install && scripts/build-pages.sh` (needs `gem install cddl`) |
| Each implementation meets the spec, one capability at a time | the spec's [conformance cases](https://github.com/smart-health-checkin/spec/tree/main/conformance), with a `known-failures.json` per implementation (all empty today) | CI in client, android-wallet, swift, connectathon | each repo's test command (see its `AGENTS.md`) |
| Each wallet's output is accepted by the reference verifier | `spec-conformance/reference/verify-wallet-output.ts` on credentials the wallet built | android-wallet and swift CI | see android-wallet and swift `AGENTS.md` |
| The client library's hosted bundles run, and every docs link resolves | client `scripts/build-pages.sh` (`verify-lib.ts`, `check-links.ts`) | client push to `main` | `scripts/build-pages.sh` |
| The web flow works end to end: the live [Testing EHR](https://smart-health-checkin.org/connectathon/testing-ehr/) against the live [testing wallet](https://smart-health-checkin.org/connectathon/testing-wallet/), every scenario and fault, warnings where the spec says warn | connectathon `scripts/self-test.ts` | after every connectathon deploy, and nightly | `bun scripts/self-test.ts` (or against a local build: see connectathon `AGENTS.md`) |
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
