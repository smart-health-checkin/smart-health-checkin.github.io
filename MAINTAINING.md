# Maintaining SMART Health Check-in

How the repositories fit together: what each one publishes, what it consumes,
what triggers what, and what to update when something is released. Each repo's
`AGENTS.md` covers its own commands and points here for anything that crosses
repositories.

## The repositories

| Repo | What it is | Deploys | Publishes | Consumes |
| --- | --- | --- | --- | --- |
| [smart-health-checkin.github.io](https://github.com/smart-health-checkin/smart-health-checkin.github.io) (the apex) | Home page, shared look (`assets/`), the shared [llms.txt background](#llmstxt), this file | `/`, `/assets/`, `/ktc/` on every push to `main` | Nothing versioned | Each section's `nav.json`, in the browser |
| [spec](https://github.com/smart-health-checkin/spec) | The draft spec, explainers, capture inspector, conformance fixtures | `/spec/` on every push to `main` | `vX.Y.Z` tags (fixtures and conformance cases) | client (release tarball), the apex's `llms-background.md` (at build) |
| [client](https://github.com/smart-health-checkin/client) | The JavaScript library, its docs and demos | `/client/` on every push to `main`, and after every release | `vX.Y.Z` GitHub releases: npm tarball plus hosted bundles | spec fixtures (tag), the apex's `llms-background.md` (at build) |
| [connectathon](https://github.com/smart-health-checkin/connectathon) | Scenarios, Testing EHR, Testing Wallet, participant registry, results | `/connectathon/` on push to `main`, hourly, and on issue changes | Nothing versioned | client (release tarball), the Android APK (latest release), the apex's `llms-background.md` (at build) |
| [android-wallet](https://github.com/smart-health-checkin/android-wallet) | The reference Android wallet | Nothing | `vX.Y.Z` GitHub releases: the wallet APK and the example Verifier app's APK | spec fixtures (tag), client (release tarball, for test vectors) |
| [swift](https://github.com/smart-health-checkin/swift) | The Swift package | Nothing | `vX.Y.Z` tags (Swift Package Manager installs from tags; current `v0.2.0`) | spec fixtures (tag), client (release tarball, CI's reference verifier) |
| [notes](https://github.com/smart-health-checkin/notes), ktc (archived) | Working notes; the retired KTC site | Nothing | Nothing | Nothing |

Dependencies only run one way:

```
spec (vX.Y.Z) ──► client, android-wallet, swift, connectathon (fixtures, conformance cases)
client (vX.Y.Z)    ──► connectathon, spec, android-wallet, swift CI, outside developers
android-wallet (vX.Y.Z) ──► connectathon's Android CI, download links
apex (assets/, runtime) ──► every page on the domain
apex (llms-background.md, at build) ──► spec, client, connectathon (llms.txt)
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
| Push a `vX.Y.Z` tag in android-wallet | `android-release.yml`: builds and signs both APKs (wallet and example Verifier app) and attaches them to a release; `releases/latest/download/…` now serves them |
| connectathon site deploy completes | connectathon's self-test drives the live Testing EHR against the live Testing Wallet; failures open an issue |
| Nightly | connectathon: self-test, and the Android end-to-end run against the latest APK |
| Hourly | connectathon: site rebuild (registry, results) and wallet-registry liveness |
| Push or PR in android-wallet, swift | Their tests, which fetch the pinned spec fixtures and conformance cases |
| Push to `main` or PR in connectathon | `check.yml`: `bun run check`, `bun test tests` (conformance included), and the typecheck; `validate.yml` (FHIR validation) when `Questionnaire/`, `responses/`, or the Testing Wallet's data change |
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
   - swift `.github/workflows/test.yml` (the tarball its CI checks wallet output with; no lockfile)

The build fails if a doc pins a `/client/lib/<version>/` that has no release,
so a missed pin shows up before deploy.

### Android wallet (`vX.Y.Z`)

1. Tag in android-wallet: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`.
2. Nothing else to update: every link and connectathon's CI use
   `releases/latest/download/smart-health-checkin-wallet.apk`. The same
   release carries the example Verifier app,
   `releases/latest/download/smart-health-checkin-verifier.apk`, signed
   with the key `/.well-known/assetlinks.json` lists.

### Spec (`vX.Y.Z`: fixtures and conformance cases)

A spec tag pins `fixtures/` (the real capture and synthetic fixtures) and
`conformance/` (the single-capability cases every implementation runs, with a
known-failures list) for everything that tests against them. Current:
`v1.0.0-draft.2`; the next draft is `v1.0.0-draft.3`.

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
  everywhere at once. The stylesheet holds the colors for light and dark
  ([Colors and dark mode](#colors-and-dark-mode)), the shared
  [components](#components), and the [diagram](#diagrams) classes; tools that show JSON load
  [`/assets/smart-json.js`](#json-at-runtime).
- **Tab icon:** the apex serves the SMART starburst as `/favicon.ico`,
  `/favicon.svg`, and `/apple-touch-icon.png`. The chrome adds
  `<link rel="icon">` and `<link rel="apple-touch-icon">` to any page that
  declares none, so a page that wants its own icon declares it in its
  `<head>`.
- **Menus:** each section publishes `nav.json` (`/spec/nav.json`,
  `/client/nav.json`, `/client/demo/nav.json`, `/connectathon/nav.json`), with
  hrefs relative to the file. An entry with its own `items` (and a `title`,
  no `href`) is a group: a labeled set of links shown together in the same
  menu. Groups nest one level; menus never fly out. Apart from the section's own front page, every entry sits in a named group; if the only honest name for a group is vague ("Other", "More"), regroup. To add a page to a
  menu, edit that section's `nav.json` in its own repo. The apex only knows the sections' names, front
  pages, and `nav.json` locations (`SECTIONS` in `assets/site-chrome.js`).
  Adding a whole new section is the only menu change that touches the apex.
  If nothing in a section's menu links to its front page, the chrome adds
  "Overview" at the top. The [footer](#footer) shows every menu in full. A menu with more than 8 links shows in two
  columns; menus never scroll inside.
- **Section front pages:** a front page does one of two jobs. Where a
  section serves several kinds of readers who need routing, its front page
  is an overview that sends each kind to its starting point (Developers:
  building a check-in page or a wallet; Connectathon: one path per kind of
  participant), and its menu calls it "Overview". Where the section's main
  thing is itself the best place to start, the front page is that thing and
  the menu lists it by its own name: the Spec's front page is the
  specification (its URL is the one people cite, with requirement anchors
  such as `/spec/#XV-2`, and its "How to read this document" section links every
  explainer), and the Demos' front page is the clinic check-in demo. The
  home page is the site-wide overview for anyone. Give a new section the
  kind of front page that fits, and say why in its AGENTS.md if it differs.
- **Links between sections:** every reference to something documented
  elsewhere (a step, a section, a page, a tool) links to exactly that place,
  with an anchor for a step or section, such as
  `/client/docs/wallets.html#kiosk-hand-off` or
  `/spec/#6-4-verifier-cross-validation`. When you rename a page or change an
  anchor that other pages link to, search every repo for links to it and
  update them in the same change.

### llms.txt

Every section publishes one file, `llms.txt`, at its root: `/`, `/spec/`,
`/client/` (which also covers the Demos), and `/connectathon/`. It is the
shared background followed by the full text of every page in the section.
The "⋯" menu and the phone panel offer the current section's `llms.txt`
and "Copy llms.txt"; `llms` in `SECTIONS` (`assets/site-chrome.js`) names
the root whose file a section's pages offer. Pages outside every section,
such as `/ktc/`, offer the root's.

- **The background** is [`llms-background.md`](llms-background.md) in this
  repo, served at `/llms-background.md`. It is written by hand, once, for an
  AI model helping someone understand or build with the project: what it is,
  the roles, how a check-in flows, the transports, the project's status,
  the sections and their llms.txt URLs, the repositories, and the terms.
  Every `llms.txt` starts with it, and its list of sections is how one
  section's file points to the others. Check any change against the spec,
  keep it about 1,000 words, and update its section list when a section is
  added or renamed. The sections pick up a change at their next build
  (connectathon hourly; spec and client on their next push).
- **How a section gets it:** each section's `scripts/llms.ts` fetches
  `https://smart-health-checkin.org/llms-background.md` during its build,
  with three tries, and fails the build if it can't or if the text doesn't
  start with `# SMART Health Check-in`. Fetching the published copy keeps
  the sections independent of this repo's checkout, as loading `/assets/`
  at runtime does; it is why the background stays published on its own. To build offline, or to try a change to the background
  before it deploys, set
  `LLMS_BACKGROUND=../smart-health-checkin.github.io/llms-background.md`.
- **`llms.txt`** is an H1, a one-paragraph summary, the background, then
  the full text of every page the section publishes, in menu order,
  converted from the built HTML to Markdown: only `<main>`, without the
  chrome, navigation, scripts, or styles; headings, code blocks, and
  tables kept; links absolute; a diagram replaced by its `<title>` and
  `<desc>`. Each page starts with its H1 and a `Source: <url>`
  line. Published Markdown or text files named in the script's `TEXTS`
  (the connectathon's prompts) follow as they are. The root's is the
  background, the home page, and the Closing the Loop deck.
- **The scripts:** each repo has its own `scripts/llms.ts`, run at the end
  of its build. They have the same shape: the block at the top (title,
  summary, `nav.json`, pages skipped with a reason, extra pages and text
  files) is the section's own, and the rest (the HTML-to-Markdown conversion, the
  background fetch, the checks, and the `SECTIONS` list) is the same in all
  four. Change those parts in every repo together.
- **Checks:** a section's build fails if a page in its built site is neither
  in `llms.txt` nor in the script's `SKIP` list (each skip has a reason),
  if a page or text file the script names (`PAGES`, `TEXTS`) is missing
  from the build, or if a link in `llms.txt` into the section names a file
  the build didn't produce. Links into other sections are checked only on
  the live site, since each section deploys on its own.
- **Adding a section:** add it to `SECTIONS` in `assets/site-chrome.js`
  (with `llms`), to `SECTIONS` in every `scripts/llms.ts`, and to the
  background's list of sections.

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
- **Dark mode:** a page is light unless it opts in with `<html
  data-theme="auto">` (follow the reader's `prefers-color-scheme`) or
  `data-theme="dark"` (always dark). The chrome follows the same switch, so
  a dark bar never sits over a light page. Opt in only once the page's own
  CSS takes every color from the tokens; see [Colors and dark
  mode](#colors-and-dark-mode). In dark the logo's purple petal is `#A04CA0`
  (`--smart-logo-purple`) instead of `#722772`, which is too dark on the dark
  bar.

### The bar

`<div data-smart-topbar></div>` becomes, in order: a "Skip to content"
link (visible on focus), the spectrum stripe, and `<header
class="smart-topbar">`.

- **64rem and wider:** 56px tall, sticky. The logo and "SMART Health
  Check-in" link to `/` (there is no Home item). Then one button per section
  (Spec, Developers, Demos, Connectathon) opening that section's menu, and a
  "⋯" button with GitHub, "Copy llms.txt", and the current section's
  llms.txt ([llms.txt](#llmstxt)).
- **Below 64rem:** 52px tall, one row: the logo, the current section's name
  (a link to its front page; "SMART Check-in" outside any section below
  46rem), and a "Menu" button. Menu opens a full-screen panel listing every
  section as a button that expands its menu in place (the current section
  starts expanded), then GitHub, "Copy llms.txt", and the llms.txt link. The bar slides away
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

For full-screen tools (the Testing EHR, the Testing Wallet, the demos) that
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

`<div data-smart-footer></div>` becomes `<footer class="smart-footer"
role="contentinfo">`: a site map with one column per section (Spec,
Developers, Demos, Connectathon), then Project (Home, GitHub), and a line of
fine print.

- **Each column is exactly that section's menu:** the same groups, entries,
  order, and labels, from the same `nav.json` through the same code
  (`menuEntries` in `assets/site-chrome.js`), including the "Overview" rule
  ([Menus](#the-shared-site)). Nothing is cut off, so adding a page to a
  menu adds it to the footer. The column heading links to the section's
  front page; group labels are small-caps subheads (`<h3>`), and each list
  is labelled by its heading. The current page is marked
  `aria-current="page"`.
- **Layout:** dense on purpose: links sit close together (each at least
  24px tall) and the space goes between groups. Five columns side by side at
  64rem and wider; below that the sections flow through three columns, then
  two below 46rem, newspaper style, so a short section doesn't leave a gap
  beside a long one. Nothing collapses.
- **Layout shift:** the footer's frame renders at once; its contents arrive
  together once every `nav.json` has loaded. The footer is the last thing on
  the page, so it grows downward without moving anything. Put nothing after
  the placeholder that shows on screen.

### Colors and dark mode

`smart-design.css` holds one palette for the whole domain, with a light and
a dark value for every color. Page CSS uses the semantic tokens below; each
has the right value for the current mode, so a page written with them works
in both.

| Token | Use |
| --- | --- |
| `--bg` | The page |
| `--bg-alt` | A band or well set into the page |
| `--surface` | Cards, panels, menus, details |
| `--surface-alt` | A panel's header, hover rows, quiet panels |
| `--fg-1`, `--fg-2`, `--fg-3` | Body text and headings; secondary text; captions, labels, meta |
| `--border`, `--border-strong`, `--border-subtle` | Lines; control outlines; row rules inside a panel |
| `--brand` | Links, primary buttons, selection |
| `--brand-ink` | Hover and pressed; text on `--brand-wash` |
| `--brand-wash` | Selected rows, the current item |
| `--on-brand` | Text on a `--brand` fill |
| `--focus` | Focus rings (`--shadow-focus` is the ring as a box shadow) |
| `--status-ok`, `--status-warn`, `--status-bad`, `--status-info` | Status text and icons |
| `--status-*-wash`, `--status-*-border` | Status backgrounds and borders |
| `--code-bg`, `--code-fg`, `--code-border` | Code blocks |
| `--code-inline-bg`, `--code-inline-fg` | Inline code |
| `--syn-comment`, `--syn-keyword`, `--syn-string`, `--syn-constant`, `--syn-function`, `--syn-parameter`, `--syn-punct`, `--syn-link` | Syntax colors ([Syntax highlighting](#syntax-highlighting)) |
| `--shadow-xs` … `--shadow-lg`, `--shadow-edge` | Shadows; the scroll-edge shadow on wide tables |

- **Contrast:** every text token reaches 4.5:1 on every background token in
  both modes, and each status color on its own wash. Put text on
  `--brand-wash` in `--brand-ink`, not `--brand`.
- **Other color names:** `--success-wash`, `--warning-wash`,
  `--danger-wash`, and `--info-wash` are aliases for the status washes and
  change in dark. `--success`, `--warning`, `--danger`, `--info`, `--brand-bright`,
  and the spectrum colors (`--smart-red` …) are fills for dots, rules, and
  bars, the same in both modes; don't use them for text.
- **Surfaces in dark:** `--bg-alt` is a step darker than `--bg` (a well)
  and `--surface` a step lighter (raised), so a panel stands out on either
  page background, as it does in light.
- **Grays don't change:** `--gray-0` … `--gray-950` are fixed primitives. A
  page that takes a color from a gray stays light in dark mode.
- **`--theme-*` is the palette itself.** The semantic tokens and the chrome
  point at it. Don't use or override it. A page may redefine a semantic
  token for itself (the chrome ignores that), but then that page has to
  give it a dark value too.
- **Opting in:** add `data-theme="auto"` to `<html>` only when the page's CSS
  has no color literals left for text, backgrounds, or borders. Then the
  page's canvas and default text come from `--bg` and `--fg-1`, native
  controls and scrollbars turn dark (`color-scheme`), and the chrome turns
  dark with it. Exceptions that must stay as they are in both modes, such
  as a QR code's white field or logo colors, keep their literals.
- **Checking a page:** load it with the reader's scheme set to dark (Chrome
  DevTools, Rendering, "Emulate CSS media feature prefers-color-scheme"),
  or temporarily set `data-theme="dark"` on its `<html>`.
  [`/assets/components.html`](https://smart-health-checkin.org/assets/components.html)
  shows every token and component; add `?theme=light`, `?theme=dark`, or
  `?theme=auto` to switch.

### Components

Shared classes for the pieces that recur across sections. All are
token-driven, so they work in both modes. Status modifiers are `ok`, `warn`,
`bad`, and `info` (`success`, `warning`, and `danger` also work).
The stylesheet also makes the `hidden` attribute always hide, whatever
display a class sets, and turns off font ligatures in `code`, `pre`,
`kbd`, and `samp`, so `=>` shows as typed.

| Class | What it is |
| --- | --- |
| `.smart-btn` (`.primary`, `.ghost`, `.link`, `.sm`, `.mono`, `.block`) | Buttons. `.link.sm` is a compact link button, the height of the line |
| `.smart-pill` + status | A short status label: "fulfilled", "declined". An `a.smart-pill` isn't underlined |
| `.smart-chip` + status | A mono, uppercase label: "Online", "Draft" |
| `.smart-callout` + status | A boxed note with a colored left rule; info by default. `.smart-callout-title` for a bold first line. Links in it are `--brand-ink` |
| `.smart-note` (`.warn`, `.bad`, `.ok`) | A left rule and nothing else |
| `.smart-table-wrap` > `table.smart-table` | A table that scrolls sideways inside its wrapper, with edge shadows when it overflows. On a card, set `--table-bg: var(--surface)` on the wrapper (automatic inside `.smart-panel`, `.smart-details`, a `.smart-prose` `details`, and a callout). Header cells keep the case they're written in. `td.num` and `th.num` align right, here and in `.smart-prose` tables |
| `pre.smart-code` (`.short`, `.tall` cap the height) | A code block |
| `code.smart-inline-code` | Inline code |
| `dl.smart-fields` | Name/value rows; `dt`/`dd` pairs, optionally each pair in a `div`. One column below 46rem |
| `.smart-tabs` | A segmented row of buttons or links; the selected one has `aria-selected="true"`, `aria-pressed="true"`, or `aria-current`. The page supplies the behavior |
| `details.smart-details` | A bordered disclosure with a turning caret |
| `.smart-panel` (`.quiet`, `.flush`, `.dashed`), `.smart-panel-head` | Cards |
| `.smart-field`, `.smart-input`, `.smart-select` | Form fields |
| `.smart-banner` | A full-width band, such as "this is a demo" |
| `.smart-prose` | A scope for rendered Markdown: inside it, bare `pre`, inline `code`, `table`, `blockquote` (an info callout), and `details` get the looks above without classes. Wrap tables in `.smart-table-wrap` when rendering |

```html
<div class="smart-callout warn">
  <span class="smart-callout-title">Draft</span>
  This section will change before the connectathon.
</div>

<div class="smart-table-wrap">
  <table class="smart-table">
    <thead><tr><th>Item</th><th>Status</th><th class="num">Bytes</th></tr></thead>
    <tbody><tr><td>allergies</td><td><span class="smart-pill ok">fulfilled</span></td><td class="num">18,422</td></tr></tbody>
  </table>
</div>

<dl class="smart-fields">
  <dt>type</dt><dd><code class="smart-inline-code">smart-health-checkin-request</code></dd>
  <dt>purpose</dt><dd>Before your visit</dd>
</dl>

<div class="smart-tabs" role="tablist" aria-label="View">
  <button role="tab" aria-selected="true">Readable</button>
  <button role="tab" aria-selected="false">JSON</button>
</div>

<details class="smart-details">
  <summary>Response</summary>
  <pre class="smart-code">…</pre>
</details>
```

### Diagrams

Explanatory drawings are inline SVG with class `xd`, inside a
`div.xd-figure` frame. Their classes take every color from the tokens, so
one SVG works in light and dark. The spec's
[Kiosk check-in](https://smart-health-checkin.org/spec/kiosk.html) and
[Request and response](https://smart-health-checkin.org/spec/request-response.html)
pages and the client's
[Wallet picker](https://smart-health-checkin.org/client/docs/wallets.html#kiosk-hand-off)
guide use them.

- **Size and phones:** `.xd` fills the frame and is at least 640px wide; a
  wider drawing scrolls sideways inside its frame. So nothing scrolls
  sideways on a phone, draw a second, stacked version (about 360 wide) and
  put both in the page: the wide one in `.xd-figure.xd-wide`, the stacked
  one in `.xd-figure.xd-narrow`. Below 46rem only the narrow one shows.
- **Accessible name:** give each SVG `role="img"`, a `<title>` and a
  `<desc>` that says in words what the drawing shows, and
  `aria-labelledby` naming both. Ids (markers too) must be unique on the
  page.

| Class | What it draws |
| --- | --- |
| `head`, `sub` | A column heading and the gray line under it |
| `t`, `s` | A box's title and its text |
| `mono`, `code` | Gray monospace text; a code name, in `--brand-ink` |
| `box` (`.off` dashed, for something waiting or not taken), `off-t` | A box and its muted text |
| `band`, `lane`, `rule` | A shaded row, a dashed column divider, a plain line |
| `num`, `num-t`, `step` | A numbered step circle, its number, and the step's caps label |
| `arrow`, `arrow-soft`; markers `ah`, `ah-soft` | A solid brand arrow and a dashed gray one, with their heads |
| `chip`, `chip-t` | A rounded label on a brand wash, for what travels along an arrow |
| `pill-ok`/`-warn`/`-off` and `-t`, `ok-t` | Status pills and green text |
| `link`, `dot`, `rec-kind` | Links between matched items, their end dots, and a record's kind label |
| `ico`, `key`, `lock` (`.open`), `qr` | Line icons, a gold key, a lock, and a QR code's squares |

### Syntax highlighting

One look everywhere: static pages highlight at build time with Shiki, and
tools that show JSON while running use [`smart-json.js`](#json-at-runtime).
Both color from the `--syn-*` tokens, so code reads the same in every
section and follows dark mode. Static pages load no highlighter at runtime.

Build time, in each repo's page build (Shiki 1.0 or later; the client is on
4.x):

```ts
import { createHighlighter, createCssVariablesTheme } from "shiki";

const theme = createCssVariablesTheme();   // default name "css-variables", prefix "--shiki-"
const highlighter = await createHighlighter({
  themes: [theme],
  langs: ["ts", "tsx", "js", "json", "html", "xml", "sh", "kotlin", cddl],
});

const html = highlighter.codeToHtml(code, { lang, theme: "css-variables" });
```

- Keep the theme's defaults: `smart-design.css` defines the `--shiki-*`
  variables it emits and maps them onto the `--syn-*` tokens, and it styles
  `pre.shiki.css-variables` as a code block (the same look as
  `pre.smart-code`). Don't add colors or a background for it in page CSS.
- Aliases: `typescript` → `ts`, `javascript` → `js`, `bash` and `shell` →
  `sh`, `jsonc` → `json`. Anything unknown, and `text`, render as plain
  code (`lang: "text"`).
- Shiki has no CDDL grammar. Pass this one in `langs` (above as `cddl`):

```ts
const cddl = {
  name: "cddl", scopeName: "source.cddl",
  patterns: [
    { match: ";.*$", name: "comment.line.semicolon.cddl" },
    { match: "\"(?:[^\"\\\\]|\\\\.)*\"", name: "string.quoted.double.cddl" },
    { match: "'(?:[^'\\\\]|\\\\.)*'", name: "string.quoted.single.cddl" },
    { match: "\\.[a-z][a-z0-9-]*\\b", name: "keyword.operator.control.cddl" },
    { match: "\\b(?:bool|true|false|nil|null|undefined|any|u?int|nint|float(?:16|32|64)?|tstr|text|bstr|bytes|uri|tdate|time|number)\\b", name: "support.type.cddl" },
    { match: "-?\\b\\d+(?:\\.\\d+)?\\b", name: "constant.numeric.cddl" },
    { match: "^[A-Za-z@_$][\\w@.$-]*(?=\\s*/{0,2}=)", name: "entity.name.type.cddl" },
    { match: "//|=>|/=|//=|\\?|\\*|\\+|\\^|=|~|&|\\.\\.\\.?", name: "keyword.operator.cddl" },
    { match: "[,:]", name: "punctuation.separator.cddl" },
  ],
};
```

- What gets which color: keywords and JSON keys `--syn-keyword`; strings
  and HTML tag names `--syn-string`; numbers, `true`/`false`/`null`, and
  built-in types `--syn-constant`; function and type names and HTML
  attributes `--syn-function`; `,` `:` `;` `--syn-punct`; comments
  `--syn-comment`.

### JSON at runtime

`/assets/smart-json.js` is an ES module with no dependencies. It renders a
value, or a string of JSON text, as escaped HTML in the same colors as
Shiki's JSON (classes `sj-k`, `sj-s`, `sj-n`, `sj-l`, `sj-p`, colored by
`smart-design.css`).

```html
<pre class="smart-code" id="response"></pre>
<script type="module">
  import { renderJson } from "/assets/smart-json.js";
  renderJson(document.getElementById("response"), response);   // JSON.stringify(response, null, 2), highlighted
</script>
```

- `jsonToHtml(value, { indent = 2, replacer })` returns the HTML string;
  `renderJson(el, value, options)` fills `el` and adds the class
  `smart-json`.
- A string is highlighted as it is if it parses as JSON, otherwise shown as
  plain text. The element's `textContent` is exactly the JSON text, so
  copying or reading it gives valid JSON.
- Everything is escaped; it is safe for untrusted input.
- Bundled code that can't import from a URL can load the module with a
  `<script type="module" src="/assets/smart-json.js">` tag and call
  `globalThis.SmartJson.renderJson(…)`.

### Copy buttons

`site-chrome.js` adds a copy button to every `<pre>`, including ones a
script adds or refills later. It sits at the right of a short strip above
the first line, so it never covers code, and stays in view while the code
scrolls sideways. It is always visible. It copies the block's text, shows a
check, and announces "Copied to clipboard" to screen readers.

- **Opt out** with `data-no-copy` on the `pre` or any ancestor (for
  example, a tool that has its own Copy button).
- The pre isn't moved or wrapped, and its `textContent` and `innerText` are
  unchanged: the strip is a `span.smart-copy-slot` at the start of the pre
  and holds only an icon. Code that sets the pre's
  `textContent` or `innerHTML` removes it, and the chrome puts it back.
- Empty pres get no button until they have text.

## Testing

Each layer has its own check, so a problem shows up where it starts. Run the
narrowest one that covers a change; CI runs the rest.

| What it proves | Check | Runs | Run it locally |
| --- | --- | --- | --- |
| The spec is consistent: requirement IDs unique, JSON examples valid, CDDL matches the real capture, Appendix A recomputes from it, old anchors and links resolve | spec `scripts/build-pages.sh` | spec push to `main` and PRs | `bun install && scripts/build-pages.sh` (needs `gem install cddl`) |
| Each implementation meets the spec, one capability at a time | the spec's [conformance tests](https://github.com/smart-health-checkin/spec/tree/main/conformance), with a `known-failures.json` per implementation (all empty today) | CI in client, android-wallet, swift, connectathon | each repo's test command (see its `AGENTS.md`) |
| Each wallet's output is accepted by the reference verifier | `spec-conformance/reference/verify-wallet-output.ts` on credentials the wallet built | android-wallet and swift CI | see the [android-wallet](https://github.com/smart-health-checkin/android-wallet/blob/main/AGENTS.md) and [swift](https://github.com/smart-health-checkin/swift/blob/main/AGENTS.md) `AGENTS.md` |
| Each section's llms.txt has every page it publishes, or skips it with a reason, and its links into the section resolve | each repo's `scripts/llms.ts`, at the end of its build | every build | that repo's build |
| The client library's hosted bundles run, and every docs link resolves | client `scripts/build-pages.sh` (`verify-lib.ts`, `check-links.ts`) | client push to `main` | `scripts/build-pages.sh` |
| The web flow works end to end: the live [Testing EHR](https://smart-health-checkin.org/connectathon/testing-ehr/) against the live [Testing Wallet](https://smart-health-checkin.org/connectathon/testing-wallet/), every scenario and fault, warnings where the spec says warn | connectathon `scripts/self-test.ts` | after every connectathon deploy, and nightly | `bun scripts/self-test.ts` (or against a local build: see connectathon [`AGENTS.md`](https://github.com/smart-health-checkin/connectathon/blob/main/AGENTS.md)) |
| Chrome on Android, the reference Android wallet, and the Testing EHR work together | connectathon `scripts/android-e2e.ts` | nightly on an emulator in CI, with the latest APK | `bun scripts/android-e2e.ts --release` with an emulator or phone |
| A native Android app can check in directly and through the browser (bridge page, message channel, large responses) | android-wallet `tools/verifier-app-e2e/run.ts` | local only (needs an emulator with Chrome) | see android-wallet [`AGENTS.md`](https://github.com/smart-health-checkin/android-wallet/blob/main/AGENTS.md) |
| The clinic check-in demo still works against a wallet | connectathon `scripts/e2e-demo.ts` | by hand | `bun scripts/e2e-demo.ts` |

Before a release, the releasing repo's own checks must pass. After a release,
bump the consumers and let their CI run (see [Releasing](#releasing)). After a change that
crosses repos, run the self-test.

## Native apps

A native app checks in through the web flow ([Platform notes](https://smart-health-checkin.org/spec/platform-notes.html) and the client's
[Native Verifier apps](https://smart-health-checkin.org/client/docs/native-apps.html) guide explain why). Three repos hold the pieces:

- **The bridge page** is `demo/native-bridge.html` in client, served at
  `/client/demo/native-bridge.html`. It runs the normal client library and
  returns the checked result over a Custom Tabs message channel, in pieces.
- **`/.well-known/assetlinks.json`** in the apex vouches for the example app,
  so Chrome grants the channel. It names the app's package
  (`org.smarthealthit.checkin.verifier`) and the SHA-256 of its signing
  certificate. Change it whenever either changes. Google's Digital Asset Links
  service caches the file for up to an hour, and Chrome caches its answer
  too, so allow an hour or clear Chrome's cache while testing.
- **`verifier-app`** in android-wallet is the example app, with both the
  direct Credential Manager path and the browser path, and the end-to-end test
  above.

## Experience reporting

The connectathon collects free-text experience reports through a Google Form
(<https://forms.gle/fXJf1H3zfZcyTNum7>). Reports are public, credited with the
name and organization people give. The prompts that help people write a report,
and the [Share your experience](https://smart-health-checkin.org/connectathon/share.html) page that offers them, live in connectathon
(details in its [`AGENTS.md`](https://github.com/smart-health-checkin/connectathon/blob/main/AGENTS.md)).

To change the form, edit `connectathon/tools/experience-form/form.gs`, open the
form's editor, three-dot menu > Apps Script, paste, and run `buildForm`. It
rebuilds the form in place, keeping its address and responses. The script
needs only the `forms.currentonly` scope, set in the project's
`appsscript.json`.

## Secrets and settings

| Where | What | Used for |
| --- | --- | --- |
| android-wallet repo secret `ANDROID_DEBUG_KEYSTORE_B64` | The shared development signing key (certificate SHA-256 `84:64:3E:B6:…:DD:A4`) | Signing every wallet release and `verifier-app`, so releases install over each other and `assetlinks.json` matches. The release fails if the APK has any other signer. |
| connectathon repo ruleset "Protect main" | Blocks force-pushes to and deletion of `main`; no other rules, no bypass list | Keeping `main`'s history safe while people, agents, and workflows (including the participant-PR auto-merge) push and merge directly |
| client repo setting | Immutable releases | Published client releases can't be edited or replaced |
| `GITHUB_TOKEN` in workflows | Built in | Client's site build reads releases; connectathon's build reads result issues |
