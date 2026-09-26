/**
 * The site's chrome: spectrum stripe, sticky top bar, breadcrumb, footer.
 * Every section of smart-health-checkin.org loads this file and
 * smart-design.css from the apex at runtime, so the look changes everywhere
 * at once.
 *
 * What's in each section is that section's business. Each is its own site,
 * deployed from its own repository, and publishes its menu as nav.json:
 *
 *   { "label": "Spec", "href": "./",
 *     "items": [
 *       { "title": "Explainers", "items": [
 *         { "title": "Request and response", "href": "smart-model-explainer.html", "note": "…" } ] } ] }
 *
 * with hrefs relative to the nav.json itself. An entry with its own `items`
 * is a group: a labeled set of links shown together in the same menu. Groups
 * nest one level; menus never fly out. This file knows only the sections'
 * names, front pages, and nav.json locations (SECTIONS).
 *
 * Placeholders a page can use (MAINTAINING.md documents each):
 *
 *   <div data-smart-topbar></div>              the site bar
 *   <div data-smart-topbar="tool" …></div>     the compact bar for tool pages
 *   <nav data-smart-breadcrumb></nav>          Section › Group › Page
 *     (data-current, data-parent-href, data-parent-label: see MAINTAINING.md)
 *   <div data-smart-footer></div>              the footer
 *
 *   <link rel="stylesheet" href="/assets/smart-design.css">
 *   <script src="/assets/site-chrome.js" defer></script>
 */
(function () {
  var MARK = ''
    + '<svg width="30" height="30" viewBox="59 -1 91 75" aria-hidden="true" focusable="false">'
    + '<polygon class="smart-logo-purple" fill="#722772" points="83.91 0 93.42 0 104.56 18.47 116.03 0 125.28 0 104.58 33.96"/>'
    + '<polygon fill="#e24a31" points="60.61 35.72 65.37 28.16 87.76 28.16 76.67 9.49 81.3 1.87 101.89 35.72"/>'
    + '<polygon fill="#e77d26" points="128 1.73 132.76 9.55 121.5 28.16 144.06 28.16 148.69 35.72 107.4 35.72"/>'
    + '<polygon fill="#89bf44" points="148.72 38.78 143.97 46.33 121.57 46.33 132.66 65.16 128.03 72.78 107.44 38.78"/>'
    + '<polygon fill="#f1b42a" points="81.28 72.77 76.53 64.94 87.78 46.33 65.23 46.33 60.6 38.78 101.89 38.78"/>'
    + '<polygon fill="#64aed0" points="125.46 73.22 115.89 73.22 104.68 54.63 93.14 73.22 83.82 73.22 104.66 39.04"/>'
    + '</svg>';

  var CARET = '<svg class="dd-caret" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">'
    + '<path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.6" fill="none"'
    + ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var COPY_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<rect x="4" y="4" width="9" height="11" rx="1.5"></rect><path d="M3 12V2.5A1.5 1.5 0 0 1 4.5 1h7"></path></svg>';

  // The sections, and where each publishes its menu. This is the whole
  // cross-section contract. The logo is Home; there is no Home item.
  var SECTIONS = [
    { label: 'Spec', href: '/spec/', match: /^\/spec\//, llms: '/spec/', nav: '/spec/nav.json' },
    { label: 'Developers', href: '/client/', match: /^\/client\/(?!demo\/)/, llms: '/client/', nav: '/client/nav.json' },
    { label: 'Demos', href: '/client/demo/', match: /^\/client\/demo\//, llms: '/client/', nav: '/client/demo/nav.json' },
    { label: 'Connectathon', href: '/connectathon/', match: /^\/connectathon\//, llms: '/connectathon/', nav: '/connectathon/nav.json' }
  ];

  // A section menu with more links than this shows in two columns.
  var TWO_COLUMNS_ABOVE = 8;

  var path = location.pathname;
  var menus = {};   // section label -> loaded items (null until loaded)

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function spectrum() {
    return '<div class="smart-spectrum" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  }

  /** Same page, ignoring a trailing index.html and any query or fragment. */
  function samePage(href, p) {
    var target = href.replace(/[?#].*$/, '').replace(/index\.html$/, '');
    return target === p.replace(/index\.html$/, '');
  }

  function currentSection() {
    for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].match.test(path)) return SECTIONS[i];
    return null;
  }

  /**
   * A section's menu, with hrefs made absolute against its nav.json. An entry
   * with its own `items` is a group. Groups nest one level only.
   */
  function loadNav(section) {
    if (!section.nav) return Promise.resolve(null);
    var base = new URL(section.nav, location.origin);
    function link(i) {
      var url = new URL(i.href, base);
      return {
        href: url.origin === location.origin ? url.pathname + url.search + url.hash : url.href,
        label: String(i.title || i.label),
        note: i.note ? String(i.note) : ''
      };
    }
    function isLink(i) { return i && i.href && (i.title || i.label) && !Array.isArray(i.items); }
    return fetch(base.href)
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) {
        var items = Array.isArray(json && json.items) ? json.items : [];
        return items.map(function (i) {
          if (i && Array.isArray(i.items) && (i.title || i.label)) {
            var children = i.items.filter(isLink).map(link);
            return children.length ? { group: true, label: String(i.title || i.label), items: children } : null;
          }
          return isLink(i) ? link(i) : null;
        }).filter(Boolean);
      })
      .catch(function () { return null; });
  }

  /** Every link in a menu, groups flattened, in order. */
  function leaves(items) {
    return (items || []).reduce(function (all, i) { return all.concat(i.group ? i.items : [i]); }, []);
  }

  /** The link to a section's front page that opens its menu, unless the menu already has one. */
  function homeLink(section, items) {
    var has = leaves(items).some(function (i) { return samePage(i.href, section.href); });
    if (has) return '';
    var cur = samePage(section.href, path) ? ' aria-current="page"' : '';
    return '<div class="dd-block"><a href="' + esc(section.href) + '"' + cur + '><span class="dd-label">Overview</span></a></div>';
  }

  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-'); }

  // ---------------------------------------------------------------- menus

  function menuLink(child) {
    var cur = samePage(child.href, path) ? ' aria-current="page"' : '';
    return '<a href="' + esc(child.href) + '"' + cur + '>'
      + '<span class="dd-label">' + esc(child.label) + '</span>'
      + (child.note ? '<span class="dd-note">' + esc(child.note) + '</span>' : '')
      + '</a>';
  }

  /** The links of a section menu, groups as labeled blocks. */
  function menuBody(items) {
    return items.map(function (child) {
      if (!child.group) return '<div class="dd-block">' + menuLink(child) + '</div>';
      var id = 'smart-grp-' + slug(child.label);
      return '<div class="dd-block dd-group" role="group" aria-labelledby="' + id + '">'
        + '<div class="dd-group-label" id="' + id + '">' + esc(child.label) + '</div>'
        + child.items.map(menuLink).join('')
        + '</div>';
    }).join('');
  }

  /** A section in the desktop bar: a plain link until its menu loads. */
  function sectionItem(section) {
    var active = section.match.test(path);
    var items = menus[section.label];
    if (!items || !items.length) {
      return '<a class="smart-section-link" href="' + esc(section.href) + '" data-section="' + esc(section.label) + '"'
        + (active ? ' aria-current="true"' : '') + '>' + esc(section.label)
        + '<span class="dd-caret-space" aria-hidden="true"></span></a>';
    }
    var id = 'smart-menu-' + slug(section.label);
    var wide = leaves(items).length > TWO_COLUMNS_ABOVE ? ' dd-wide' : '';
    return '<div class="dropdown" data-section="' + esc(section.label) + '" data-active="' + (active ? 'true' : 'false') + '">'
      +   '<button type="button" class="dropdown-trigger" aria-expanded="false" aria-controls="' + id + '">'
      +     esc(section.label) + CARET
      +   '</button>'
      +   '<div class="dropdown-menu' + wide + '" id="' + id + '" hidden>'
      +     '<div class="dd-body">' + homeLink(section, items) + menuBody(items) + '</div>'
      +   '</div>'
      + '</div>';
  }

  /** The section root whose llms files describe this page; the apex if none. */
  function llmsRoot() {
    var s = currentSection();
    return s ? s.llms : '/';
  }

  /** GitHub and the llms.txt files: the "⋯" menu on desktop, the panel's foot on phone. */
  function extraLinks() {
    var root = llmsRoot();
    return '<a href="https://github.com/smart-health-checkin" target="_blank" rel="noopener">'
      +   '<span class="dd-label">GitHub ↗</span><span class="dd-note">Source for every part of the project</span></a>'
      + '<button type="button" class="dd-action" data-llms-copy="' + esc(root + 'llms-full.txt') + '">'
      +   COPY_ICON + '<span><span class="dd-label">Copy llms.txt</span><span class="dd-note">This section as one file, for an AI assistant</span></span></button>'
      + '<a href="' + esc(root + 'llms.txt') + '"><span class="dd-label">llms.txt</span><span class="dd-note">Index of this section</span></a>'
      + '<a href="' + esc(root + 'llms-full.txt') + '"><span class="dd-label">llms-full.txt</span><span class="dd-note">This section in one file</span></a>'
      + (root === '/' ? '' : '<a href="/llms.txt"><span class="dd-label">Whole site llms.txt</span><span class="dd-note">Every section</span></a>');
  }

  function desktopNav() {
    return SECTIONS.map(sectionItem).join('')
      + '<div class="dropdown smart-more" data-section="more">'
      +   '<button type="button" class="dropdown-trigger" aria-expanded="false" aria-controls="smart-menu-more" aria-label="More: GitHub and llms.txt">'
      +     '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="4" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="9" r="1.6" fill="currentColor"/><circle cx="14" cy="9" r="1.6" fill="currentColor"/></svg>'
      +   '</button>'
      +   '<div class="dropdown-menu dd-right" id="smart-menu-more" hidden><div class="dd-body">' + extraLinks() + '</div></div>'
      + '</div>';
  }

  // --------------------------------------------------------------- phone panel

  function panelSection(section) {
    var items = menus[section.label];
    var active = section.match.test(path);
    var id = 'smart-panel-' + slug(section.label);
    var body = homeLink(section, items) + (items && items.length ? menuBody(items) : '');
    return '<div class="smart-panel-section" data-section="' + esc(section.label) + '">'
      +   '<button type="button" class="smart-panel-toggle" aria-expanded="' + (active ? 'true' : 'false') + '" aria-controls="' + id + '">'
      +     '<span>' + esc(section.label) + '</span>' + CARET
      +   '</button>'
      +   '<div class="smart-panel-body dd-body" id="' + id + '"' + (active ? '' : ' hidden') + '>' + body + '</div>'
      + '</div>';
  }

  function panel() {
    return '<div class="smart-menu-panel" id="smart-menu-panel" role="dialog" aria-modal="true" aria-label="Site menu" hidden>'
      +   '<div class="smart-menu-panel-head">'
      +     '<a class="smart-mark-link" href="/">' + MARK + '<span class="smart-mark-title">Home</span></a>'
      +     '<button type="button" class="smart-menu-close" aria-label="Close menu">'
      +       '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      +     '</button>'
      +   '</div>'
      +   '<nav class="smart-menu-panel-nav" aria-label="Sections">'
      +     SECTIONS.map(panelSection).join('')
      +     '<div class="smart-panel-extra dd-body">' + extraLinks() + '</div>'
      +   '</nav>'
      + '</div>';
  }

  // ---------------------------------------------------------------- the bars

  function siteBar() {
    var s = currentSection();
    return '<a class="smart-skip" href="#main">Skip to content</a>'
      + spectrum()
      + '<header class="smart-topbar" data-mode="site"' + (s ? ' data-has-section' : '') + '>'
      +   '<div class="smart-topbar-inner">'
      +     '<a class="smart-mark-link" href="/" aria-label="SMART Health Check-in home">'
      +       MARK
      +       '<span class="smart-mark-title">SMART Health Check-in</span>'
      +     '</a>'
      +     (s ? '<a class="smart-phone-section" href="' + esc(s.href) + '">' + esc(s.label) + '</a>' : '')
      +     '<nav class="smart-topbar-nav" aria-label="Sections">' + desktopNav() + '</nav>'
      +     '<button type="button" class="smart-menu-btn" aria-expanded="false" aria-controls="smart-menu-panel">'
      +       '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      +       '<span>Menu</span>'
      +     '</button>'
      +   '</div>'
      + '</header>'
      + panel();
  }

  /** The compact bar for tool pages: logo, back link, tool title, the tool's own actions. */
  function toolBar(el) {
    var s = currentSection();
    var backHref = el.getAttribute('data-back-href') || (s ? s.href : '/');
    var backLabel = el.getAttribute('data-back-label') || (s ? s.label : 'Home');
    var title = el.getAttribute('data-tool-title') || (document.querySelector('h1') || {}).textContent || document.title;
    var html = '<a class="smart-skip" href="#main">Skip to content</a>'
      + spectrum()
      + '<header class="smart-topbar" data-mode="tool">'
      +   '<div class="smart-topbar-inner">'
      +     '<a class="smart-mark-link" href="/" aria-label="SMART Health Check-in home">' + MARK + '</a>'
      +     '<a class="smart-tool-back" href="' + esc(backHref) + '" aria-label="Back to ' + esc(backLabel) + '"><span aria-hidden="true">‹</span><span class="smart-tool-back-label"> ' + esc(backLabel) + '</span></a>'
      +     '<span class="smart-tool-title">' + esc(title) + '</span>'
      +     '<div class="smart-tool-actions"></div>'
      +   '</div>'
      + '</header>';
    var frag = document.createRange().createContextualFragment(html);
    var slot = frag.querySelector('.smart-tool-actions');
    Array.prototype.forEach.call(el.querySelectorAll('[data-smart-tool-actions]'), function (n) {
      while (n.firstChild) slot.appendChild(n.firstChild);
    });
    if (!slot.firstChild) slot.remove();
    el.replaceWith(frag);
  }

  // --------------------------------------------------------------- breadcrumb

  function pageTitle(el) {
    if (el.getAttribute('data-current')) return el.getAttribute('data-current');
    var h1 = document.querySelector('main h1, h1');
    if (h1 && h1.textContent.trim()) return h1.textContent.trim();
    return document.title.split(/\s[—–|·-]\s/)[0];
  }

  /** The menu entry for a page (by path) and the group it sits in. */
  function findInMenu(items, p) {
    var hit = null, group = null;
    items.forEach(function (i) {
      if (hit) return;
      if (i.group) i.items.forEach(function (c) { if (!hit && samePage(c.href, p)) { hit = c; group = i.label; } });
      else if (samePage(i.href, p)) hit = i;
    });
    return { hit: hit, group: group };
  }

  /** Section › Group › Page, from the section's menu when it has loaded.
      A page outside the menu can name its parent with data-parent-href and
      data-parent-label: Section › (parent's group ›) Parent › Page. */
  function renderBreadcrumb(el) {
    var s = currentSection();
    if (!s || samePage(s.href, path)) { el.hidden = true; el.innerHTML = ''; return; }
    var items = menus[s.label] || [];
    var found = findInMenu(items, path), hit = found.hit, group = found.group;
    if (hit && samePage(hit.href, s.href)) { el.hidden = true; el.innerHTML = ''; return; }
    var current = el.getAttribute('data-current') || (hit ? hit.label : pageTitle(el));
    var parent = '';
    var parentHref = !hit && el.getAttribute('data-parent-href');
    if (parentHref) {
      var u = new URL(parentHref, location.href);
      var pf = findInMenu(items, u.pathname);
      var parentLabel = el.getAttribute('data-parent-label') || (pf.hit ? pf.hit.label : '');
      if (parentLabel) {
        group = pf.group;
        parent = '<li><a href="' + esc(u.pathname + u.search + u.hash) + '">' + esc(parentLabel) + '</a></li>';
      }
    }
    el.classList.add('smart-breadcrumb');
    if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', 'Breadcrumb');
    el.innerHTML = '<ol>'
      + '<li><a href="' + esc(s.href) + '">' + esc(s.label) + '</a></li>'
      + (group ? '<li><span>' + esc(group) + '</span></li>' : '')
      + parent
      + '<li><span aria-current="page">' + esc(current) + '</span></li>'
      + '</ol>';
  }

  // ---------------------------------------------------------------- footer

  // One column per section, filled from the same nav.json files as the bar.
  function footerColumn(section) {
    var items = menus[section.label];
    // The column starts with the section's front page, so skip menu items
    // that point there too.
    var rest = leaves(items).filter(function (i) { return !samePage(i.href, section.href); });
    var links = [{ href: section.href, label: 'Overview' }].concat(rest.slice(0, 5));
    return '<div data-section="' + esc(section.label) + '"><h2>' + esc(section.label) + '</h2><ul>'
      + links.map(function (l) { return '<li><a href="' + esc(l.href) + '">' + esc(l.label) + '</a></li>'; }).join('')
      + '</ul></div>';
  }

  function footer() {
    var cols = SECTIONS.map(footerColumn).join('')
      + '<div><h2>Project</h2><ul>'
      +   '<li><a href="/">Home</a></li>'
      +   '<li><a href="https://github.com/smart-health-checkin" target="_blank" rel="noopener">GitHub ↗</a></li>'
      + '</ul></div>';
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

  // ------------------------------------------------------------- behaviour

  function wireCopy(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-llms-copy]'), function (btn) {
      var label = btn.querySelector('.dd-label');
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
    });
  }

  /** Desktop menus: disclosure buttons. Escape or a click outside closes; focus returns to the button. */
  function wireDropdowns(bar) {
    function openDropdown() { return bar.querySelector('.dropdown[data-open="true"]'); }
    function close(dd, focus) {
      if (!dd) return;
      dd.setAttribute('data-open', 'false');
      var t = dd.querySelector('.dropdown-trigger');
      var m = dd.querySelector('.dropdown-menu');
      if (t) t.setAttribute('aria-expanded', 'false');
      if (m) m.hidden = true;
      if (focus && t) t.focus();
    }
    function keepInViewport(menu) {
      menu.style.transform = '';
      var margin = 8;
      var rect = menu.getBoundingClientRect();
      var width = document.documentElement.clientWidth;
      var shift = 0;
      if (rect.right > width - margin) shift = (width - margin) - rect.right;
      if (rect.left + shift < margin) shift = margin - rect.left;
      if (shift) menu.style.transform = 'translateX(' + Math.round(shift) + 'px)';
    }
    bar.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.dropdown-trigger');
      if (!t || !bar.contains(t)) return;
      var dd = t.parentNode;
      var wasOpen = dd.getAttribute('data-open') === 'true';
      close(openDropdown(), false);
      if (wasOpen) return;
      dd.setAttribute('data-open', 'true');
      t.setAttribute('aria-expanded', 'true');
      var menu = dd.querySelector('.dropdown-menu');
      menu.hidden = false;
      keepInViewport(menu);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.dropdown')) close(openDropdown(), false);
    });
    bar.addEventListener('focusout', function (e) {
      var dd = openDropdown();
      if (dd && e.relatedTarget && !dd.contains(e.relatedTarget)) close(dd, false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openDropdown()) close(openDropdown(), true);
    });
    window.addEventListener('resize', function () {
      var dd = openDropdown();
      if (dd) keepInViewport(dd.querySelector('.dropdown-menu'));
    });
  }

  /** Phone: the full-screen menu. Sections expand in place; focus stays inside while it's open. */
  function wirePanel(bar) {
    var btn = bar.querySelector('.smart-menu-btn');
    var p = document.getElementById('smart-menu-panel');
    if (!btn || !p) return;
    var closeBtn = p.querySelector('.smart-menu-close');
    function open() {
      p.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('smart-menu-open');
      closeBtn.focus();
    }
    function close() {
      p.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      document.documentElement.classList.remove('smart-menu-open');
      btn.focus();
    }
    btn.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    p.addEventListener('click', function (e) {
      var t = e.target.closest && e.target.closest('.smart-panel-toggle');
      if (!t) return;
      var body = document.getElementById(t.getAttribute('aria-controls'));
      var expanded = t.getAttribute('aria-expanded') === 'true';
      t.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      body.hidden = expanded;
    });
    p.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var focusable = Array.prototype.filter.call(p.querySelectorAll('a, button'), function (n) { return n.offsetParent !== null; });
      if (!focusable.length) return;
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    // A link to somewhere on the same page (or a new page) closes the menu.
    p.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) {
        p.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        document.documentElement.classList.remove('smart-menu-open');
      }
    });
  }

  /** Below the desktop breakpoint the bar slides away while scrolling down and returns on scrolling up. */
  function wireAutoHide(bar) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var narrow = window.matchMedia('(max-width: 63.99rem)');
    var last = window.scrollY;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        var hide = narrow.matches && y > 120 && y > last + 4 && !document.documentElement.classList.contains('smart-menu-open');
        var show = y < last - 4 || y <= 120;
        if (hide) bar.classList.add('smart-topbar-hidden');
        else if (show) bar.classList.remove('smart-topbar-hidden');
        last = y;
      });
    }, { passive: true });
    bar.addEventListener('focusin', function () { bar.classList.remove('smart-topbar-hidden'); });
  }

  /** The skip link's target: #main, else the first <main>, else what follows the bar. */
  function skipTarget(bar) {
    if (document.getElementById('main')) return;
    var main = document.querySelector('main');
    var target = main;
    if (!target) {
      target = bar;
      do { target = target.nextElementSibling; } while (target && (target.id === 'smart-menu-panel' || target.matches('script, style, [data-smart-breadcrumb]')));
    }
    if (!target) return;
    if (!target.id) target.id = 'main';
    else Array.prototype.forEach.call(document.querySelectorAll('.smart-skip'), function (a) { a.setAttribute('href', '#' + target.id); });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
  }

  function refreshMenus() {
    var bar = document.querySelector('.smart-topbar[data-mode="site"]');
    if (bar) {
      var nav = bar.querySelector('.smart-topbar-nav');
      var openLabel = (bar.querySelector('.dropdown[data-open="true"]') || {}).dataset;
      if (!openLabel) nav.innerHTML = desktopNav();
      wireCopy(nav);
    }
    var p = document.getElementById('smart-menu-panel');
    if (p) {
      SECTIONS.forEach(function (section) {
        var old = p.querySelector('.smart-panel-section[data-section="' + section.label + '"]');
        if (!old || !menus[section.label]) return;
        var expanded = old.querySelector('.smart-panel-toggle').getAttribute('aria-expanded') === 'true';
        var wrap = document.createElement('div');
        wrap.innerHTML = panelSection(section);
        var fresh = wrap.firstChild;
        fresh.querySelector('.smart-panel-toggle').setAttribute('aria-expanded', expanded ? 'true' : 'false');
        fresh.querySelector('.smart-panel-body').hidden = !expanded;
        old.replaceWith(fresh);
      });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-smart-breadcrumb]'), renderBreadcrumb);
    SECTIONS.forEach(function (section) {
      var col = document.querySelector('.smart-footer [data-section="' + section.label + '"]');
      if (col && menus[section.label]) col.outerHTML = footerColumn(section);
    });
  }

  function mount() {
    var top = document.querySelector('[data-smart-topbar]');
    if (top && top.getAttribute('data-smart-topbar') === 'tool') toolBar(top);
    else if (top) top.outerHTML = siteBar();
    var foot = document.querySelector('[data-smart-footer]');
    if (foot) foot.outerHTML = footer();
    Array.prototype.forEach.call(document.querySelectorAll('[data-smart-breadcrumb]'), renderBreadcrumb);

    var bar = document.querySelector('.smart-topbar');
    if (bar) {
      skipTarget(bar);
      if (bar.getAttribute('data-mode') === 'site') {
        wireDropdowns(bar);
        wireCopy(bar);
        wirePanel(bar);
        wireCopy(document.getElementById('smart-menu-panel'));
        wireAutoHide(bar);
      }
    }
    var pending = SECTIONS.length;
    SECTIONS.forEach(function (section) {
      loadNav(section).then(function (items) {
        if (items && items.length) menus[section.label] = items;
        if (--pending === 0) refreshMenus();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
