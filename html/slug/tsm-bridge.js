
async function callAI(userPrompt) {
    const systemContext = `You are the Sovereign HC-Strategist for TSM Healthcare Command (v3.0). 
    Your mission: Audit the 10-node fleet (Medical, Pharmacy, Insurance, Financial, Legal, Vendors, Compliance, Billing, Tax Prep, Grants).
    Input detected from Refraction Ingestion Portal.
    Provide highly technical, CPT/HIPAA-aware audit syntheses. No conversational filler.`;

    try {
        const res = await fetch("https://tsm-shell.fly.dev/api/v1/bridge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "openai/gpt-oss-120b",
                messages: [
                    { role: "system", content: systemContext },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.1
            })
        });
        
const __tsmText = await res.text();
if (__tsmText.startsWith('<!DOCTYPE') || __tsmText.includes('<html')) {
  throw new Error('Backend returned HTML');
}
const data = JSON.parse(__tsmText);

        return data?.choices?.[0]?.message?.content || "ANALYSIS FAILED";
    } catch (e) {
        return "NETWORK ERROR: Strategist Unreachable.";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const relayBtn = document.querySelector(".btn-relay, #relay-btn") || 
                     Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("RELAY"));
    
    if (relayBtn) {
        relayBtn.onclick = async () => {
            const portalInput = document.querySelector("textarea, input")?.value || "Full fleet audit requested.";
            relayBtn.innerText = "ANALYZING...";
            
            const response = await callAI(portalInput);
            
            // Look for the specific synthesis panel from your screenshot
            const synthPanel = document.querySelector(".synthesis-output, #synthesis-panel");
            if(synthPanel) {
                synthPanel.innerText = response;
            } else {
                console.log("Response:", response);
                alert("STRATEGIST FEEDBACK RECEIVED (Check Console)");
            }
            relayBtn.innerText = "RELAY TO STRATEGIST";
        };
    }
});
