# Demo Console — Immediate Action Items

## Your Current Position

✅ **Done:**
- Construction, BPO, FinOps, Schools all recorded (27s–36s runtimes, ~1.8–2.1MB each)
- Insurance & Mortgage already live on CDN
- Demo console wired and waiting (`tsm-demo-console.html`)

🔴 **Blocking:**
- 4 videos exist locally but not yet uploaded to CDN
- Legal: spec exists but never recorded

---

## Recommendation: Do CDN First (15–20 min total)

### Why
- **Get finished work live**: 4 videos are ready to ship
- **Unblock iteration**: Once on CDN, you can test wiring/seeking live
- **Legal context**: Better to record legal *after* you see the full console working end-to-end with 4 live demos

### Steps

**1. Upload batch (5–10 min)**
```bash
bash upload-demos.sh
```
(See `/upload-demos.sh` for full AWS S3 script; adjust if using different CDN)

**2. Verify all 4 load (2–3 min)**
- Open `tsm-demo-console.html` in browser
- Left rail should show: Construction, BPO, FinOps, Insurance, Mortgage, Schools (6 total now)
- Click each one → video should load + play

**3. Test step seeking on all 4 (2–3 min)**
- Select construction
- Click step 2 → video should jump to that timestamp
- Relay chain should light up progressively
- Repeat for bpo, finops, schools

### If Any Fail
Check browser Network tab → likely a 404 on the video URL. Common fixes:
- Filename mismatch (e.g., `construction_demo.mp4` vs `construction-demo.mp4`)
- CDN cache not propagated yet (wait 30–60s, refresh)
- Permission issue on CDN bucket

---

## Then: Legal Recording (30–45 min)

Once all 4 are live and seeking works:

1. **Decide the flow** (mirror construction/bpo/finops pattern)
   - Legal War Room → load sample contract
   - Fire engines / run analysis
   - Escalate to Strategist → generate brief
   - Hand to Executive Portal → render KPIs

2. **Record unscripted**
   - Hit record, click through each step live
   - Let it capture the full handoff chain

3. **Edit if needed** (trim, clean up any stutters)

4. **Add to console** (5 min)
   - Insert entry into DATA array:
     ```javascript
     {
       id: "legal",
       name: "Legal",
       tag: "LEGAL-WAR",
       title: "Contract intake to counsel advisory brief",
       desc: "...",
       video: `${BASE}/legal-demo.mp4`,
       chain: ["War Room", "Strategist", "Exec Portal"],
       steps: [ /* populated from your recording */ ],
     }
     ```
   - Upload `legal-demo.mp4` to CDN (same process)

5. **Test in console** → done

---

## File References

All files are in `/mnt/user-data/outputs/`:

- **`demo-cdn-upload-strategy.md`** — Full technical guide (CDN options, S3 vs Fly.io, rollback, Q&A)
- **`upload-demos.sh`** — Ready-to-run bash script (AWS S3 batch upload with verification)
- **`NEXT_STEPS.md`** — This file (your checklist)

---

## Why Not Legal First?

1. **Legal spec hasn't been tested yet** — unfamiliar workflow, might surface new needs as you record
2. **Better to validate the pattern** with 4 working examples first (construction/bpo/finops/schools)
3. **Demo console wiring** is identical for all 6 — once 4 are live and verified, legal is just a copy-paste of the entry + your new video file

---

## Quick Reference: The Console Pattern

**File**: `/html/demo/tsm-demo-console.html`

**Video hosting**: `const BASE = "https://demos.tsmatter.com";` (line 340)

**Each demo** is an object in the DATA array (line 426–534):
```javascript
{
  id: "construction",           // Used in URL, must match filename prefix
  name: "Construction",
  tag: "CONST-WAR",
  title: "...",                 // Shown in console
  desc: "...",                  // Shown in console
  video: `${BASE}/construction-demo.mp4`,  // Auto-resolves once file on CDN
  chain: ["War Room", "Strategist", "Exec Portal"],
  steps: [
    { t: 0, chain: 0, text: "..." },
    // ... (one entry per step, ordered by video timestamp)
  ],
}
```

**No code changes needed** to wire videos once they're on the CDN — just drop the file and it loads.

---

## Done When

✅ All 4 demos live on CDN  
✅ All 4 load in console without 404s  
✅ Step seeking works on all 4  
✅ Legal recorded and added to console

**Estimated time**: CDN = 15–20 min, Legal recording+wiring = 30–45 min  
**Total**: ~1 hour to full 6-demo console live
