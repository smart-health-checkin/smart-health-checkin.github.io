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
   `releases/latest/download/smart-health-checkin-wallet.apk`. The same
   release carries the example Verifier app,
   `releases/latest/download/smart-health-checkin-verifier.apk`, signed
   with the key `/.well-known/assetlinks.json` lists.

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
  everywhere at once. The stylesheet holds the colors for light and dark
  ([Colors and dark mode](#colors-and-dark-mode)) and the shared
  [components](#components); tools that show JSON load
  [`/assets/smart-json.js`](#json-at-runtime).
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
- **Older names still work:** `--success-wash`, `--warning-wash`,
  `--danger-wash`, and `--info-wash` are the status washes and change in
  dark. `--success`, `--warning`, `--danger`, `--info`, `--brand-bright`,
  and the spectrum colors (`--smart-red` …) are fills for dots, rules, and
  bars, the same in both modes; don't use them for text.
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

| Class | What it is |
| --- | --- |
| `.smart-btn` (`.primary`, `.ghost`, `.link`, `.sm`, `.mono`, `.block`) | Buttons |
| `.smart-pill` + status | A short status label: "fulfilled", "declined" |
| `.smart-chip` + status | A mono, uppercase label: "Online", "Draft" |
| `.smart-callout` + status | A boxed note with a colored left rule; info by default. `.smart-callout-title` for a bold first line |
| `.smart-note` (`.warn`, `.bad`, `.ok`) | A left rule and nothing else |
| `.smart-table-wrap` > `table.smart-table` | A table that scrolls sideways inside its wrapper, with edge shadows when it overflows. On a card, set `--table-bg: var(--surface)` on the wrapper (automatic inside `.smart-panel` and `.smart-details`). `td.num` aligns right |
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

`site-chrome.js` adds a copy button to the top-right corner of every
`<pre>`, including ones a script adds or refills later. It copies the
block's text, shows a check, and announces "Copied to clipboard" to screen
readers. It appears on hover or keyboard focus, and always on touch
screens.

- **Opt out** with `data-no-copy` on the `pre` or any ancestor (for
  example, a tool that has its own Copy button).
- The pre isn't moved or wrapped, and its `textContent` and `innerText` are
  unchanged: the button sits in a zero-height `span.smart-copy-slot` at the
  start of the pre and holds only an icon. Code that sets the pre's
  `textContent` or `innerHTML` removes it, and the chrome puts it back.
- Empty pres get no button until they have text.

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
| android-wallet repo secret `ANDROID_DEBUG_KEYSTORE_B64` | The shared development signing key (certificate SHA-256 `84:64:3E:B6:…:DD:A4`) | Signing every wallet release and `verifier-app`, so releases install over each other and `assetlinks.json` matches. The release fails if the APK has any other signer. |
| client repo setting | Immutable releases | Published client releases can't be edited or replaced |
| `GITHUB_TOKEN` in workflows | Built in | Client's site build reads releases; connectathon's build reads result issues |
