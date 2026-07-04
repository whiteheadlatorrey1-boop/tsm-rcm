#!/usr/bin/env python3
"""
fix_pdfparse_v2_api.py
Corrects an already-applied finops.js patch that used the OLD pdf-parse v1
function-call API (`const data = await pdfParse(raw); text = data.text`).
The installed pdf-parse is v2.x, which replaced that with a PDFParse class:
`new PDFParse({ data: buffer }).getText()`. The v1-style call throws
"pdfParse is not a function" on every PDF upload, silently caught, always
returning empty text.

This script ONLY touches:
  1. The require line: `const pdfParse = require('pdf-parse');`
                     -> `const { PDFParse } = require('pdf-parse');`
  2. The PDF branch inside safeTextFromBuffer():
     `const data = await pdfParse(raw); text = data.text || '';`
     -> proper PDFParse class usage with destroy() cleanup

Aborts with zero changes if either target isn't found exactly once.

Usage:
    python3 fix_pdfparse_v2_api.py routes/finops.js
"""
import sys
import shutil
from pathlib import Path

OLD_REQUIRE = "const pdfParse = require('pdf-parse');\n"
NEW_REQUIRE = "const { PDFParse } = require('pdf-parse');\n"

OLD_PDF_BRANCH = """    } else if (name.endsWith('.pdf')) {
      const data = await pdfParse(raw);
      text = data.text || '';
    } else if (name.endsWith('.docx')) {"""

NEW_PDF_BRANCH = """    } else if (name.endsWith('.pdf')) {
      const parser = new PDFParse({ data: raw });
      try {
        const result = await parser.getText();
        text = result.text || '';
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith('.docx')) {"""


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix_pdfparse_v2_api.py routes/finops.js")
        sys.exit(1)

    filepath = Path(sys.argv[1])
    if not filepath.exists():
        print(f"ERROR: {filepath} not found")
        sys.exit(1)

    text = filepath.read_text(encoding='utf-8')

    problems = []
    req_count = text.count(OLD_REQUIRE)
    branch_count = text.count(OLD_PDF_BRANCH)

    if req_count != 1:
        problems.append(f'  - old pdf-parse require line: expected 1 match, found {req_count}')
    if branch_count != 1:
        problems.append(f'  - old pdfParse(raw) call branch: expected 1 match, found {branch_count}')

    if problems:
        print("ABORTING — no changes made. The following didn't match as expected:")
        print("\n".join(problems))
        print("\nPaste the current file contents so the patch can be adjusted.")
        sys.exit(1)

    backup_path = filepath.with_suffix(filepath.suffix + '.bak')
    shutil.copy2(filepath, backup_path)
    print(f"Backup written to {backup_path}")

    text = text.replace(OLD_REQUIRE, NEW_REQUIRE, 1)
    print("Fixed: pdf-parse require -> PDFParse class import")

    text = text.replace(OLD_PDF_BRANCH, NEW_PDF_BRANCH, 1)
    print("Fixed: PDF branch now uses PDFParse class API with destroy() cleanup")

    filepath.write_text(text, encoding='utf-8')
    print(f"\nDone. {filepath} updated successfully.")
    print("\nNext steps:")
    print(f"  node -c {filepath}")
    print(f"  git diff {filepath}")


if __name__ == '__main__':
    main()