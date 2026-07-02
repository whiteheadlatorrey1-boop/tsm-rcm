
async function callAI(prompt) {
    try {
        const res = await fetch("https://tsm-shell.fly.dev/api/v1/bridge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [{ role: "user", content: prompt }]
            })
        });
        
const __tsmText = await res.text();
if (__tsmText.startsWith('<!DOCTYPE') || __tsmText.includes('<html')) {
  throw new Error('Backend returned HTML');
}
const data = JSON.parse(__tsmText);

        return data?.choices?.[0]?.message?.content || "No response from Strategist";
    } catch (err) {
        console.error("Bridge Error:", err);
        return "Connection Failed";
    }
}

console.log("TSM Bridge Active: Healthcare Node Linked.");
