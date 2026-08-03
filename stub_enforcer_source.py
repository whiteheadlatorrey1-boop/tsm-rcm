import os

# Find and stub tsm-enforcer.js across the workspace
target_filename = "tsm-enforcer.js"

for root, dirs, files in os.walk("."):
    if target_filename in files:
        file_path = os.path.join(root, target_filename)
        print(f"Stubbing: {file_path}")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("""// TSM Enforcer Disabled
window.TSMEnforcer = { init: function(){}, checkHealth: function(){}, enforce: function(){} };
window.tsmEnforcer = window.TSMEnforcer;
console.log('TSM Enforcer neutralized at source.');
""")

print("Source file stubbing complete.")