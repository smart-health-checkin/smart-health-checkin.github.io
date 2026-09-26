/**
 * The site's chrome — spectrum stripe, sticky topbar, deep footer — rendered
 * from one script served at the apex.
 *
 * Every part of the site loads this file and /assets/smart-design.css, so the
 * whole domain has one navigation model no matter which repository deployed
 * the page you happen to be on. A project repo mounted at a subpath does not
 * define its own bar; it adds its pages to NAV here.
 *
 *   <link rel="stylesheet" href="/assets/smart-design.css">
 *   <div data-smart-topbar></div>   …page…   <div data-smart-footer></div>
 *   <script src="/assets/site-chrome.js" defer></script>
 */
(function () {
  var MARK = ''
    + '<svg width="30" height="30" viewBox="59 -1 91 75" aria-hidden="true" focusable="false">'
    + '<polygon fill="#722772" points="83.91 0 93.42 0 104.56 18.47 116.03 0 125.28 0 104.58 33.96"/>'
    + '<polygon fill="#e24a31" points="60.61 35.72 65.37 28.16 87.76 28.16 76.67 9.49 81.3 1.87 101.89 35.72"/>'
    + '<polygon fill="#e77d26" points="128 1.73 132.76 9.55 121.5 28.16 144.06 28.16 148.69 35.72 107.4 35.72"/>'
    + '<polygon fill="#89bf44" points="148.72 38.78 143.97 46.33 121.57 46.33 132.66 65.16 128.03 72.78 107.44 38.78"/>'
    + '<polygon fill="#f1b42a" points="81.28 72.77 76.53 64.94 87.78 46.33 65.23 46.33 60.6 38.78 101.89 38.78"/>'
    + '<polygon fill="#64aed0" points="125.46 73.22 115.89 73.22 104.68 54.63 93.14 73.22 83.82 73.22 104.66 39.04"/>'
    + '</svg>';

  var CARET = '<svg class="dd-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
    + '<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none"'
    + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Every href is site-absolute: these cross repository boundaries.
  // A group lights up when `match` tests true against the current path.
  var NAV = [
    { href: '/', label: 'Overview', match: /^\/$/, llms: '/' },
    {
      label: 'Spec', href: '/spec/', match: /^\/spec\//, llms: '/spec/',
      items: [
        { href: '/spec/', label: 'Draft spec 1.0', note: 'Normative reference' },
        { href: '/spec/smart-model-explainer.html', label: 'Model', note: 'Request and response JSON' },
        { href: '/spec/wire-protocol-explainer.html', label: 'Wire protocol', note: 'CBOR, COSE, HPKE' },
        { href: '/spec/wire-protocol-inspector.html', label: 'Capture inspector', note: 'Byte-level fixture viewer' },
        { href: '/spec/kiosk-flow-explainer.html', label: 'Kiosk flow', note: 'Front-desk handoff' }
      ]
    },
    {
      // Mirrors the client docs' nav.json (https://smart-health-checkin.org/client/nav.json),
      // generated from client/scripts/site-nav.ts. Keep the two in step.
      label: 'Developers', href: '/client/', match: /^\/client\/(?!demo\/)/, llms: '/client/',
      items: [
        { href: '/client/docs/tutorial.html', label: 'Tutorial', note: 'Build a check-in page, end to end' },
        { href: '/client/docs/requests.html', label: 'Asking for data', note: 'Items, records, forms, formats' },
        { href: '/client/docs/wallets.html', label: 'Offering wallets', note: 'The picker, registries, kiosks' },
        { href: '/client/docs/responses.html', label: 'Using the answer', note: 'Lookups, health cards, prefill, FHIR' },
        { href: '/client/docs/production.html', label: 'Going to production', note: 'Keys, trust, fallback, privacy' },
        { href: '/client/docs/build-a-wallet.html', label: 'Building a wallet', note: 'For health-app builders' },
        { href: '/client/docs/testing.html', label: 'Testing', note: 'Mock wallet, testing tools, failures' },
        { href: '/client/docs/api/', label: 'API reference', note: 'Every export, by module' }
      ]
    },
    {
      label: 'Demos', href: '/client/demo/', match: /^\/client\/demo\//, llms: '/client/',
      items: [
        { href: '/client/demo/', label: 'Clinic check-in' },
        { href: '/client/demo/kiosk.html', label: 'Kiosk check-in', note: 'Hand off to the phone' },
        { href: '/client/demo/autofill.html#wallet=demo', label: 'Allergy autofill' },
        { href: '/client/demo/react.html', label: 'React example' },
        { href: '/client/demo/angular.html', label: 'Angular example' },
        { href: '/client/demo/wallet.html', label: 'Demo wallet', note: 'The responder side' }
      ]
    },
    {
      label: 'Connectathon', href: '/connectathon/', match: /^\/connectathon\//,
      items: [
        { href: '/connectathon/', label: 'Scenarios', note: 'KTC pre-visit check-in testing' },
        { href: '/connectathon/directory.html', label: 'Directory', note: 'Who is testing what' },
        { href: '/connectathon/results.html', label: 'Results' },
        { href: '/connectathon/requests/', label: 'Requests' },
        { href: '/connectathon/web-wallet-handoff.html', label: 'Web wallet hand-off' }
      ]
    }
  ];

  var FOOTER = [
    { title: 'Protocol', links: [
      { href: '/spec/', label: 'Specification' },
      { href: '/spec/spec.md', label: 'Spec source' },
      { href: 'https://github.com/smart-health-checkin/spec/tree/main/fixtures', label: 'Conformance fixtures', ext: true }
    ] },
    { title: 'Developers', links: [
      { href: '/client/', label: 'Overview' },
      { href: '/client/docs/tutorial.html', label: 'Tutorial' },
      { href: '/client/docs/build-a-wallet.html', label: 'Building a wallet' },
      { href: '/client/docs/api/', label: 'API reference' }
    ] },
    { title: 'Try it', links: [
      { href: '/client/demo/', label: 'Clinic check-in demo' },
      { href: '/client/demo/kiosk.html', label: 'Kiosk check-in' },
      { href: '/client/demo/autofill.html#wallet=demo', label: 'Allergy autofill' },
      { href: '/client/demo/wallet.html', label: 'Demo wallet' }
    ] },
    { title: 'Project', links: [
      { href: 'https://github.com/smart-health-checkin', label: 'GitHub org', ext: true },
      { href: 'https://github.com/smart-health-checkin/spec', label: 'spec', ext: true },
      { href: 'https://github.com/smart-health-checkin/client', label: 'client', ext: true }
    ] }
  ];

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function spectrum() {
    return '<div class="smart-spectrum" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  }

  /** Same page, ignoring a trailing index.html and any fragment. */
  function samePage(href, path) {
    var target = href.replace(/[?#].*$/, '').replace(/index\.html$/, '');
    return target === path.replace(/index\.html$/, '');
  }

  function navItem(item, path) {
    if (!item.items) {
      var cur = item.match.test(path) ? ' aria-current="page"' : '';
      return '<a href="' + esc(item.href) + '"' + cur + '>' + esc(item.label) + '</a>';
    }
    var active = item.match.test(path);
    var menu = item.items.map(function (child) {
      var childCur = samePage(child.href, path) ? ' aria-current="page"' : '';
      return '<a role="menuitem" href="' + esc(child.href) + '"' + childCur + '>'
        + '<span class="dd-label">' + esc(child.label) + '</span>'
        + (child.note ? '<span class="dd-note">' + esc(child.note) + '</span>' : '')
        + '</a>';
    }).join('');
    return '<div class="dropdown" data-active="' + (active ? 'true' : 'false') + '">'
      +   '<button type="button" class="dropdown-trigger" aria-haspopup="true" aria-expanded="false">'
      +     esc(item.label) + CARET
      +   '</button>'
      +   '<div class="dropdown-menu" role="menu">' + menu + '</div>'
      + '</div>';
  }

  /** The section root whose llms files describe this page; the apex if none. */
  function llmsRoot(path) {
    for (var i = 0; i < NAV.length; i++) if (NAV[i].match.test(path)) return NAV[i].llms;
    return '/';
  }

  var COPY_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="4" y="4" width="9" height="11" rx="1.5"></rect><path d="M3 12V2.5A1.5 1.5 0 0 1 4.5 1h7"></path></svg>';

  // Every section root publishes llms.txt (an index) and llms-full.txt
  // (everything in one file). One control, the same on every page.
  function llmsWidget(path) {
    var root = llmsRoot(path);
    return '<span class="llm-widget" role="group" aria-label="Documentation for language models">'
      +   '<button type="button" class="llm-primary" data-llms-copy="' + esc(root + 'llms-full.txt') + '"'
      +     ' title="Copy this section\'s documentation as one file">'
      +     COPY_ICON + '<span>Copy llms.txt</span>'
      +   '</button>'
      +   '<div class="dropdown llm-secondary">'
      +     '<button type="button" class="dropdown-trigger" aria-haspopup="true" aria-expanded="false" aria-label="More">' + CARET + '</button>'
      +     '<div class="dropdown-menu" role="menu">'
      +       '<a role="menuitem" href="' + esc(root + 'llms.txt') + '"><span class="dd-label">llms.txt</span><span class="dd-note">Index of this section</span></a>'
      +       '<a role="menuitem" href="' + esc(root + 'llms-full.txt') + '"><span class="dd-label">llms-full.txt</span><span class="dd-note">This section in one file</span></a>'
      +       (root === '/' ? '' : '<a role="menuitem" href="/llms.txt"><span class="dd-label">Whole site</span><span class="dd-note">Every section</span></a>')
      +     '</div>'
      +   '</div>'
      + '</span>';
  }

  function wireCopy(root) {
    var btn = root.querySelector('[data-llms-copy]');
    if (!btn) return;
    var label = btn.querySelector('span');
    var original = label.textContent;
    var timer = 0;
    btn.addEventListener('click', function () {
      fetch(btn.getAttribute('data-llms-copy'), { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function (text) {
          return navigator.clipboard.writeText(text).then(function () {
            label.textContent = 'Copied (' + Math.round(new Blob([text]).size / 1024) + ' KB)';
          });
        })
        .catch(function () { label.textContent = 'Copy failed'; })
        .then(function () {
          clearTimeout(timer);
          timer = setTimeout(function () { label.textContent = original; }, 2400);
        });
    });
  }

  function topbar() {
    var path = location.pathname;
    return spectrum()
      + '<header class="smart-topbar">'
      +   '<div class="smart-topbar-inner">'
      +     '<a class="smart-mark-link" href="/" aria-label="SMART Health Check-in — home">'
      +       MARK
      +       '<span class="smart-mark-text"><span class="smart-mark-title">SMART Health Check-in</span></span>'
      +     '</a>'
      +     '<nav class="smart-topbar-nav" aria-label="Primary">'
      +       NAV.map(function (item) { return navItem(item, path); }).join('')
      +       '<span class="sep" aria-hidden="true"></span>'
      +       '<a href="https://github.com/smart-health-checkin" target="_blank" rel="noopener">GitHub</a>'
      +       llmsWidget(path)
      +     '</nav>'
      +   '</div>'
      + '</header>';
  }

  function footer() {
    var cols = FOOTER.map(function (col) {
      var links = col.links.map(function (l) {
        return '<li><a href="' + esc(l.href) + '"'
          + (l.ext ? ' target="_blank" rel="noopener"' : '') + '>'
          + esc(l.label) + (l.ext ? ' ↗' : '') + '</a></li>';
      }).join('');
      return '<div><h4>' + esc(col.title) + '</h4><ul>' + links + '</ul></div>';
    }).join('');

    return '<footer class="smart-footer">'
      +   spectrum()
      +   '<div class="site-foot-inner">'
      +     '<div class="site-foot-cols">' + cols + '</div>'
      +     '<div class="smart-footer-fine">'
      +       '<span>An open protocol and reference implementation for pre-visit check-in.</span>'
      +       '<span class="spacer"></span><span>Apache-2.0</span>'
      +     '</div>'
      +   '</div>'
      + '</footer>';
  }

  function wireDropdowns(root) {
    function closeAll(except) {
      var open = root.querySelectorAll('.dropdown[data-open="true"]');
      Array.prototype.forEach.call(open, function (dd) {
        if (dd === except) return;
        dd.setAttribute('data-open', 'false');
        var t = dd.querySelector('.dropdown-trigger');
        if (t) t.setAttribute('aria-expanded', 'false');
      });
    }
    var triggers = root.querySelectorAll('.dropdown-trigger');
    Array.prototype.forEach.call(triggers, function (t) {
      t.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = t.parentNode;
        var open = dd.getAttribute('data-open') === 'true';
        closeAll(dd);
        dd.setAttribute('data-open', open ? 'false' : 'true');
        t.setAttribute('aria-expanded', open ? 'false' : 'true');
        if (!open) keepInViewport(dd.querySelector('.dropdown-menu'));
      });
    });
    // A menu opens from its trigger's left edge (right edge on narrow
    // screens). Near either side of the window that can push it off screen,
    // so shift it back inside once it's laid out.
    function keepInViewport(menu) {
      if (!menu) return;
      menu.style.transform = '';
      var margin = 8;
      var rect = menu.getBoundingClientRect();
      var width = document.documentElement.clientWidth;
      var shift = 0;
      if (rect.right > width - margin) shift = (width - margin) - rect.right;
      if (rect.left + shift < margin) shift = margin - rect.left;
      if (shift) menu.style.transform = 'translateX(' + Math.round(shift) + 'px)';
    }
    window.addEventListener('resize', function () {
      var open = root.querySelector('.dropdown[data-open="true"] > .dropdown-menu');
      if (open) keepInViewport(open);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.dropdown')) closeAll(null);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
  }

  function mount() {
    var top = document.querySelector('[data-smart-topbar]');
    var foot = document.querySelector('[data-smart-footer]');
    if (top) top.outerHTML = topbar();
    if (foot) foot.outerHTML = footer();
    var bar = document.querySelector('.smart-topbar');
    if (bar) { wireDropdowns(bar); wireCopy(bar); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
