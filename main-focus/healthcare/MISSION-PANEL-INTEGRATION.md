# Integrating Mission Panel into Your HC App

## What this replaces
The static "HC DEPARTMENT CHECKLIST" right panel becomes an interactive
Mission Control with live risk tracking, objective execution, and AI strategist responses.

## Step 1 — Add the script to your HTML
In your `crc-hc-practice.html` (or `index.html`), before the closing `</body>`:

```html
<script src="/healthcare/mission-panel.js"></script>
```

## Step 2 — Replace the right panel container
Find the div that holds your current static checklist. It likely has a class or id
like `right-panel`, `billing-panel`, or `checklist-container`.

Replace its contents with just an empty div:

```html
<div id="mission-panel-container" style="height:100%;"></div>
```

## Step 3 — Initialize the panel
Add this after the script tag:

```html
<script>
  // Initialize with the billing mission by default
  const panel = MissionPanel.init('mission-panel-container', 'billing');

  // Switch missions when the user clicks a domain tab
  document.querySelectorAll('[data-domain]').forEach(tab => {
    tab.addEventListener('click', () => {
      panel.setMission(tab.dataset.domain);
    });
  });
</script>
```

## Step 4 — Wire objectives to your actual HC nodes
Each objective has an `action` function inside `mission-panel.js`.
Find the `MISSIONS` object and update each `action` to match your actual node routing.

Example — if your HC nodes open via tab click:
```javascript
action: () => openNode("billing-queue", { view: "claims", filter: "incomplete" })
```

The `openNode` function tries 3 things in order:
1. Clicks `[data-node="billing-queue"]` if it exists in the DOM
2. Clicks `[data-tab="billing-queue"]` if it exists
3. Fires a custom event `tsm:openNode` that you can listen to

So add `data-node="billing-queue"` to your existing tab/button elements
and the routing happens automatically with zero extra code.

## Step 5 — Listen for mission completion
```javascript
document.addEventListener('tsm:missionComplete', (e) => {
  console.log('Mission done:', e.detail.mission.title);
  // Update your app state, show next mission, etc.
});
```

## Available missions
- `billing` — Billing / Claims workflow
- `denials` — Denial resolution workflow
- `coding` — Clean claim coding workflow

## Adding a new mission
Add an entry to the `MISSIONS` object in `mission-panel.js`:

```javascript
insurance: {
  title: "Resolve reserve discrepancy before quarterly close",
  domain: "INSURANCE / RESERVES",
  objectives: [
    { id: 0, label: "Pull reserve report", node: "reserves", domain: "insurance",
      riskDelta: -15, strat: "Reserve variance: $24,000. Investigation required.",
      workflow: 0, action: () => openNode("reserves") }
  ]
}
```

That's it — no other changes needed.