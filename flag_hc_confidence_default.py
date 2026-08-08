path = "html/war-rooms/health-war/hc-main-strategist.html"
with open(path) as f:
    content = f.read()

old = '''            const hcExposureNum = hcParseExposureNumber(getKpiByLabel('Revenue at Risk'));
            const hcConf = Number.isFinite(obj.confidence) ? obj.confidence : null;
            const hcAnomaly = {
              id: 'hc-' + Date.now(),
              title: 'HonorHealth Strategist Synthesis',
              severity: hcSeverityForExposure(hcExposureNum, hcConf),
              exposure: hcExposureNum,
              confidence: hcConf !== null ? hcConf : 78,'''

new = '''            const hcExposureNum = hcParseExposureNumber(getKpiByLabel('Revenue at Risk'));
            const hcConf = Number.isFinite(obj.confidence) ? obj.confidence : null;
            if (hcConf === null) {
              console.warn('[sentinel-push] healthcare: live response omitted "confidence" field — defaulting to 78. Raw JSON:', obj);
              obj.confidenceDefaulted = true;
            }
            const hcAnomaly = {
              id: 'hc-' + Date.now(),
              title: 'HonorHealth Strategist Synthesis',
              severity: hcSeverityForExposure(hcExposureNum, hcConf),
              exposure: hcExposureNum,
              confidence: hcConf !== null ? hcConf : 78,'''

assert old in content, "target block not found — file may have changed"
assert content.count(old) == 1, "target block not unique"
content = content.replace(old, new)

with open(path, "w") as f:
    f.write(content)

print("Flagged missing-confidence default in sentinel push with console.warn + obj.confidenceDefaulted marker.")
