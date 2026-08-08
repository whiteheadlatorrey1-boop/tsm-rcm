#!/usr/bin/env python3
"""
TSM safe search-and-replace utility.
Run from workspace root.
"""
import os
import sys

TARGET_FILES = [
    "html/healthcare/hc-billing.html",
    "html/healthcare/hc-anomaly-advisor.html",
    "html/healthcare/hc-nodes.html",
    "html/healthcare/hc-academy.html",
    "html/healthcare/healthcare-wip.html",
    "html/healthcare/hc-grants.html",
    "html/healthcare/hc-denial-war-room.html",
    "html/healthcare/hc-taxprep.html",
    "html/healthcare/hc-vendors.html"
]

# Add any exact strings you need to swap out here
REPLACEMENTS = {
    # Format: "OLD STRING": "NEW STRING"
    "toggleIntake(false);\n}": "  toggleIntake(false);\n}",
}

def apply_fixes():
    print("🚀 Running selective target synchronization script...\n")
    changes_made = 0
    
    for filepath in TARGET_FILES:
        if not os.path.exists(filepath):
            print(f"⚠️  Skipping (Not found): {filepath}")
            continue
            
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        updated_content = content
        file_changed = False
        
        for old_str, new_str in REPLACEMENTS.items():
            if old_str in updated_content:
                count = updated_content.count(old_str)
                updated_content = updated_content.replace(old_str, new_str)
                print(f"   ↳ Match found in {filepath} ({count} instances)")
                file_changed = True
                changes_made += 1
                
        if file_changed:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✅ UPDATED: {filepath}")
        else:
            print(f"👀 NO CHANGES REQUIRED: {filepath}")

    print(f"\n✨ Execution finished. Total files modified: {changes_made}")

if __name__ == "__main__":
    apply_fixes()