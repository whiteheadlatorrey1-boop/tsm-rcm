#!/usr/bin/env python3
import pathlib

path = pathlib.Path("html/demo-launcher.html")
text = path.read_text()

anchor_1 = "    --accent: #00d4ff;\n"
assert text.count(anchor_1) == 1, "accent var anchor not found/not unique"
text = text.replace(anchor_1, "    --accent: #00d4ff;\n    --accent-dim: rgba(0,212,255,0.12);\n", 1)

anchor_2 = "  .s-mus .suite-name { color: var(--mus); opacity: 0.7; }\n"
assert text.count(anchor_2) == 1, "s-mus theming anchor not found/not unique"
text = text.replace(anchor_2, anchor_2 + """
  .s-live .card::before { background: var(--accent); }
  .s-live .card:hover { background: var(--accent-dim); border-color: rgba(0,212,255,0.3); }
  .s-live .card-type { color: var(--accent); }
  .s-live .suite-dot { background: var(--accent); }
  .s-live .suite-name { color: var(--accent); opacity: 0.7; }
""", 1)

anchor_3 = "  .suite:nth-child(5) { animation-delay: 0.25s; }\n"
assert text.count(anchor_3) == 1, "nth-child(5) anchor not found/not unique"
text = text.replace(anchor_3, anchor_3 + "  .suite:nth-child(6) { animation-delay: 0.3s; }\n", 1)

anchor_4 = "  <!-- HEALTHCARE -->\n"
assert text.count(anchor_4) == 1, "Healthcare suite anchor not found/not unique"
addition_4 = """  <!-- LIVE DEMOS -->
  <div class="suite s-live">
    <div class="suite-label">
      <div class="suite-dot"></div>
      <span class="suite-name">Live Demos</span>
      <div class="suite-line"></div>
    </div>
    <div class="cards">
      <a class="card" href="/html/demo/tsm-demo-console.html" target="_blank">
        <div class="card-type">interactive walkthrough</div>
        <div class="card-title">Multi-Vertical Relay Console <span class="badge-new">fresh</span></div>
        <div class="card-desc">One relay chain, five industries — recorded live walkthroughs of Real Estate, HotelOps, Healthcare RCM, L1 Support, and the RE relay-chain deep-dive, with synced narrative and step navigation.</div>
        <div class="card-arrow">↗</div>
      </a>
    </div>
  </div>

""" + anchor_4
text = text.replace(anchor_4, addition_4, 1)

path.write_text(text)
print("OK: html/demo-launcher.html patched.")
