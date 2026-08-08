import re

file_path = "html/war-rooms/re-war/re-strategist.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's inspect or inject sanitization in tsmWriteRelay or storage mechanisms within re-strategist.html
target_pattern = r"(function\s+tsmWriteRelay\s*\([^)]*\)\s*\{)([^}]*)\}"

def replacement(match):
    header = match.group(1)
    body = match.group(2)
    sanitized_code = """
    if (arguments[0] && typeof arguments[0] === 'object') {
        if (arguments[0].docText) {
            arguments[0].docTextPreview = arguments[0].docText.substring(0, 100) + '... [SANITIZED]';
            delete arguments[0].docText;
        }
    }
    """
    return f"{header}{sanitized_code}{body}}}"

new_content, count = re.subn(target_pattern, replacement, content)

if count > 0:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print(f"[+] Successfully patched tsmWriteRelay in {file_path}.")
else:
    print("[-] tsmWriteRelay not found, injecting robust session/local storage sanitizer.")
    global_patch = """
    <script>
    // TSM SECURE STRATEGIST SANITIZER
    (function() {
        const originalSetItem = sessionStorage.setItem;
        sessionStorage.setItem = function(key, value) {
            if (key === 'TSM_RE_WAR_RELAY' || key.includes('RELAY')) {
                try {
                    let data = JSON.parse(value);
                    if (data.docText) {
                        data.docTextPreview = data.docText.substring(0, 100) + '... [SANITIZED]';
                        delete data.docText;
                        value = JSON.stringify(data);
                    }
                } catch(e) {}
            }
            return originalSetItem.call(this, key, value);
        };
    })();
    </script>
    """
    with open(file_path, "r+", encoding="utf-8") as f:
        html = f.read()
        f.seek(0)
        f.write(html.replace("<head>", "<head>" + global_patch))
    print("[+] Injected storage override sanitizer into re-strategist.html.")
