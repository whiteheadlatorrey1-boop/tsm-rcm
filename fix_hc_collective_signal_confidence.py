path = "html/war-rooms/health-war/hc-main-strategist.html"
with open(path) as f:
    content = f.read()

old = '''      const hcCsExposureNum = hcCsParseExposureNumber(kpi.totalAtRisk || live.revenueAtRisk);
      const hcCsRisk = hcCsSeverityForExposure(hcCsExposureNum);
      const hcCsHasUrgent = Array.isArray(payload.alerts?.urgent) && payload.alerts.urgent.length > 0;
      fetch('/api/collective/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'healthcare',
          warRoom: 'HC Main Strategist',
          bnca: (bnca.revenuePosition || bnca.denialIntel || '').slice(0, 400) || 'Healthcare strategist synthesis complete.',
          confidence: 78,'''

new = '''      const hcCsExposureNum = hcCsParseExposureNumber(kpi.totalAtRisk || live.revenueAtRisk);
      const hcCsRisk = hcCsSeverityForExposure(hcCsExposureNum);
      const hcCsHasUrgent = Array.isArray(payload.alerts?.urgent) && payload.alerts.urgent.length > 0;
      // Was previously hardcoded to 78 on every escalation regardless of
      // what the live Strategist Score DOM actually showed. live.strategistScore
      // is the real deterministic score already computed for this page (see
      // the "Pull REAL values straight off the live strategist DOM" block
      // above) — reuse it instead of a static number.
      const hcCsConfParsed = parseInt(live.strategistScore, 10);
      const hcCsConf = Number.isFinite(hcCsConfParsed) ? hcCsConfParsed : 78;
      if (!Number.isFinite(hcCsConfParsed)) {
        console.warn('[collective-signal] healthcare: strat-score unavailable ("' + live.strategistScore + '"), defaulting confidence to 78');
      }
      fetch('/api/collective/signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vertical: 'healthcare',
          warRoom: 'HC Main Strategist',
          bnca: (bnca.revenuePosition || bnca.denialIntel || '').slice(0, 400) || 'Healthcare strategist synthesis complete.',
          confidence: hcCsConf,'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("Fixed: collective signal now uses live.strategistScore instead of hardcoded 78.")
