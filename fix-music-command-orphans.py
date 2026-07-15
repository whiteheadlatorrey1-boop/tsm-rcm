import re, sys

DUP_BLOCK = '''window.TSM_UI = {
    runAudit: async (sector, factor) => {
        const feed = document.querySelector('.intelligence-feed-output') || document.getElementById('intelligence-feed-output');
        if (feed) feed.innerHTML = '<span style="color: #00ffff;">[STRATEGIST] Internal Link: Processing...</span>';
        try {
            const res = await fetch('/api/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `auditops "${sector}" --factor "${factor}" --logic strategist` })
            });
            const data = await res.json();
            if (feed) feed.innerText = `[STRATEGIST] ${data.output || "Analysis Complete."}`;
        } catch (e) {
            if (feed) feed.innerText = "[STRATEGIST] Local API Bridge Failed.";
        }
    }
};
// Wire the sector cards to the auto-fill search prompt logic
document.addEventListener('click', (e) => {
    const card = e.target.closest('.module-card');
    if (card) {
        const sector = card.dataset.sector || "Construction";
        const factor = card.querySelector('h3')?.innerText || "General Audit";
        TSM_UI.runAudit(sector, factor);
    }
});
console.log("TSM_UI: Direct Neural Link Established.");
'''

def fix_dup(path):
    with open(path, encoding='utf-8') as f:
        text = f.read()
    n = text.count(DUP_BLOCK)
    if n < 2:
        print(f"SKIP {path}: expected 2 copies of the block, found {n} (already fixed, or content differs — check manually)")
        return
    # Remove the second occurrence (the orphaned one) plus the dangling </script> right after it
    idx1 = text.find(DUP_BLOCK)
    idx2 = text.find(DUP_BLOCK, idx1 + len(DUP_BLOCK))
    after = text[idx2 + len(DUP_BLOCK):]
    m = re.match(r'\s*</script>', after)
    if not m:
        print(f"SKIP {path}: second copy not followed by dangling </script> as expected — check manually")
        return
    new_text = text[:idx2] + after[m.end():]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_text)
    print(f"FIXED {path}: removed orphaned duplicate block")

for p in [
    "html/music-command/demo-conductor.html",
    "html/music-command/how-to-guide.html",
    "html/music-command/presentation-live.html",
]:
    fix_dup(p)

# presentation-live.html only: restore missing <script> tag before getToken()
plive = "html/music-command/presentation-live.html"
with open(plive, encoding='utf-8') as f:
    text = f.read()
needle = "\n\nfunction getToken(){"
if "<script>\nfunction getToken(){" in text:
    print(f"SKIP {plive}: getToken() already wrapped in <script>")
elif needle in text:
    text = text.replace(needle, "\n\n<script>\nfunction getToken(){", 1)
    with open(plive, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f"FIXED {plive}: restored missing <script> tag before getToken()")
else:
    print(f"SKIP {plive}: getToken() pattern not found — check manually")
