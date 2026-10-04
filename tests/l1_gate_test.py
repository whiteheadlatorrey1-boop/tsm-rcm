import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

REPO = sys.argv[1] if len(sys.argv) > 1 else "."
PORT = 8765
URL = f"http://localhost:{PORT}/html/l1-copilot/l1-ticket-copilot.html"
DRAFT = "Problem: VPN drops\nCause: stale profile\nActions Taken: reset profile\nResolution: reconnected\nValidation: stable 10 min\nNext Steps: monitor"

results, posts, dialogs = [], [], []
mode = {"write": "ok"}


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))


def handler(route, request):
    url, method = request.url, request.method
    body = request.post_data or ""
    if "/servicenow/ticket/" in url:
        return route.fulfill(json={"ok": True, "ticket": {
            "number": "INC0000055", "requester": "Test User",
            "assignmentGroup": "Service Desk", "asset": "LT-1234",
            "description": "SERVER-DESC should not overwrite"}})
    if url.endswith("/api/l1-copilot/resolution") and method == "POST":
        payload = json.loads(body or "{}")
        if payload.get("writeToServicenow"):
            posts.append(payload)
            if mode["write"] == "fail":
                return route.fulfill(status=502, json={"ok": False, "error": "SN 502 boom"})
            return route.fulfill(json={"ok": True, "servicenow": {"attempted": True, "success": True}})
        return route.fulfill(json={"ok": True, "answer": DRAFT})
    return route.fulfill(json={"ok": True})


server = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT)], cwd=REPO,
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
        pg.route("**/api/**", handler)
        pg.goto(URL, wait_until="load")
        pg.wait_for_timeout(800)

        def tab(name):
            pg.click(f'.sb-item[data-section="{name}"]')
            pg.wait_for_timeout(200)

        sync, box = pg.locator("#btnSyncResolution"), pg.locator("#resolutionTechnicianConfirm")
        out = pg.locator("#resolutionOutput")

        check("1 write button disabled on load", sync.is_disabled())
        check("2 draft panel is not contenteditable", out.get_attribute("contenteditable") in (None, "false"))

        pg.fill("#tkIncident", "INC0000055")
        pg.fill("#tkDescription", "USER-TYPED description")
        pg.click("#btnSnPullByIncident")
        pg.wait_for_timeout(500)
        check("3 status shows Loaded INC0000055", "Loaded INC0000055" in pg.inner_text("#snPullOut"), pg.inner_text("#snPullOut"))
        check("4 requester auto-filled", pg.input_value("#tkRequester") == "Test User")
        check("5 existing description NOT overwritten", pg.input_value("#tkDescription") == "USER-TYPED description")

        tab("resolution")
        pg.click("#btnBuildResolution")
        pg.wait_for_function("document.getElementById('resolutionOutput').textContent.includes('VPN drops')", timeout=5000)
        check("6 draft rendered", "VPN drops" in out.inner_text())
        check("7 confirm box unchecked after generate", not box.is_checked())
        check("8 write button still disabled after generate", sync.is_disabled())

        box.check()
        check("9 checking box enables write button", sync.is_enabled())
        box.uncheck()
        check("10 unchecking box re-disables button", sync.is_disabled())

        box.check()
        pg.click("#btnBuildResolution")
        pg.wait_for_timeout(600)
        check("11 regenerate unchecks box", not box.is_checked())
        check("12 regenerate disables button", sync.is_disabled())

        box.check()
        tab("ticket"); pg.fill("#tkIncident", ""); tab("resolution")
        n = len(posts)
        sync.click()
        pg.wait_for_timeout(300)
        check("13 blank incident: alert shown", any("incident number" in d.lower() for d in dialogs), str(dialogs))
        check("14 blank incident: no POST sent", len(posts) == n)

        tab("ticket"); pg.fill("#tkIncident", "INC0000055"); tab("resolution")
        mode["write"] = "fail"
        sync.click()
        pg.wait_for_timeout(600)
        check("15 failed write shows error", "SN 502 boom" in pg.inner_text("#resolutionSyncOut"), pg.inner_text("#resolutionSyncOut"))
        check("16 failed write re-enables button", sync.is_enabled())

        mode["write"] = "ok"
        sync.click()
        pg.wait_for_timeout(600)
        check("17 success message shown", "work note written to INC0000055" in pg.inner_text("#resolutionSyncOut"), pg.inner_text("#resolutionSyncOut"))
        check("18 success unchecks box + disables button", (not box.is_checked()) and sync.is_disabled())
        last = posts[-1]
        check("19 payload draft == on-screen draft", last.get("draft", "").strip() == out.inner_text().strip())
        check("20 payload flags correct",
              last.get("incident") == "INC0000055" and last.get("technicianConfirmed") is True and last.get("writeToServicenow") is True)
        check("21 no page JS errors", not errs, "; ".join(errs)[:200])
        b.close()
finally:
    server.terminate()

failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
