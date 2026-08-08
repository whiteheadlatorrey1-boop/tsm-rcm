#!/usr/bin/env python3
import os
import re

# Expected configuration keys in js/tsm-guide-engine.js
EXPECTED_CONFIGS = [
    "re", "concierge", "legal", "construction", "healthcare", 
    "mortgage", "schools", "finops", "insurance", "noc", 
    "honeywell", "plant-incident", "cyber-incident", "supplier-shutdown"
]

# Keywords used to match target HTML files
VERTICAL_KEYWORDS = {
    "construction": ["construction", "build", "contractor"],
    "mortgage": ["mortgage", "lending", "loan", "underwriting", "trid", "servicing"],
    "legal": ["legal", "law", "attorney", "litigation"],
    "schools": ["school", "schools", "edu", "k12", "campus", "academic", "district"],
    "finops": ["finops", "finance", "accounting", "auditops", "treasury"],
    "healthcare": ["healthcare", "health", "clinical", "dpm", "medical", "hipaa", "patient"],
    "insurance": ["insurance", "underwriting-risk", "claims-policy", "carrier"],
    "concierge": ["concierge", "hotel", "hotelops", "hospitality"],
    "noc": ["noc", "network-ops", "infrastructure", "telemetry"],
    "honeywell": ["honeywell", "hw-ops", "bms-exec"],
    "plant-incident": ["plant-incident", "plant_incident", "factory-incident", "plant-ops"],
    "cyber-incident": ["cyber-incident", "cyber_incident", "secops", "data-breach", "soc"],
    "supplier-shutdown": ["supplier-shutdown", "supplier_shutdown", "supply-chain", "vendor-outage"]
}

def verify_js_file():
    js_path = os.path.join("js", "tsm-guide-engine.js")
    print("==================================================")
    print(" 1. AUDITING ENGINE SCRIPT: js/tsm-guide-engine.js")
    print("==================================================")
    if not os.path.exists(js_path):
        print("❌ FAIL: js/tsm-guide-engine.js does not exist!")
        return False

    with open(js_path, "r", encoding="utf-8") as f:
        js_content = f.read()

    missing_configs = []
    for cfg in EXPECTED_CONFIGS:
        # Check if key is declared in GUIDE_CONFIGS
        pattern = rf'"{cfg}"\s*:|{cfg}\s*:'
        if not re.search(pattern, js_content):
            missing_configs.append(cfg)

    if missing_configs:
        print(f"⚠️  MISSING CONFIGS IN JS: {missing_configs}")
    else:
        print("✅ SUCCESS: All 14 vertical configurations verified in js/tsm-guide-engine.js")
    print()

def verify_html_files():
    print("==================================================")
    print(" 2. AUDITING HTML FILE TAGS & SCRIPT INJECTIONS   ")
    print("==================================================")
    
    total_scanned = 0
    tagged_count = 0
    issues = []

    for root, dirs, files in os.walk("."):
        if "node_modules" in root or ".git" in root:
            continue
        for file in files:
            if file.endswith(".html"):
                total_scanned += 1
                full_path = os.path.join(root, file)
                path_lower = full_path.lower()

                # Check if this file belongs to one of our target verticals
                is_target = any(
                    any(kw in path_lower for kw in kw_list)
                    for kw_list in VERTICAL_KEYWORDS.values()
                )

                if is_target:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()

                    has_vert = 'data-vertical="' in content
                    has_role = 'data-page-role="' in content
                    has_script = 'tsm-guide-engine.js' in content

                    if has_vert and has_role and has_script:
                        tagged_count += 1
                    else:
                        missing = []
                        if not has_vert: missing.append("data-vertical")
                        if not has_role: missing.append("data-page-role")
                        if not has_script: missing.append("script tag")
                        issues.append((full_path, missing))

    print(f"Scanned {total_scanned} total HTML files.")
    print(f"Verified {tagged_count} target HTML files fully configured.")

    if issues:
        print(f"\n⚠️  {len(issues)} Target File(s) missing required attributes:")
        for path, missing in issues:
            print(f"  - {path} -> Missing: {', '.join(missing)}")
    else:
        print("✅ SUCCESS: All target HTML files are properly tagged and script-injected!")
    print("==================================================")

if __name__ == "__main__":
    verify_js_file()
    verify_html_files()