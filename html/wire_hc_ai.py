#!/usr/bin/env python3
# One-shot: rewires callAI in all HC + healthcare HTML files to hit /api/hc/query
# Replaces the broken TSM_BRIDGE fetch with a direct call to our live Groq endpoint

import os
import re

ROOT = '/workspaces/tsm-shell'

HC_FILES = [
    'healthcare-command.html',
    'hc-billing.tsmatter.html',
    'hc-compliance.tsmatter.html',
    'hc-financial.tsmatter.html',
    'hc-grants.tsmatter.html',
    'hc-insurance.tsmatter.html',
    'hc-legal.tsmatter.html',
    'hc-medical.tsmatter.html',
    'hc-pharmacy.tsmatter.html',
    'hc-strategist.tsmatter.html',
    'hc-taxprep.tsmatter.html',
    'hc-vendors.tsmatter.html',
    'samplehealthsystem-dee.html',
    'tsm-samplehealthsystem-dee.tsmatter.html',
]

# The new callAI that hits our real Groq endpoint
NEW_CALL_AI = '''async function callAI(systemPrompt, userMessage, onChunk, onDone) {
  try {
    const res = await fetch('/api/hc/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: userMessage, context: systemPrompt, maxTokens: 1024 })
    });
    if (!res.ok) {
      onChunk('[AI Error ' + res.status + '] Could not reach TSM AI engine.');
      if (onDone) onDone();
      return;
    }
    const data = await res.json();
    const text = data.answer || data.response || data.content || JSON.stringify(data);
    // Simulate streaming by chunking the response
    const words = text.split(' ');
    for (let i = 0; i < words.length; i++) {
      onChunk((i === 0 ? '' : ' ') + words[i]);
      if (i % 8 === 0) await new Promise(r => setTimeout(r, 18));
    }
    if (onDone) onDone();
  } catch(e) {
    onChunk('[AI Error] ' + e.message);
    if (onDone) onDone();
  }
}'''

# Pattern to match existing callAI function
CALL_AI_PATTERN = re.compile(
    r'async function callAI\s*\([^)]*\)\s*\{.*?\n\}',
    re.DOTALL
)

# Also kill the TSM_BRIDGE script tag
BRIDGE_PATTERN = re.compile(
    r'<script>[^<]*TSM_BRIDGE[^<]*</script>\s*'
)

patched = 0
skipped = 0

for fname in HC_FILES:
    fpath = os.path.join(ROOT, fname)
    if not os.path.exists(fpath):
        print(f'⚠️  NOT FOUND: {fname}')
        skipped += 1
        continue

    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # Remove TSM_BRIDGE script tag
    content = BRIDGE_PATTERN.sub('', content)

    # Replace callAI function
    if 'async function callAI' in content:
        content = CALL_AI_PATTERN.sub(NEW_CALL_AI, content)
        print(f'✅ {fname} → callAI wired to /api/hc/query')
        patched += 1
    else:
        # Inject callAI before </script> closing tag near end
        if '</script>' in content:
            content = content.replace('</script>', NEW_CALL_AI + '\n</script>', 1)
            print(f'✅ {fname} → callAI injected (was missing)')
            patched += 1
        else:
            print(f'⚠️  {fname} → no </script> found, skipping')
            skipped += 1
            continue

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)

print('')
print(f'=== DONE: {patched} patched, {skipped} skipped ===')
print('Run: bash predeploy_titles.sh && fly deploy')
