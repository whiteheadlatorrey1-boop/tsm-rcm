path = "server.js"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

changed = False

# Add fs import near top if not already present (most servers already require fs, but check)
if "const fs = require('fs');" not in content and 'require("fs")' not in content:
    content = "const fs = require('fs');\n" + content
    changed = True
    print("OK: added fs import at top")
else:
    print("SKIP: fs already required")

# Add a debugLog helper right before fetchGroqWithRetry
old = "async function fetchGroqWithRetry(groqKey, body, maxRetries = 3) {"

helper = '''function debugLog(msg) {
  try {
    fs.appendFileSync('/app/data/debug.log', `[${new Date().toISOString()}] ${msg}\\n`);
  } catch (e) { /* ignore logging failures */ }
}

async function fetchGroqWithRetry(groqKey, body, maxRetries = 3) {'''

if "function debugLog(" in content:
    print("SKIP: debugLog helper already present")
elif old in content:
    content = content.replace(old, helper, 1)
    changed = True
    print("OK: added debugLog helper")
else:
    print("FAIL: could not find fetchGroqWithRetry anchor")

# Replace console.error calls inside fetchGroqWithRetry with debugLog + console.error (belt and suspenders)
old_err1 = "console.error('Groq error response:', JSON.stringify(err));"
new_err1 = "console.error('Groq error response:', JSON.stringify(err)); debugLog('Groq error: ' + JSON.stringify(err));"
if new_err1 in content:
    print("SKIP: error log already instrumented")
elif old_err1 in content:
    content = content.replace(old_err1, new_err1, 1)
    changed = True
    print("OK: instrumented Groq error log")
else:
    print("WARN: Groq error log line not found")

old_err2 = "console.error(`Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`);"
new_err2 = "console.error(`Rate limited, retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`); debugLog(`Retrying in ${waitMs}ms attempt ${attempt + 1}/${maxRetries}`);"
if new_err2 in content:
    print("SKIP: retry log already instrumented")
elif old_err2 in content:
    content = content.replace(old_err2, new_err2, 1)
    changed = True
    print("OK: instrumented retry log")
else:
    print("WARN: retry log line not found")

if changed:
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("\\nFile written.")
else:
    print("\\nNo changes written.")
