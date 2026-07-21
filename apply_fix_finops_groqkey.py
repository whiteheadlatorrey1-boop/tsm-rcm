diff --git a/html/finops-suite/finops-war-room.html b/html/finops-suite/finops-war-room.html
index 75926b71..379ec7cf 100644
--- a/html/finops-suite/finops-war-room.html
+++ b/html/finops-suite/finops-war-room.html
@@ -572,7 +572,6 @@ let selectedDocType = 'AP Aging';
 let engOut = {};
 let enginesComplete = 0;
 let groqKey = localStorage.getItem('tsm_groq_key') || '';
-if (groqKey) document.getElementById('groqKey').value = groqKey;
 let totalTokensIn = 0, totalTokensOut = 0;
 
 function trackTokens(promptText, responseText){
@@ -605,16 +604,13 @@ function setDocType(btn, type) {
 // ═══════════════════════════════════════════════════
 // KEY
 // ═══════════════════════════════════════════════════
-function saveKey() { groqKey = document.getElementById('groqKey').value.trim(); localStorage.setItem('tsm_groq_key', groqKey); }
 async function testKey() {
-  groqKey = document.getElementById('groqKey').value.trim();
-  if (!groqKey) { alert('Enter Groq API key first.'); return; }
-  addLog('Testing API key...', '', 'a');
+  addLog('Testing server proxy...', '', 'a');
   try {
-    const r = await fetch('/api/groq/validate-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: groqKey }) });
+    const r = await fetch('/api/groq/validate-key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
     const d = await r.json();
-    if (d.ok) addLog('API key valid', 'Groq connection confirmed', 'g');
-    else addLog('API key invalid', 'Check key and retry', 'f');
+    if (d.ok) addLog('Server proxy connected', 'Groq connection confirmed', 'g');
+    else addLog('Server proxy error', d.error || 'Check server GROQ_API_KEY', 'f');
   } catch(e) { addLog('Connection error', e.message, 'f'); }
 }
 
@@ -866,9 +862,7 @@ const FALLBACKS = [
 // ═══════════════════════════════════════════════════
 async function fireEngines() {
   docText = document.getElementById('docPaste').value.trim();
-  groqKey = document.getElementById('groqKey').value.trim();
   if (!docText) { alert('Paste or load a financial document first.'); return; }
-  if (!groqKey) { alert('Enter your Groq API key.'); return; }
 
   const cacheKey = 'TSM_FINOPS_CACHE_' + selectedDocType + '_' + docText.length + '_' + docText.slice(0,80);
   try {
diff --git a/server.js b/server.js
index 268a2b9c..43d4380e 100644
--- a/server.js
+++ b/server.js
@@ -417,10 +417,11 @@ async function fetchGroqWithRetry(groqKey, body, maxRetries = 3) {
 
 app.post('/api/groq/validate-key', async (req, res) => {
   const clientKey = (req.body && req.body.apiKey || '').trim();
-  if (!clientKey) return res.status(400).json({ ok: false, error: 'No API key provided.' });
+  const groqKey = clientKey || process.env.GROQ_API_KEY || process.env.GROQ_KEY;
+  if (!groqKey) return res.status(400).json({ ok: false, error: 'No API key provided (client or server).' });
   try {
     const r = await fetch('https://api.groq.com/openai/v1/models', {
-      headers: { 'Authorization': 'Bearer ' + clientKey }
+      headers: { 'Authorization': 'Bearer ' + groqKey }
     });
     return res.json({ ok: r.ok });
   } catch (e) {