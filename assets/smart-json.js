/**
 * smart-json.js: show JSON with the site's syntax colors, at runtime.
 *
 * For tools that display JSON they receive while running (requests,
 * responses, FHIR). Static pages highlight at build time with Shiki instead
 * (MAINTAINING.md, "Syntax highlighting"). The output uses the classes
 * sj-k (key), sj-s (string), sj-n (number), sj-l (true/false/null), and
 * sj-p (, and :), which /assets/smart-design.css colors from the --syn-*
 * tokens, so it matches Shiki's JSON in light and dark.
 *
 *   import { renderJson, jsonToHtml } from '/assets/smart-json.js';
 *   renderJson(document.querySelector('pre'), value);       // fills the element
 *   el.innerHTML = jsonToHtml(value, { indent: 2 });        // or just the HTML
 *
 * A value is serialized with JSON.stringify(value, replacer, indent). A
 * string is highlighted as it is if it parses as JSON, and otherwise shown
 * as plain (escaped) text. The text content of the result is exactly the
 * JSON text, so copying it gives valid JSON. Loading the file also sets
 * globalThis.SmartJson = { jsonToHtml, renderJson } for bundled code that
 * can't import from a URL.
 *
 * No dependencies. Everything is escaped, so it is safe for untrusted input.
 */

var ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
function esc(s) { return s.replace(/[&<>]/g, function (c) { return ESCAPES[c]; }); }

// A string (and, if a colon follows, it's a key), a number, a literal, or punctuation.
var TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([,:])/g;

/**
 * @param {unknown} value  any JSON-serializable value, or a string of JSON text
 * @param {{ indent?: number | string, replacer?: (this: any, key: string, value: any) => any }} [options]
 * @returns {string} escaped HTML
 */
export function jsonToHtml(value, options) {
  var opts = options || {};
  var indent = opts.indent === undefined ? 2 : opts.indent;
  var text;
  if (typeof value === 'string') {
    try { JSON.parse(value); text = value; } catch (e) { return esc(value); }
  } else {
    text = JSON.stringify(value, opts.replacer || null, indent);
    if (text === undefined) return '';
  }
  var out = '';
  var last = 0;
  var m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    out += esc(text.slice(last, m.index));
    if (m[1] !== undefined) {
      if (m[2] !== undefined) {
        out += '<span class="sj-k">' + esc(m[1]) + '</span>' + m[2].slice(0, -1) + '<span class="sj-p">:</span>';
      } else {
        out += '<span class="sj-s">' + esc(m[1]) + '</span>';
      }
    } else if (m[3] !== undefined) {
      out += '<span class="sj-n">' + m[3] + '</span>';
    } else if (m[4] !== undefined) {
      out += '<span class="sj-l">' + m[4] + '</span>';
    } else {
      out += '<span class="sj-p">' + m[5] + '</span>';
    }
    last = TOKEN.lastIndex;
  }
  return out + esc(text.slice(last));
}

/**
 * Fill an element (usually a <pre>) with highlighted JSON.
 * @param {Element} el
 * @param {unknown} value
 * @param {{ indent?: number | string, replacer?: (this: any, key: string, value: any) => any }} [options]
 * @returns {Element} el
 */
export function renderJson(el, value, options) {
  el.classList.add('smart-json');
  el.innerHTML = jsonToHtml(value, options);
  return el;
}

globalThis.SmartJson = { jsonToHtml: jsonToHtml, renderJson: renderJson };
