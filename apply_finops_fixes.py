#!/usr/bin/env python3
"""
apply_finops_fixes.py
Safely patches routes/finops.js:
  1. Adds pdf-parse/mammoth/xlsx requires
  2. Replaces safeTextFromBuffer() with real async PDF/DOCX/XLSX extraction
  3. Extends REAL_TEXT_EXTENSIONS allowlist
  4. Adds `await` at the safeTextFromBuffer(file) call site

Uses exact string matching (not brace-parsing) against known verbatim
source, and aborts with zero changes if any expected block isn't found
exactly once.

Usage:
    python3 apply_finops_fixes.py routes/finops.js
"""
import sys
import shutil
from pathlib import Path

EDITS = [
    {
        "name": "Add requires",
        "old": "const multer = require('multer');\n",
        "new": (
            "const multer = require('multer');\n"
            "const pdfParse = require('pdf-parse');\n"
            "const mammoth = require('mammoth');\n"
            "const XLSX = require('xlsx');\n"
        ),
    },
    {
        "name": "Replace safeTextFromBuffer()",
        "old": (
            "function safeTextFromBuffer(file){\n"
            "  const name = (file.originalname || 'uploaded-document').toLowerCase();\n"
            "  const raw = file.buffer || Buffer.from('');\n"
            "  let text = '';\n"
            "  if(name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') || name.endsWith('.json')){\n"
            "    text = raw.toString('utf8');\n"
            "  }else{\n"
            "    // Demo-safe fallback for PDFs/images/xlsx/docx without parser dependencies.\n"
            "    text = `Uploaded file: ${file.originalname}\n"
            "Mime type: ${file.mimetype}\n"
            "Size: ${file.size} bytes\n"
            "Document structure normalized for demo analysis.\n"
            "Recommended document categories:\n"
            "- Bank reconciliation\n"
            "- AP aging\n"
            "- AR ledger\n"
            "- Financial statement package\n"
            "- Budget variance\n"
            "- GL detail\n"
            "- 1099 / W-9 tracker\n"
            "- Audit findings`;\n"
            "  }\n"
            "  return String(text || '').slice(0, 6000);\n"
            "}\n"
        ),
        "new": (
            "async function safeTextFromBuffer(file){\n"
            "  const name = (file.originalname || 'uploaded-document').toLowerCase();\n"
            "  const raw = file.buffer || Buffer.from('');\n"
            "  let text = '';\n"
            "\n"
            "  try {\n"
            "    if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.md') || name.endsWith('.json')) {\n"
            "      text = raw.toString('utf8');\n"
            "    } else if (name.endsWith('.pdf')) {\n"
            "      const data = await pdfParse(raw);\n"
            "      text = data.text || '';\n"
            "    } else if (name.endsWith('.docx')) {\n"
            "      const result = await mammoth.extractRawText({ buffer: raw });\n"
            "      text = result.value || '';\n"
            "    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {\n"
            "      const workbook = XLSX.read(raw, { type: 'buffer' });\n"
            "      text = workbook.SheetNames.map(sheetName =>\n"
            "        XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName])\n"
            "      ).join('\\n\\n');\n"
            "    } else {\n"
            "      text = '';\n"
            "    }\n"
            "  } catch (err) {\n"
            "    console.error(`safeTextFromBuffer failed for ${file.originalname}:`, err.message);\n"
            "    text = '';\n"
            "  }\n"
            "\n"
            "  return String(text || '').slice(0, 6000);\n"
            "}\n"
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
        print("Usage: python3 apply_finops_fixes.py routes/finops.js")
        sys.exit(1)

    filepath = Path(sys.argv[1])
    if not filepath.exists():
        print(f"ERROR: {filepath} not found")
        sys.exit(1)

    text = filepath.read_text(encoding='utf-8')

    # --- Verify every edit's target exists exactly once BEFORE changing anything ---
    problems = []
    for edit in EDITS:
        count = text.count(edit["old"])
        if count != 1:
            problems.append(f'  - "{edit["name"]}": expected 1 match, found {count}')

    if problems:
        print("ABORTING — no changes made. The following blocks didn't match exactly once:")
        print("\n".join(problems))
        print("\nThis means the file differs from what this script expects.")
        print("Paste the current file contents so the patch can be adjusted.")
        sys.exit(1)

    # --- All checks passed, back up then apply ---
    backup_path = filepath.with_suffix(filepath.suffix + '.bak')
    shutil.copy2(filepath, backup_path)
    print(f"Backup written to {backup_path}")

    for edit in EDITS:
        text = text.replace(edit["old"], edit["new"], 1)
        print(f"Applied: {edit['name']}")

    filepath.write_text(text, encoding='utf-8')
    print(f"\nDone. {filepath} updated successfully.")
    print("\nNext steps:")
    print(f"  node -c {filepath}")
    print(f"  git diff {filepath}")


if __name__ == '__main__':
    main()