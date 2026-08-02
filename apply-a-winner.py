#!/usr/bin/env python3
"""
Patch: add TSMAssistant.init() for Construction, right after the widget
script tag fixed earlier this session.

Confirmed by inspection (not guessed):
  - docText and engOut are top-level globals (line 538), not scoped
    inside a function -- genuinely accessible from a new script block.
  - engOut[i] holds engine output text for i in 1..6 (confirmed via
    engOut[i]=text at line 878, and the 'ENGINE 0${i}' naming
    convention already used in exportFull() at line 1526).
  - Construction's data is free-text AI output (buildDefectManifest
    returns a joined string, not structured objects), so NO getBriefing
    is supplied. Per the widget's own documented fallback behavior, it
    will show a normal greeting instead of an explainability briefing.
    This is honest scoping, not a shortcut -- inventing severity/ranking
    data that doesn't exist in the source would be a worse outcome.

Anchor must match exactly once, or this skips and reports why.
"""

import os

TARGET = "html/war-rooms/construct-war/construction-war-room.html"
ANCHOR = '<script src="/html/shared/js/tsm-assistant-widget.js"></script>'

NEW_BLOCK = '''<script>
function constructionAssistantContext() {
  const parts = [];
  if (docText) parts.push('Document loaded (' + selectedDocType + '): ' + docText.slice(0, 2000));
  for (let i = 1; i <= 6; i++) {
    if (engOut[i]) parts.push('ENGINE 0' + i + ' output: ' + String(engOut[i]).slice(0, 1000));
  }
  return parts.join('\\n\\n') || 'No document loaded yet in the Construction war room.';
}
TSMAssistant.init({
  vertical: 'Construction',
  app: 'construction',
  getContext: constructionAssistantContext,
  quickPrompts: ['What are the key risks in this document?', 'Summarize the financial impact', 'What deadlines are coming up?']
  // No getBriefing: Construction's engine output is free-text, not the
  // structured {severity,title,...} shape HotelOps' anomalies use.
  // Widget falls back to a normal greeting per its documented behavior.
});
</script>
'''


def main():
    if not os.path.exists(TARGET):
        print(f"[SKIPPED] {TARGET}: file not found")
        return

    with open(TARGET, "r", encoding="utf-8") as f:
        html = f.read()

    count = html.count(ANCHOR)
    if count != 1:
        print(f"[SKIPPED] {TARGET}: anchor found {count} time(s), expected 1 -- refusing to guess.")
        return

    insertion = ANCHOR + "\n" + NEW_BLOCK
    new_html = html.replace(ANCHOR, insertion, 1)

    with open(TARGET, "w", encoding="utf-8") as f:
        f.write(new_html)

    print(f"[PATCHED] {TARGET}: added constructionAssistantContext() + TSMAssistant.init()")
    print("NOT committed. Run `git diff` and a node --check on the extracted script before trusting it.")


if __name__ == "__main__":
    main()