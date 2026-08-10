# SUNDAY NIGHT PRE-FLIGHT CHECKLIST
## Run This Entire Checklist Tomorrow. Don't Skip Steps.

---

## 1. SYSTEM & NETWORK CHECK (10 minutes)

### Browser & Hardware
- [ ] **Browser version**: Open Chrome / Safari / Firefox and confirm it's up to date (Help → About)
- [ ] **Clear cache**: Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows) → Select "All time" → Clear browsing data
- [ ] **Close extra tabs**: Close everything except your demo tabs to free RAM
- [ ] **Projector/display**: Connect to the presentation screen you'll use Monday. Confirm resolution is 1920x1080 or higher (no weird stretching)
- [ ] **Screen brightness**: Set to 75%+ (white background should be bright, not washed out)

### Network
- [ ] **Primary network**: Test the WiFi or Ethernet you'll use Monday. Speed test: run speedtest.net → confirm > 10 Mbps download
- [ ] **Backup network**: Have a mobile hotspot tested and ready (phone hotspot, not a rental device)
- [ ] **Ping Groq servers**: Open terminal → `ping api.groq.com` → confirm < 50ms latency
- [ ] **DNS resolution**: `nslookup api.groq.com` → should resolve to an IP address (not "host not found")

---

## 2. API & QUOTA CHECK (5 minutes)

### Groq API Status
- [ ] **Visit**: https://console.groq.com/settings/limits
- [ ] **Check usage**: What % of your monthly quota have you used?
  - [ ] If < 70%: You're fine for the day
  - [ ] If 70-85%: Monitor it during demos; be ready to switch to static fallback output
  - [ ] If > 85%: Request a quota increase NOW or prepare pre-run screenshots (don't wait until Monday morning)
- [ ] **Check rate limits**: Concurrent requests limit should be 5+ (you'll only make 1-2 requests at a time, so you're safe)
- [ ] **Verify API key is valid**: Test on a simple request:
  ```bash
  curl -X POST https://api.groq.com/openai/v1/chat/completions \
    -H "Authorization: Bearer YOUR_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"mixtral-8x7b-32768","messages":[{"role":"user","content":"hello"}],"max_tokens":10}'
  ```
  If it returns a response (even short), your key is valid.

---

## 3. CONSTRUCTION DEMO TEST (15 minutes)

### Setup
- [ ] **File location**: Navigate to `/home/claude/tsm-rcm/html/construction-suite/property-accounting-revenue-cycle.html`
- [ ] **Open in browser**: Ctrl+O (or drag-drop into browser) and open that file
- [ ] **Page loads**: You should see the KPI cards (Budget: $482,000, Actual: $517,400, Variance: +7.3%)

### Functional Tests
- [ ] **Budget input field**:
  - Click on the input box (says "$482000")
  - Clear it (Cmd+A, then Delete)
  - Type "500000"
  - Click "SAVE BUDGET"
  - **Verify**: The Variance card above recalculates and flips from red to green. This should take < 2 seconds.
  - **If it doesn't**: There's a JavaScript error. Open dev tools (F12) → Console tab → check for red errors. Screenshot the error and slack it to your tech lead.

- [ ] **Exception Queue**:
  - Scroll down to the "Accounting Exception Queue" table
  - Verify you see 7 rows (P1 duplicate invoice, P1 reconciliation, P2 GL variance, P2 property tax, P2 insurance, P3 AP invoices, P3 retainage)
  - Click on the first row (duplicate invoice) → **verify** it highlights or expands
  - **If it doesn't**: The table is read-only in demo mode. That's fine. You can still point and describe.

- [ ] **Month-End Close Brief**:
  - Scroll to "Run Month-End Close"
  - Click "RUN MONTH-END CLOSE"
  - **Watch for 5-15 seconds** while the brief is generated (this calls the Groq API)
  - **Verify**: A block of text appears below showing the close analysis (starts with "PROPERTY ACCOUNTANT CLOSE ANALYSIS")
  - **If it hangs past 30 seconds**: Your API is slow or quota-blocked. Wait one more minute, then reload the page. If it still hangs, you'll use the pre-run screenshot on Monday.

- [ ] **Feed Exception Queue** (optional):
  - Scroll to the bottom
  - Click "FEED EXCEPTION QUEUE"
  - **Verify**: The brief text appends "✓ 7 EXCEPTIONS FED TO TSMExceptions"
  - **If it doesn't**: No big deal. This is a secondary feature. Your primary demo works.

### Screenshot Backup
- [ ] **Success scenario**: Once the brief loads successfully, take a full-page screenshot (Cmd+Shift+3 on Mac, Print Screen on Windows)
- [ ] **Save it**: Desktop > `CONSTRUCTION_DEMO_SUCCESS.png`
- [ ] **Purpose**: If the API is slow on Monday, you can show this as "here's what you'll see"

### Timing Test
- [ ] **Run the entire flow once**: Budget change → Exception Queue review → Run Close → Feed Queue
- [ ] **Note the time**: How long did it take from start to brief appearing? (Should be 30-60 seconds total)
- [ ] **If it's > 90 seconds**: You have an API latency issue. Check your network. If network is fine, it's a Groq quota/rate-limit issue.

---

## 4. HEALTHCARE DENIAL DEMO TEST (20 minutes)

### Setup
- [ ] **File location**: Navigate to `/home/claude/tsm-rcm/html/healthcare/hc-denial-war-room.html`
- [ ] **Open in browser**: Same as above (Ctrl+O)
- [ ] **Page loads**: You should see a red header "CLAIM DENIAL DETECTED" and a red "FIRE" button

### Functional Tests
- [ ] **Load Sample Denial**:
  - Look for the "⚡ Denial Sample" button (should be orange/amber colored)
  - Click it
  - **Verify**: Sample text appears in the textarea (the big text box on the left side)
  - **If it doesn't**: The button might be hidden. Scroll down to find it.

- [ ] **Pipeline Animation**:
  - Click the red "FIRE" button
  - **Watch the pipeline boxes** (you should see 5 boxes: cyan, amber, green, purple, teal)
  - **Verify**: Each box lights up sequentially as the engine completes
  - **Note the timing**: How long until all 5 boxes are lit?
    - < 20 seconds: Excellent, your API is fast
    - 20-30 seconds: Good, acceptable
    - 30-60 seconds: Slow, but functional
    - > 60 seconds: Your API is rate-limited or your network is slow. Check both.

- [ ] **Output Panels**:
  - Once the pipeline completes, look at the result panels below
  - **Left panel (DOCUMENT INTEL)**: Should show claim ID, CPT codes, denial codes, amounts (cyan text)
  - **Middle panel (FINANCIAL IMPACT)**: Should show "Financial Impact: $8,804" or similar (green text)
  - **Right panels (RECOVERY PLAN, RECOVERY NAVIGATOR)**: Should show step-by-step plan (purple and teal text)
  - **If any panel is empty or shows "ERROR"**: There's an API failure. Take a screenshot of the error (it's usually in the browser console). This is a problem to solve before Monday.

### Pipeline Stress Test
- [ ] **Run it a second time**:
  - Clear the textarea (select all text, delete)
  - Click "⚡ Denial Sample" again
  - Click "FIRE" again
  - **Verify**: Pipeline runs again with the same performance
  - **If it's slower the 2nd time**: You might be hitting rate limits. Each run = 5 LLM calls. If you're running this multiple times, Groq might be throttling you.

### Screenshot Backup
- [ ] **Success scenario**: Once the pipeline completes successfully, take a full-page screenshot showing all 5 lit stages and the output panels
- [ ] **Save it**: Desktop > `HEALTHCARE_DEMO_SUCCESS.png`
- [ ] **Backup output**: Copy/paste the Financial Impact text into a text file and save it as `HEALTHCARE_FINANCIAL_OUTPUT.txt` (in case the live demo hangs)

### Timing Test
- [ ] **Full flow**: Load sample → Fire → Wait for completion = Should take ~45-60 seconds total
- [ ] **If it's > 90 seconds**: Document it. You have an issue to address.

---

## 5. RCM-OS PLATFORM DEMO TEST (15 minutes)

### Setup
- [ ] **File location**: Navigate to `/home/claude/tsm-rcm/html/finops-suite/rcm-os-presentation.html`
- [ ] **Open in browser**
- [ ] **Page loads**: You should see the hero section ("One cadence for close. Nine modules. Zero blind spots.")

### Functional Tests - Presentation Page
- [ ] **Scroll to modules**: Scroll down to the "Nine Modules" grid
  - **Verify**: You see 9 module cards (Operations, Accounting, Compliance, etc.)
  - **Verify**: Each module has a title and a button (usually "Open Module")
  
- [ ] **Scroll to flow**: Scroll to "Cross-Module Flow" section
  - **Verify**: You see the section titled "How a thin current ratio becomes an executive exception"
  - **Verify**: There's a flow diagram or description explaining the 4-source integration

### Functional Tests - Live System
- [ ] **Find the launch button**: Look for "Launch RCM OS" or similar CTA button (usually top-right nav)
- [ ] **Click it**: Opens `tsm-rcm-os.html` (the live system)
- [ ] **Page loads**: You should see the main RCM-OS interface (might take 3-5 seconds)

- [ ] **Locate Cross-Module Exceptions panel**:
  - This should be a prominent panel on the main page
  - **Verify**: You see 3-5 rows with exception data
  - **Verify**: Each row has a source badge (Compliance, Vendor, Logistics, Working Capital)
  - **If the panel is empty ("0 records")**: Click a seed/demo-data button if it exists, or reload the page

- [ ] **Click on a row**: Select an exception
  - **Verify**: The row expands or highlights
  - **Verify**: You see the exception detail (description, source, financial impact, etc.)
  - **If no detail appears**: The UI might be static in demo mode. That's OK. You can still describe it.

- [ ] **Cadence tabs**:
  - Look for tabs: "Daily | Weekly | Month-End"
  - Click each one
  - **Verify**: Content changes (different exceptions, different data)
  - **If tabs are grayed out**: They might be disabled in demo mode. That's OK. You can explain the concept.

### Screenshot Backup
- [ ] **RCM-OS overview**: Take a screenshot of the main dashboard showing Cross-Module Exceptions
- [ ] **Save it**: Desktop > `RCMOS_DASHBOARD_SUCCESS.png`
- [ ] **Backup output**: Copy/paste a sample exception into a text file and save as `RCMOS_EXCEPTION_SAMPLE.txt`

---

## 6. FALLBACK SCREENSHOTS INVENTORY (10 minutes)

You now have 6 backup screenshots. Organize them:

```
Desktop/
├── MONDAY_DEMO_FALLBACKS/
│   ├── CONSTRUCTION_DEMO_SUCCESS.png
│   ├── HEALTHCARE_DEMO_SUCCESS.png
│   ├── RCMOS_DASHBOARD_SUCCESS.png
│   ├── HEALTHCARE_FINANCIAL_OUTPUT.txt
│   ├── RCMOS_EXCEPTION_SAMPLE.txt
│   └── README.txt (notes on what each is)
```

- [ ] **Create folder**: Desktop > New Folder > "MONDAY_DEMO_FALLBACKS"
- [ ] **Move screenshots there**
- [ ] **Create README**: In the folder, create a text file explaining each screenshot (what it shows, when to use it)
- [ ] **Backup to cloud**: Upload the folder to Google Drive or iCloud so you have a backup if your laptop dies

---

## 7. NETWORK STRESS TEST (10 minutes)

### Simulate Monday's Network Load
- [ ] **Open all 3 demos simultaneously** (in 3 browser tabs)
- [ ] **On tab 1 (Construction)**: Run the budget change + close brief generation
- [ ] **On tab 2 (Healthcare)**: Fire the denial pipeline
- [ ] **On tab 3 (RCM-OS)**: Load the live dashboard
- [ ] **Observe**: Do all 3 run smoothly, or does one lag while others wait?
  - If all smooth: Your network can handle parallel requests. You're good.
  - If lag on any: You have a network bottleneck. On Monday, load demos sequentially (one at a time) instead of parallel.

### API Stress Test
- [ ] **Run the denial pipeline twice in a row** (without waiting for cooldown)
- [ ] **Then run the construction close brief generation**
- [ ] **Observe**: Do all requests complete, or do any fail/timeout?
  - If all complete: You're under quota. Safe.
  - If any timeout: You're approaching quota limits. On Monday, space out the heavy API calls (don't run both denial pipeline AND construction brief on back-to-back requests).

---

## 8. FINAL WALKTHROUGH (30 minutes)

### Do a Full Mock Presentation (to yourself or a friend)

**Timing: 45 minutes total**
- Construction demo: 12 min
- Transition: 3 min
- Healthcare demo: 14 min
- Transition: 3 min
- RCM-OS demo: 16 min
- **Total: 48 minutes** (close enough)

### What to Watch For
- [ ] **Do I hesitate or pause on any button?** → Mark it, practice it 2x more
- [ ] **Does the API hang anywhere?** → You know now. Have fallback ready.
- [ ] **Do I know my talking points cold?** → If you're reading from notes, you're not ready. Practice again.
- [ ] **Do the transitions feel smooth?** → Closing line + brief pause + opening punch of next demo

### Recording (Optional but Recommended)
- [ ] **Have someone record you** (phone camera is fine)
- [ ] **Watch it back** with critical eye:
  - Pace (too fast / too slow)?
  - Eye contact (reading from screen vs. looking at audience)?
  - Clarity (am I explaining jargon?)?
  - Wow moments (are the live interactions getting gasps?)?

---

## 9. EQUIPMENT CHECK (5 minutes)

### Laptop
- [ ] **Charger**: Is it in your bag? Tested?
- [ ] **USB-C / HDMI adapter**: Do you have the right cable for the room's projector?
- [ ] **Keyboard/mouse**: Do you need an external mouse? Is it battery-backed?
- [ ] **Storage**: Do you have 5GB free space (just in case you record)?

### Phone (Backup)
- [ ] **Charged to 100%**: Do this tonight
- [ ] **Hotspot enabled**: Test it by connecting from your laptop to your phone's hotspot
- [ ] **Screenshots saved**: Do the backup images exist on your phone?
- [ ] **PDF of cheat sheet**: Email it to yourself and save it offline on your phone

### Presentation Materials
- [ ] **Cheat sheet printed**: 3 pages (Q&A, execution guide, quick reference)
- [ ] **Backup in PDF**: On your laptop AND phone
- [ ] **Notes**: Do you have written notes for anything you're worried about?

---

## 10. MONDAY MORNING FINAL CHECK (15 minutes)

**Do this Monday morning before heading to the first meeting.**

- [ ] **All 3 demo URLs are bookmarked and tested**
- [ ] **API quota is still OK** (check console.groq.com one more time)
- [ ] **Device is plugged in and charged** (if laptop battery is < 50%, charge it now)
- [ ] **Browser is cleared** (cache, cookies cleared, extra tabs closed)
- [ ] **Network is connected** (WiFi or Ethernet tested and fast)
- [ ] **Backup hotspot is on** and ready as fallback
- [ ] **Phone has screenshots** and PDF cheat sheet
- [ ] **Physical cheat sheet is in your bag**
- [ ] **You've eaten breakfast** (blood sugar matters for confidence and clarity)
- [ ] **You've taken a bathroom break** (don't be that person)
- [ ] **You've done a 2-minute breathing exercise** to calm your nerves
- [ ] **You've re-read the opening punch for each demo** (muscle memory)

---

## 11. IF SOMETHING BREAKS (The Night Before)

### Scenario: API quota is too high
**Action**: Request increase immediately via Groq console. If denied, prepare static fallback images. Plan to use pre-run screenshots on Monday instead of live API calls.

### Scenario: One demo page won't load
**Action**: Check for JavaScript errors (F12 → Console). Screenshot the error. Slack your tech lead. If you can't fix it by Sunday night, plan to skip that demo and combine the other two. Talk to your sales lead about which client meetings can be rescheduled.

### Scenario: Network is unusable
**Action**: Test your mobile hotspot extensively. Plan to use it as primary connection on Monday. If hotspot is also slow, ask the venue about a hardwired Ethernet connection (ask Monday morning, not Sunday).

### Scenario: You're panicking
**Action**: Stop. Breathe. These systems work. You've tested them. The worst case is you show pre-run screenshots and explain the concept. That still wins the deal. You've got this.

---

## SIGN-OFF

Print this entire checklist. Work through every item tonight. Don't skip anything.

By Sunday night, 11 PM, you should be able to answer "YES" to every checkbox above.

If you can't, identify what's broken and fix it before Monday. If you can't fix it by Monday morning, escalate to your tech lead and sales manager immediately. Don't walk into a presentation with a known issue.

**You're prepared. You're confident. You're going to crush it. 🎯**

---

**Sunday, August 10, 2026**  
**Time check: 11 PM?** ✓ All items complete, ready for Monday morning.
