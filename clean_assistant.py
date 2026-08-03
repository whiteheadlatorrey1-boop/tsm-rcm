import re

files = [
    "html/war-rooms/re-war/re-war-room.html",
    "html/war-rooms/re-war/re-strategist.html",
    "html/war-rooms/re-war/re-exec-portal.html"
]

# CSS killswitch rule to prevent runtime initialization or rendering
KILLSWITCH_CSS = "\n/* Permanent killswitch for AI Chat Assistant overlay */\n#tsm-mission-guide-panel, .assistant-launcher, .chat-widget-container { display: none !important; visibility: hidden !important; pointer-events: none !important; }\n"

for path in files:
    try:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()

        # 1. Remove the inline style tag that was suppressing it if modified
        content = re.sub(r'<style>\s*#tsm-mission-guide-panel\s*\{\s*display:\s*none\s*!important;\s*\}\s*</style>', '', content)

        # 2. Inject explicit CSS killswitch into <head>
        if "/* Permanent killswitch for AI Chat Assistant overlay */" not in content:
            content = content.replace("</head>", f"{KILLSWITCH_CSS}</head>", 1)

        # 3. Strip any static DOM elements for the assistant panel if present
        content = re.sub(r'<div[^>]*id=["\']tsm-mission-guide-panel["\'][\s\S]*?</div>\s*</div>', '', content, flags=re.IGNORECASE)

        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

        print(f"✅ Applied assistant removal & killswitch to: {path}")
    except Exception as e:
        print(f"❌ Error processing {path}: {e}")