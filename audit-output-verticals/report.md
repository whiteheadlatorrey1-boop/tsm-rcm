# Vertical Audit Report

Generated: 2026-08-25T22:59:02.405Z
Base URL: http://localhost:8080
**Total issue groups: 51**

Generated: 2026-08-25T22:59:02.405Z
Base URL: http://localhost:8080

## Healthcare

### war-room — `/healthcare/hc-denial-war-room.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**5 failed request(s):**
  - `http://localhost:8080/favicon.ico` — HTTP 404
  - `http://localhost:8080/html/healthcare/hc-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/healthcare/executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/bpo-war/bpo-executive-portal.html?vertical=healthcare` — net::ERR_ABORTED
  - `http://localhost:8080/html/enterprise/enterprise-executive-portal.html?vertical=healthcare` — net::ERR_ABORTED

### strategist — `/healthcare/hc-main-strategist.html`

**2 failed request(s):**
  - `http://localhost:8080/html/healthcare/hc-denial-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/healthcare/executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/healthcare/executive-portal.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**1 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=healthcare` — HTTP 401

## Construction

### war-room — `/war-rooms/construct-war/construction-war-room.html`

**3 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**10 failed request(s):**
  - `http://localhost:8080/html/war-rooms/construct-war/construction-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/construct-war/construction-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-hub.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/construction-hub.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/auditops-tax.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/auditops-tax.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/permits-proposals.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/permits-proposals.html` — net::ERR_ABORTED

**3 broken link(s):**
  - `construction-hub.html` → status 404
  - `auditops-tax.html` → status 404
  - `permits-proposals.html` → status 404

### strategist — `/war-rooms/construct-war/construction-strategist.html`

**2 failed request(s):**
  - `http://localhost:8080/war-rooms/construct-war/construction-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/construct-war/construction-executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/war-rooms/construct-war/construction-executive-portal.html`

**4 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**11 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=construction` — HTTP 401
  - `http://localhost:8080/html/war-rooms/construct-war/construction-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/construct-war/construction-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-hub.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/construction-hub.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/construction-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/auditops-tax.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/auditops-tax.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/construct-war/compliance.html` — HTTP 404
  - `http://localhost:8080/war-rooms/construct-war/compliance.html` — net::ERR_ABORTED

**3 broken link(s):**
  - `construction-hub.html` → status 404
  - `auditops-tax.html` → status 404
  - `compliance.html` → status 404

## FinOps

### war-room — `/finops-suite/finops-war/finops-war-room.html`

**3 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**10 failed request(s):**
  - `http://localhost:8080/html/finops-suite/finops-war/finops-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/finops-suite/finops-war/finops-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/doc-analysis-tab.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/doc-analysis-tab.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-accounting.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/finops-accounting.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-operations.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/finops-operations.html` — net::ERR_ABORTED

**3 broken link(s):**
  - `doc-analysis-tab.html` → status 404
  - `finops-accounting.html` → status 404
  - `finops-operations.html` → status 404

### strategist — `/finops-suite/finops-war/finops-main-strategist.html`

**4 failed request(s):**
  - `http://localhost:8080/finops-suite/finops-war/finops-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/finops-suite/finops-war/finops-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/finops-suite/finops-war/finops-executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/finops-suite/finops-war/finops-executive-portal.html`

**4 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**11 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=finops` — HTTP 401
  - `http://localhost:8080/html/finops-suite/finops-war/finops-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/finops-suite/finops-war/finops-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/doc-analysis-tab.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/doc-analysis-tab.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-accounting.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/finops-accounting.html` — net::ERR_ABORTED
  - `http://localhost:8080/finops-suite/finops-war/finops-operations.html` — HTTP 404
  - `http://localhost:8080/finops-suite/finops-war/finops-operations.html` — net::ERR_ABORTED

**3 broken link(s):**
  - `doc-analysis-tab.html` → status 404
  - `finops-accounting.html` → status 404
  - `finops-operations.html` → status 404

## Insurance

### war-room — `/war-rooms/insure-war/insurance-war-room.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**8 failed request(s):**
  - `http://localhost:8080/html/war-rooms/insure-war/insurance-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/insure-war/insurance-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/insurance-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/insurance-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — HTTP 404
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — net::ERR_ABORTED
  - `http://localhost:8080/tsm-insurance/pc-command.html` — net::ERR_ABORTED
  - `http://localhost:8080/tsm-insurance/dme.html` — net::ERR_ABORTED

**1 broken link(s):**
  - `ins-hub.html` → status 404

### strategist — `/war-rooms/insure-war/insurance-strategist.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**4 failed request(s):**
  - `http://localhost:8080/war-rooms/insure-war/insurance-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/insurance-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — HTTP 404
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — net::ERR_ABORTED

**1 broken link(s):**
  - `ins-hub.html` → status 404

### executive-portal — `/war-rooms/insure-war/insurance-executive-portal.html`

**2 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**7 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=insurance` — HTTP 401
  - `http://localhost:8080/html/war-rooms/insure-war/insurance-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/insure-war/insurance-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/insurance-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/insurance-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — HTTP 404
  - `http://localhost:8080/war-rooms/insure-war/ins-hub.html` — net::ERR_ABORTED

**1 broken link(s):**
  - `ins-hub.html` → status 404

## Legal

### war-room — `/war-rooms/legal-war/legal-war-room.html`

**2 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**9 failed request(s):**
  - `http://localhost:8080/html/legal-pro/case-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-nodes.html` — HTTP 404
  - `http://localhost:8080/war-rooms/legal-war/legal-nodes.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/case-strategist.html` — HTTP 404
  - `http://localhost:8080/war-rooms/legal-war/case-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-main-strategist.html` — net::ERR_ABORTED

**2 broken link(s):**
  - `legal-nodes.html` → status 404
  - `case-strategist.html` → status 404

### case-strategist — `/legal-pro/case-strategist.html`

**6 console error(s):**
  - `[TSM-KERNEL] EventBus not found. Load core first.`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**12 failed request(s):**
  - `http://localhost:8080/legal-pro/index.html` — net::ERR_ABORTED
  - `http://localhost:8080/legal-pro/nodes/matter.html` — HTTP 404
  - `http://localhost:8080/legal-pro/nodes/matter.html` — net::ERR_ABORTED
  - `http://localhost:8080/legal-pro/nodes/billing.html` — HTTP 404
  - `http://localhost:8080/legal-pro/nodes/billing.html` — net::ERR_ABORTED
  - `http://localhost:8080/legal-pro/nodes/compliance.html` — HTTP 404
  - `http://localhost:8080/legal-pro/nodes/compliance.html` — net::ERR_ABORTED
  - `http://localhost:8080/legal-pro/nodes/contracts.html` — HTTP 404
  - `http://localhost:8080/legal-pro/nodes/contracts.html` — net::ERR_ABORTED
  - `http://localhost:8080/legal-pro/strategist.html` — HTTP 404
  - `http://localhost:8080/legal-pro/strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-executive-portal.html` — net::ERR_ABORTED

**5 broken link(s):**
  - `/legal-pro/nodes/matter.html` → status 404
  - `/legal-pro/nodes/billing.html` → status 404
  - `/legal-pro/nodes/compliance.html` → status 404
  - `/legal-pro/nodes/contracts.html` → status 404
  - `/legal-pro/strategist.html` → status 404

### chief-strategist — `/war-rooms/legal-war/legal-main-strategist.html`

**6 failed request(s):**
  - `http://localhost:8080/war-rooms/legal-war/legal-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/legal-pro/index.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/war-rooms/legal-war/legal-executive-portal.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**7 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=legal` — HTTP 401
  - `http://localhost:8080/war-rooms/legal-war/legal-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/legal-pro/index.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-main-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/legal-war/legal-executive-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/legal-war/legal-main-strategist.html` — net::ERR_ABORTED

## Real Estate

### war-room — `/war-rooms/re-war/re-war-room.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 404 (Not Found)`

**6 failed request(s):**
  - `http://localhost:8080/html/war-rooms/re-war/re-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/re-war/re-exec-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/re-war/re-guide.html` — HTTP 404
  - `http://localhost:8080/war-rooms/re-war/re-guide.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/re-war/re-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/re-war/re-exec-portal.html` — net::ERR_ABORTED

**1 broken link(s):**
  - `re-guide.html` → status 404

### strategist — `/war-rooms/re-war/re-strategist.html`

**3 failed request(s):**
  - `http://localhost:8080/html/war-rooms/re-war/re-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/re-war/re-exec-portal.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/re-war/re-war-room.html` — net::ERR_ABORTED

### executive-portal — `/war-rooms/re-war/re-exec-portal.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**1 uncaught page error(s):**
  - `DOMException: SyntaxError: Failed to execute 'querySelectorAll' on 'Document': The provided selector is empty.
http://localhost:8080/war-rooms/re-war/re-exec-portal.html:159:16`

**4 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=re` — HTTP 401
  - `http://localhost:8080/html/war-rooms/re-war/re-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/war-rooms/re-war/re-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/html/doc1-search.html` — net::ERR_ABORTED

## Mortgage

### war-room — `/war-rooms/mortgage/mortgage-war-room.html`

✅ Clean

### strategist — `/war-rooms/mortgage/mortgage-strategist.html`

**2 failed request(s):**
  - `http://localhost:8080/war-rooms/mortgage/mortgage-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/mortgage/mortgage-executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/war-rooms/mortgage/mortgage-executive-portal.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**3 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=mortgage` — HTTP 401
  - `http://localhost:8080/war-rooms/mortgage/mortgage-war-room.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/mortgage/mortgage-strategist.html` — net::ERR_ABORTED

## Schools

### war-room — `/war-rooms/schools-command/schools-command.html`

**2 failed request(s):**
  - `http://localhost:8080/war-rooms/schools-command/schools-strategist.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/schools-command/schools-executive-portal.html` — net::ERR_ABORTED

### strategist — `/war-rooms/schools-command/schools-strategist.html`

**2 failed request(s):**
  - `http://localhost:8080/war-rooms/schools-command/schools-command.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/schools-command/schools-executive-portal.html` — net::ERR_ABORTED

### executive-portal — `/war-rooms/schools-command/schools-executive-portal.html`

**1 console error(s):**
  - `Failed to load resource: the server responded with a status of 401 (Unauthorized)`

**3 failed request(s):**
  - `http://localhost:8080/api/bpo/cases?vertical=schools` — HTTP 401
  - `http://localhost:8080/war-rooms/schools-command/schools-command.html` — net::ERR_ABORTED
  - `http://localhost:8080/war-rooms/schools-command/schools-strategist.html` — net::ERR_ABORTED

