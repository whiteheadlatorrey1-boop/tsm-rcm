#!/usr/bin/env python3
"""
Closes real intake→war-room routing dead-ends found while auditing
tsm-doc-search-multi.html's WAR_ROOM_ROUTES table:

1. tsm-doc-search-multi.html: 'fin'/'leg' relay-key aliases never matched
   what finops-war-room.html / legal-war-room.html actually read
   ('fo'/'legal'). Renamed everywhere (3 + 4 occurrences).
2. finops-war-room.html + legal-war-room.html: their ingestion code also
   checked relay.summary, but the payload intake actually writes only has
   .docText (confirmed against TSMExtraction.buildRelayPayload and against
   construction-war-room.html, a working reference implementation that
   already checks `relay.docText || relay.summary || ''`). Same fix applied.
3. plant-incident.html, supplier-shutdown.html, cyber-incident.html: these
   3 Honeywell scenario pages were registered in WAR_ROOM_ROUTES but had
   ZERO ingestion code — routed documents silently vanished. Added real
   ingestion (each page takes free-text paste into #docInput and exposes
   fireAllEngines(), same shape as the working Construction pattern),
   gated by the existing tsm_auto_mode toggle.

Run from repo root: python3 apply_fix_relay_wiring.py
"""

INTAKE = "html/tsm-doc-search-multi.html"
FINOPS = "html/finops-suite/finops-war-room.html"
LEGAL = "html/legal-pro/legal-war-room.html"
PLANT = "html/plant-incident.html"
SUPPLIER = "html/supplier-shutdown.html"
CYBER = "html/cyber-incident.html"


def patch_intake():
    with open(INTAKE, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    fin_count = s.count("tsm_fin_docsearch_relay")
    leg_count = s.count("tsm_leg_docsearch_relay")
    assert fin_count == 3, f"expected 3 tsm_fin_docsearch_relay occurrences, found {fin_count}"
    assert leg_count == 4, f"expected 4 tsm_leg_docsearch_relay occurrences, found {leg_count}"

    s = s.replace("tsm_fin_docsearch_relay", "tsm_fo_docsearch_relay")
    s = s.replace("tsm_leg_docsearch_relay", "tsm_legal_docsearch_relay")

    assert s != orig
    with open(INTAKE, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {INTAKE} ({fin_count} fin + {leg_count} leg key refs renamed)")


def patch_finops():
    with open(FINOPS, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    old = """    const raw = localStorage.getItem('tsm_fo_docsearch_relay');
    if (!raw) return;
    const relay = JSON.parse(raw);
    if (!relay.summary) return;
    localStorage.removeItem('tsm_fo_docsearch_relay');
    const ta = document.getElementById('docPaste');
    if (ta) {
      ta.value = relay.summary;"""
    assert s.count(old) == 1, f"finops ingestion block: found {s.count(old)} matches"
    new = """    const raw = localStorage.getItem('tsm_fo_docsearch_relay');
    if (!raw) return;
    const relay = JSON.parse(raw);
    const relayText = relay.docText || relay.summary || '';
    if (!relayText) return;
    localStorage.removeItem('tsm_fo_docsearch_relay');
    const ta = document.getElementById('docPaste');
    if (ta) {
      ta.value = relayText;"""
    s = s.replace(old, new)

    assert s != orig
    with open(FINOPS, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {FINOPS}")


def patch_legal():
    with open(LEGAL, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    old = """    const raw = localStorage.getItem('tsm_legal_docsearch_relay');
    if (!raw) return;
    const relay = JSON.parse(raw);
    if (!relay.summary && !relay.doc) return;
    localStorage.removeItem('tsm_legal_docsearch_relay');
    const summary = relay.summary || (relay.doc ? JSON.stringify(relay.doc).slice(0,800) : '');"""
    assert s.count(old) == 1, f"legal ingestion block: found {s.count(old)} matches"
    new = """    const raw = localStorage.getItem('tsm_legal_docsearch_relay');
    if (!raw) return;
    const relay = JSON.parse(raw);
    const summary = relay.docText || relay.summary || (relay.doc ? JSON.stringify(relay.doc).slice(0,800) : '');
    if (!summary) return;
    localStorage.removeItem('tsm_legal_docsearch_relay');"""
    s = s.replace(old, new)

    assert s != orig
    with open(LEGAL, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {LEGAL}")


def add_honeywell_ingestion(path, relay_key, incident_label):
    with open(path, "r", encoding="utf-8") as f:
        s = f.read()
    orig = s

    assert s.count("</script>\n</body>\n</html>") == 1, \
        f"{path}: expected exactly 1 closing </script></body></html>, found {s.count('</script>\\n</body>\\n</html>')}"

    ingestion = f"""
// Doc Search relay — populate from redispatch (added: was registered in
// tsm-doc-search-multi.html's WAR_ROOM_ROUTES but this page never read it)
(function(){{
  try {{
    const raw = localStorage.getItem('{relay_key}');
    if (!raw) return;
    const relay = JSON.parse(raw);
    const relayText = relay.docText || relay.summary || '';
    if (!relayText) return;
    localStorage.removeItem('{relay_key}');
    const ta = document.getElementById('docInput');
    if (ta) {{
      ta.value = relayText;
      if (localStorage.getItem('tsm_auto_mode') !== 'off') {{
        setTimeout(() => {{ if (typeof fireAllEngines === 'function') fireAllEngines(); }}, 800);
      }}
    }}
  }} catch(e) {{ console.warn('[TSM {incident_label} AutoFire]', e); }}
}})();
</script>
</body>
</html>"""

    s = s.replace("</script>\n</body>\n</html>", ingestion)
    assert s != orig
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print(f"Patched {path} (added ingestion for {relay_key})")


if __name__ == "__main__":
    patch_intake()
    patch_finops()
    patch_legal()
    add_honeywell_ingestion(PLANT, "tsm_hw_plant_docsearch_relay", "Plant Incident")
    add_honeywell_ingestion(SUPPLIER, "tsm_hw_supplier_docsearch_relay", "Supplier Shutdown")
    add_honeywell_ingestion(CYBER, "tsm_hw_cyber_docsearch_relay", "Cyber Incident")
    print("Done.")