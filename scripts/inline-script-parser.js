'use strict';
// Lightweight tokenizer for extracting inline <script> block contents from HTML.
// Unlike a naive regex, this tracks:
//   - HTML comments (<!-- ... -->) so text that merely *mentions* "<script>"
//     inside a comment is not mistaken for a real opening tag.
//   - JS string/template-literal context inside script blocks, so a literal
//     "</script>" written inside a JS string or `${...}`-templated HTML
//     string does not prematurely terminate the block.
//   - JS regex-literal context (/pattern/flags), so a backtick, quote, or
//     "//"/"/*" that appears *inside* a regex literal (e.g. the markdown
//     inline-code pattern /`([^`]+)`/g) is not mistaken for the start of a
//     template literal, string, or comment. Regex-vs-division is
//     disambiguated with the standard lightweight-lexer heuristic: a "/" is
//     a regex-literal start unless the last significant character scanned
//     in the current JS expression context was an identifier/number
//     character, ")", or "]" (i.e. a value already exists, so "/" must be
//     division). This can misread rare cases like "return /re/" (the last
//     *word* was a keyword ending in a letter, not a value), but that
//     pattern is uncommon in practice and is the same class of limitation
//     already documented below for string/template handling.
// It is NOT a full JS parser (e.g. some exotic regex-vs-division cases can
// still be misread), but it fixes the concrete false-positive classes found
// in this repo while still catching genuinely malformed markup (an inline
// <script> left open/unclosed).
function extractInlineScripts(html) {
  const blocks = [];
  const modeStack = ['html'];
  const top = () => modeStack[modeStack.length - 1];
  let curStart = -1;
  let i = 0;
  const n = html.length;

  // Per nested JS expression context (a <script> body, or a ${...}
  // template expression), tracks the last significant (non-whitespace)
  // character scanned. Used only to tell a regex-literal-opening "/" apart
  // from a division "/".
  const lastSigStack = [];
  const isValueChar = (c) => c !== undefined && /[A-Za-z0-9_$)\]]/.test(c);

  while (i < n) {
    const m = top();

    if (m === 'html') {
      if (html.startsWith('<!--', i)) { modeStack.push('html-comment'); i += 4; continue; }
      if (/^<script/i.test(html.slice(i, i + 7))) {
        const close = html.indexOf('>', i);
        if (close === -1) break;
        const tag = html.slice(i, close + 1);
        if (!/\bsrc\s*=/i.test(tag)) {
          curStart = close + 1;
          modeStack.push('script');
          lastSigStack.push(undefined);
        }
        i = close + 1;
        continue;
      }
      i++; continue;
    }

    if (m === 'html-comment') {
      if (html.startsWith('-->', i)) { modeStack.pop(); i += 3; continue; }
      i++; continue;
    }

    if (m === 'script') {
      if (/^<\/script\s*>/i.test(html.slice(i, i + 10))) {
        const end = html.indexOf('>', i) + 1;
        blocks.push(html.slice(curStart, i));
        modeStack.pop();
        lastSigStack.pop();
        i = end;
        continue;
      }
      if (html.startsWith('//', i)) { modeStack.push('line-comment'); i += 2; continue; }
      if (html.startsWith('/*', i)) { modeStack.push('block-comment'); i += 2; continue; }
      if (html[i] === '/') {
        if (!isValueChar(lastSigStack[lastSigStack.length - 1])) {
          modeStack.push({ type: 'regex', inClass: false });
          i++; continue;
        }
      }
      if (html[i] === "'") { modeStack.push('sq'); i++; continue; }
      if (html[i] === '"') { modeStack.push('dq'); i++; continue; }
      if (html[i] === '`') { modeStack.push('tpl'); i++; continue; }
      if (!/\s/.test(html[i])) lastSigStack[lastSigStack.length - 1] = html[i];
      i++; continue;
    }

    if (m === 'line-comment') {
      if (html[i] === '\n') modeStack.pop();
      i++; continue;
    }

    if (m === 'block-comment') {
      if (html.startsWith('*/', i)) { modeStack.pop(); i += 2; continue; }
      i++; continue;
    }

    if (typeof m === 'object' && m.type === 'regex') {
      if (html[i] === '\\') { i += 2; continue; }
      if (html[i] === '\n') { modeStack.pop(); continue; } // safety valve: real regex literals don't span raw newlines
      if (html[i] === '[') { m.inClass = true; i++; continue; }
      if (html[i] === ']') { m.inClass = false; i++; continue; }
      if (html[i] === '/' && !m.inClass) {
        modeStack.pop();
        i++;
        while (i < n && /[a-z]/i.test(html[i])) i++; // consume flags (g, i, m, u, y, s, d)
        if (lastSigStack.length) lastSigStack[lastSigStack.length - 1] = ')'; // a regex literal is a value
        continue;
      }
      i++; continue;
    }

    if (m === 'sq' || m === 'dq') {
      const q = m === 'sq' ? "'" : '"';
      if (html[i] === '\\') { i += 2; continue; }
      if (html[i] === q) {
        modeStack.pop();
        if (lastSigStack.length) lastSigStack[lastSigStack.length - 1] = ')'; // a string is a value
        i++; continue;
      }
      if (html[i] === '\n') { modeStack.pop(); continue; } // safety valve: real strings don't span raw newlines
      i++; continue;
    }

    if (m === 'tpl') {
      if (html[i] === '\\') { i += 2; continue; }
      if (html[i] === '`') {
        modeStack.pop();
        if (lastSigStack.length) lastSigStack[lastSigStack.length - 1] = ')'; // a template literal is a value
        i++; continue;
      }
      if (html.startsWith('${', i)) {
        modeStack.push({ type: 'tpl-expr', depth: 1 });
        lastSigStack.push(undefined);
        i += 2; continue;
      }
      i++; continue;
    }

    if (typeof m === 'object' && m.type === 'tpl-expr') {
      if (html[i] === '{') { m.depth++; i++; continue; }
      if (html[i] === '}') {
        m.depth--;
        i++;
        if (m.depth === 0) {
          modeStack.pop();
          lastSigStack.pop();
          if (lastSigStack.length) lastSigStack[lastSigStack.length - 1] = ')'; // the ${...} result is a value
        }
        continue;
      }
      if (html.startsWith('//', i)) { modeStack.push('line-comment'); i += 2; continue; }
      if (html.startsWith('/*', i)) { modeStack.push('block-comment'); i += 2; continue; }
      if (html[i] === '/') {
        if (!isValueChar(lastSigStack[lastSigStack.length - 1])) {
          modeStack.push({ type: 'regex', inClass: false });
          i++; continue;
        }
      }
      if (html[i] === "'") { modeStack.push('sq'); i++; continue; }
      if (html[i] === '"') { modeStack.push('dq'); i++; continue; }
      if (html[i] === '`') { modeStack.push('tpl'); i++; continue; }
      if (!/\s/.test(html[i])) lastSigStack[lastSigStack.length - 1] = html[i];
      i++; continue;
    }

    i++; // fallback, should not normally be reached
  }

  return blocks;
}

module.exports = { extractInlineScripts };
