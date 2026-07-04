#!/usr/bin/env python3
"""
apply_finops_fixes_v2.py
Safely patches routes/finops.js:
  1. Adds pdf-parse/mammoth/xlsx requires (pdf-parse v2.x API: PDFParse class)
  2. Replaces safeTextFromBuffer() with real async PDF/DOCX/XLSX extraction
     (located by start/end anchors, not exact whitespace)
  3. Extends REAL_TEXT_EXTENSIONS allowlist
  4. Adds `await` at the safeTextFromBuffer(file) call site

CHANGE FROM v1 OF THIS SCRIPT:
  The installed pdf-parse is v2.4.5, which replaced the old v1
  `pdf(buffer) -> {text}` function API with a `PDFParse` class:
  `new PDFParse({ data: buffer }).getText()`. The original script used the
  old function-call API, which would throw "pdfParse is not a function" on
  every PDF upload and silently fall into the catch block, returning empty
  text. This version uses the correct v2 class API and calls destroy()
  after use to release parser resources.

Aborts with zero changes if any anchor/string isn't found exactly once.

Usage:
    python3 apply_finops_fixes_v2.py routes/finops.js
"""
import sys
import shutil
from pathlib import Path

NEW_FUNCTION = """async function safeTextFromBuffer(file){
  const name = (file.originalname || 'uploaded-document').toLowerCase();
  const raw = file.buffer || Buffer.from('');
  let text = '';

  try {
    if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') || name.endsWith('.json')) {
      text = raw.toString('utf8');
    } else if (name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: raw });
      try {
        const result = await parser.getText();
        text = result.text || '';
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: raw });
      text = result.value || '';
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const workbook = XLSX.read(raw, { type: 'buffer' });
      text = workbook.SheetNames.map(sheetName =>
        XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])
      ).join('\\n\\n');
    } else {
      text = '';
    }
  } catch (err) {
    console.error(`safeTextFromBuffer failed for ${file.originalname}:`, err.message);
    text = '';
  }

  return String(text || '').slice(0, 6000);
}

"""

FUNC_START = "function safeTextFromBuffer(file){"
FUNC_END_ANCHOR = "function classifyFinopsDoc(text){"

SIMPLE_EDITS = [
    {
        "name": "Add requires",
        "old": "const multer = require('multer');\n",
        "new": (
            "const multer = require('multer');\n"
            "const { PDFParse } = require('pdf-parse');\n"
            "const mammoth = require('mammoth');\n"
            "const XLSX = require('xlsx');\n"
        ),
    },
    {
        "name": "Extend REAL_TEXT_EXTENSIONS allowlist",
        "old": "const REAL_TEXT_EXTENSIONS = ['.txt', '.csv', '.md', '.json'];\n",
        "new": "const REAL_TEXT_EXTENSIONS = ['.txt', '.csv', '.md', '.json', '.pdf', '.docx', '.xlsx', '.xls'];\n",
    },
    {
        "name": "Add await at call site",
        "old": "    const text = safeTextFromBuffer(file);\n",
        "new": "    const text = await safeTextFromBuffer(file);\n",
    },
]


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 apply_finops_fixes_v2.py routes/finops.js")
        sys.exit(1)

    filepath = Path(sys.argv[1])
    if not filepath.exists():
        print(f"ERROR: {filepath} not found")
        sys.exit(1)

    text = filepath.read_text(encoding='utf-8')

    problems = []

    start_count = text.count(FUNC_START)
    end_count = text.count(FUNC_END_ANCHOR)
    if start_count != 1:
        problems.append(f'  - safeTextFromBuffer start anchor: expected 1 match, found {start_count}')
    if end_count != 1:
        problems.append(f'  - classifyFinopsDoc start anchor: expected 1 match, found {end_count}')
    if start_count == 1 and end_count == 1:
        start_idx = text.index(FUNC_START)
        end_idx = text.index(FUNC_END_ANCHOR)
        if end_idx <= start_idx:
            problems.append('  - classifyFinopsDoc anchor appears BEFORE safeTextFromBuffer — unexpected file order')

    for edit in SIMPLE_EDITS:
        count = text.count(edit["old"])
        if count != 1:
            problems.append(f'  - "{edit["name"]}": expected 1 match, found {count}')

    if problems:
        print("ABORTING — no changes made. The following didn't match as expected:")
        print("\n".join(problems))
        print("\nPaste the current file contents so the patch can be adjusted.")
        sys.exit(1)

    backup_path = filepath.with_suffix(filepath.suffix + '.bak')
    shutil.copy2(filepath, backup_path)
    print(f"Backup written to {backup_path}")

    start_idx = text.index(FUNC_START)
    end_idx = text.index(FUNC_END_ANCHOR)
    text = text[:start_idx] + NEW_FUNCTION + text[end_idx:]
    print("Replaced safeTextFromBuffer() implementation (anchor-based).")

    for edit in SIMPLE_EDITS:
        text = text.replace(edit["old"], edit["new"], 1)
        print(f"Applied: {edit['name']}")

    filepath.write_text(text, encoding='utf-8')
    print(f"\nDone. {filepath} updated successfully.")
    print("\nNext steps:")
    print(f"  node -c {filepath}")
    print(f"  git diff {filepath}")


if __name__ == '__main__':
    main()