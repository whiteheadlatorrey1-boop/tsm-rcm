# L1 Ticket Copilot — Demo Narrative

Real button-by-button navigation through the L1 platform, covering all four main apps in `html/l1-copilot/`. Every click, selector, and screen referenced below is verified against the live app — nothing here is invented.

**Stops:** Enterprise Command Center → L1 Ticket Copilot → VMware Copilot → Topology

---

## Stop 1 — Enterprise Command Center

**URL:** `/html/l1-copilot/enterprise-command-center.html`

1. Load the page. This is the hub — call out that it links out to Ticket Copilot, VMware Copilot, and NOC Command from here.
2. Click the **assistant bubble** in the bottom-right corner (chat icon, `#l1a-fab`). The panel opens — this is the same AI assistant now embedded across all four L1 apps, talking to a real backend (`/api/l1-copilot/assistant`), not a canned response.
3. Close the panel and move to Stop 2.

*Talking point: "Every page in this platform has the same assistant one click away — you're never more than a chat bubble from help, no matter which tool you're in."*

---

## Stop 2 — L1 Ticket Copilot

**URL:** `/html/l1-copilot/l1-ticket-copilot.html`

1. Load the page — the **Ticket** tab is active by default.
2. Enter an incident number in the ticket field (`#tkIncident`) — e.g. `INC0099887`.
3. Click the **VMware SME** item in the left sidebar (`data-section="vmware"`). This switches to the VMware troubleshooting section — the Component/Category/Environment dropdowns here (vCenter, vRA, vRO, Cloud Director, NSX, Terraform/IaC / Provisioning Failure, Blueprint Failure, etc.) are the same fields VMware Copilot will pick up in the next step.
4. Click **"OPEN FULL VMWARE OPERATIONS MODULE →"** (`#btnOpenVmwModule`).

*Talking point: "That click just fired a real relay write — the ticket ID, component, category, and environment currently on screen get handed off to VMware Copilot behind the scenes. Nothing here is a canned demo payload."*

---

## Stop 3 — VMware Copilot

**URL:** `/html/l1-copilot/vmware-copilot.html`

1. Navigate to VMware Copilot (or follow the tab the previous click opened).
2. Point out the **context banner** (`#ctxBanner`) at the top: it shows the ticket ID and summary carried over from Ticket Copilot.
3. Point out that the **Component**, **Issue Category**, and **Environment** dropdowns are already pre-filled — populated from the same relay write, not re-entered by hand.

*Talking point: "This is the same relay pipeline the platform uses everywhere — write once on one page, read on the next. No copy-pasting ticket details between tools."*

---

## Stop 4 — Topology (Digital Twin)

**URL:** `/html/l1-copilot/topology.html`

1. Load the page — the live digital twin view.
2. Click the **assistant bubble** (`#l1a-fab`) again to show it's present here too — the same widget, same backend, now on every page in the folder.

*Talking point: "Whether you're deep in a ticket or just looking at the topology map, the assistant is right there. That consistency was the last piece we closed out."*

---

## What changed in this pass

- **VMware Copilot relay bug fixed:** the context banner and pre-filled dropdowns in Stop 3 didn't work before — a relay domain was missing from the registry, and a follow-on test used a component/category that didn't exist in either page's dropdowns. Both are fixed; the hop is real end to end now.
- **Assistant widget rollout:** Command Center and Topology didn't have the assistant bubble before this pass — Ticket Copilot and VMware Copilot did. All four pages are consistent now.

## Supporting materials

- Automated coverage: `tests/playwright/l1-platform-workflows.spec.js` (reachability, nav-links, and relay round-trips for all four pages)
- Screenshot-driven video of this exact walkthrough: `tests/e2e/demo/screenshots/l1-platform-demo.mp4`
