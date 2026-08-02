import re

file_path = "html/war-rooms/re-war/re-war-room.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Target the exact relay writing or docText injection block to sanitize before storage
# Let's add a robust sanitization helper right inside session storage handlers
target_pattern = r"(function\s+tsmWriteRelay\s*\([^)]*\)\s*\{)([^}]*)\}"

def replacement(match):
    header = match.group(1)
    body = match.group(2)
    sanitized_code = """
    if (arguments[0] && typeof arguments[0] === 'object') {
        if (arguments[0].docText) {
            arguments[0].docTextPreview = arguments[0].docText.substring(0, 100) + '... [TRUNCATED]';
            delete arguments[0].docText;
        }
    }
    """
    return f"{header}{sanitized_code}{body}}}"

new_content, count = re.subn(target_pattern, replacement, content)

if count > 0:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[+] Successfully patched tsmWriteRelay in {file_path} ({count} occurrences).")
else:
    print("[-] Pattern not found, appending global relay sanitizer script instead.")
    global_patch = """
    <script>
    // TSM SECURE RELAY SANITIZER
    window.addEventListener('storage', function(e) {
        if (e.key === 'TSM_RE_WAR_RELAY' && e.newValue) {
            try {
                let data = JSON.parse(e.newValue);
                if (data.docText) {
                    data.docTextPreview = data.docText.substring(0, 100) + '... [SANITIZED]';
                    delete data.docText;
                    sessionStorage.setItem('TSM_RE_WAR_RELAY', JSON.stringify(data));
                }
            } catch(err) {}
        }
    });
    </script>
    """
    with open(file_path, "r+", encoding="utf-8") as f:
        html = f.read()
        f.seek(0)
        f.write(html.replace("</head>", global_patch + "</head>"))
    print("[+] Injected global relay sanitizer into <head>.")
