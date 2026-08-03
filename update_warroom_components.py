import os
import re

files = [
    "html/war-rooms/re-war/re-war-room.html",
    "html/war-rooms/re-war/re-strategist.html",
    "html/war-rooms/re-war/re-exec-portal.html"
]

def clean_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Hide/remove the mission guide panel style overrides if present
    content = re.sub(r'<style>#tsm-mission-guide-panel\s*{\s*display:\s*none\s*!important;\s*}</style>', '', content)

    # 2. Strip AI Chat Assistant elements (launcher, assistant container, related scripts)
    # Target common IDs and classes associated with the assistant overlay
    content = re.sub(r'<!--\s*───\s*ASSISTANT OVERLAY[\s\S]*?-->', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<div[^>]*id=["\'](?:tsm-mission-guide-panel|aiAssistant|reAssistant|assistantContainer|chatAssistant)["\'][\s\S]*?</div>\s*</div>', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<div[^>]*class=["\'](?:assistant-launcher|chat-widget-launcher|bot-avatar-btn)["\'][\s\S]*?</div>', '', content, flags=re.IGNORECASE)
    content = re.sub(r'<img[^>]*class=["\']bot-avatar["\'][^>]*>', '', content, flags=re.IGNORECASE)

    # 3. Ensure guide-widget stylesheet is clean and intact
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Cleaned assistant elements from: {filepath}")

for f in files:
    clean_file(f)