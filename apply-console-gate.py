#!/usr/bin/env python3
import pathlib

path = pathlib.Path("cloudflare/entitlement-gate/worker.js")
text = path.read_text()

anchor_1 = 'const FULL_ACCESS_KEYS = [\n  "hw","fo","ins","con","bpo","logistics","vendor","hotel","re",\n  "mortgage","schools","leg","hc","o2c","crm","approval","cpq",\n  "catalog","mdm","governance",\n];'
assert text.count(anchor_1) == 1, "FULL_ACCESS_KEYS anchor not found/not unique"
text = text.replace(anchor_1, anchor_1.replace('"governance",\n];', '"governance","democonsole",\n];'), 1)

anchor_2 = 'const VERTICAL_PATHS = {\n  hw:     ["/html/plant-incident.html", "/html/supplier-shutdown.html", "/html/cyber-incident.html"],'
assert text.count(anchor_2) == 1, "VERTICAL_PATHS anchor not found/not unique"
text = text.replace(anchor_2, 'const VERTICAL_PATHS = {\n  democonsole: ["/html/demo/"],\n  hw:     ["/html/plant-incident.html", "/html/supplier-shutdown.html", "/html/cyber-incident.html"],', 1)

path.write_text(text)
print("OK: worker.js patched.")
