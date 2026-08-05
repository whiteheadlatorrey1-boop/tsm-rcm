'use strict';
// Lightweight tokenizer for extracting inline <script> block contents from HTML.
// Unlike a naive regex, this tracks:
//   - HTML comments (<!-- ... -->) so text that merely *mentions* "<script>"
//     inside a comment is not mistaken for a real opening tag.
//   - JS string/template-literal context inside script blocks, so a literal
//     "</script>" written inside a JS string or `${...}`-templated HTML
//     string does not prematurely terminate the block.
// It is NOT a full JS parser (e.g. regex-literal slashes can still be
// misread as comment delimiters in rare cases), but it fixes the two
// concrete false-positive classes found in this repo while still catching
// genuinely malformed markup (an inline <script> left open/unclosed).
function extractInlineScripts(html) {
  const blocks = [];
  const modeStack = ['html'];
  const top = () => modeStack[modeStack.length - 1];
  let curStart = -1;
  let i = 0;
  const n = html.length;

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
        i = end;
        continue;
      }
      if (html.startsWith('//', i)) { modeStack.push('line-comment'); i += 2; continue; }
      if (html.startsWith('/*', i)) { modeStack.push('block-comment'); i += 2; continue; }
      if (html[i] === "'") { modeStack.push('sq'); i++; continue; }
      if (html[i] === '"') { modeStack.push('dq'); i++; continue; }
      if (html[i] === '`') { modeStack.push('tpl'); i++; continue; }
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

    if (m === 'sq' || m === 'dq') {
      const q = m === 'sq' ? "'" : '"';
      if (html[i] === '\\') { i += 2; continue; }
      if (html[i] === q) { modeStack.pop(); i++; continue; }
      if (html[i] === '\n') { modeStack.pop(); continue; } // safety valve: real strings don't span raw newlines
      i++; continue;
    }

    if (m === 'tpl') {
      if (html[i] === '\\') { i += 2; continue; }
      if (html[i] === '`') { modeStack.pop(); i++; continue; }
      if (html.startsWith('${', i)) { modeStack.push({ type: 'tpl-expr', depth: 1 }); i += 2; continue; }
      i++; continue;
    }

    if (typeof m === 'object' && m.type === 'tpl-expr') {
      if (html[i] === '{') { m.depth++; i++; continue; }
      if (html[i] === '}') {
        m.depth--;
        i++;
        if (m.depth === 0) modeStack.pop();
        continue;
      }
      if (html.startsWith('//', i)) { modeStack.push('line-comment'); i += 2; continue; }
      if (html.startsWith('/*', i)) { modeStack.push('block-comment'); i += 2; continue; }
      if (html[i] === "'") { modeStack.push('sq'); i++; continue; }
      if (html[i] === '"') { modeStack.push('dq'); i++; continue; }
      if (html[i] === '`') { modeStack.push('tpl'); i++; continue; }
      i++; continue;
    }

    i++; // fallback, should not normally be reached
  }

  return blocks;
}

module.exports = { extractInlineScripts };
