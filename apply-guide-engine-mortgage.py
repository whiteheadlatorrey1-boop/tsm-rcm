#!/usr/bin/env python3
"""
Adds the (partially) verified TSM Universal Guide Engine and wires it into
mortgage-war-room.html only — the one page with a real STATE_CHECKERS entry.
No other vertical is touched. Run from the repo root.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
ENGINE_SRC = ROOT / "tsm-guide-engine.js"
ENGINE_DEST = ROOT / "html" / "js" / "tsm-guide-engine.js"
TARGET = ROOT / "html" / "war-rooms" / "mortgage" / "mortgage-war-room.html"

SCRIPT_TAG = '<script src="/html/js/tsm-guide-engine.js" data-vertical="mortgage" data-page-role="warroom"></script>\n'

def main():
    assert ENGINE_SRC.exists(), f"missing source engine file: {ENGINE_SRC}"
    assert TARGET.exists(), f"missing target page: {TARGET}"

    engine_code = ENGINE_SRC.read_text()
    assert "STATE_CHECKERS" in engine_code, "engine file looks wrong (no STATE_CHECKERS) — not writing"

    ENGINE_DEST.parent.mkdir(parents=True, exist_ok=True)
    ENGINE_DEST.write_text(engine_code)
    print(f"wrote {ENGINE_DEST}")

    html = TARGET.read_text()
    assert "tsm-guide-engine.js" not in html, "mortgage-war-room.html already references the guide engine — aborting, check manually"
    assert "</body>" in html, "no </body> found in target — aborting"

    new_html = html.replace("</body>", SCRIPT_TAG + "</body>", 1)
    assert new_html != html, "replacement had no effect — aborting"
    assert new_html.count("</body>") == html.count("</body>"), "body-tag count changed unexpectedly — aborting"

    TARGET.write_text(new_html)
    print(f"wired guide engine into {TARGET}")
    print("Done. Verify with: node --check html/js/tsm-guide-engine.js")

if __name__ == "__main__":
    main()
