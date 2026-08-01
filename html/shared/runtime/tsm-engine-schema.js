/*
=========================================================
TSM Universal Engine Schema & Validator
Version: 2.0
=========================================================
*/

window.TSMEngineSchema = (() => {

    const SCHEMA_DEFINITION = {
        engine: "",
        status: "complete",
        confidence: 0,
        summary: "",
        findings: [],
        risks: [],
        actions: [],
        needs: [],
        metrics: {}
    };

    function validate(rawOutput) {
        let parsed = rawOutput;

        // Parse if string
        if (typeof rawOutput === "string") {
            try {
                // Strip markdown code fences if present
                const cleaned = rawOutput.replace(/```json|```/g, "").trim();
                parsed = JSON.parse(cleaned);
            } catch (e) {
                throw new Error("TSMEngineSchema: Output is not valid JSON.");
            }
        }

        if (typeof parsed !== "object" || parsed === null) {
            throw new Error("TSMEngineSchema: Output must be an object.");
        }

        // Enforce strict limits and shape
        const normalized = {
            engine: String(parsed.engine || "unknown"),
            status: String(parsed.status || "complete"),
            confidence: Math.min(100, Math.max(0, Number(parsed.confidence) || 0)),
            summary: String(parsed.summary || "").slice(0, 250),
            findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 5).map(String) : [],
            risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 5).map(String) : [],
            actions: Array.isArray(parsed.actions) ? parsed.actions.slice(0, 5).map(String) : [],
            needs: Array.isArray(parsed.needs) ? parsed.needs.slice(0, 5).map(String) : [],
            metrics: (typeof parsed.metrics === "object" && parsed.metrics !== null) ? parsed.metrics : {}
        };

        return normalized;
    }

    function getSystemPromptBlock() {
        return `
Return ONLY valid JSON matching this exact structure:
{
  "engine": "string",
  "status": "complete",
  "confidence": 0-100,
  "summary": "under 40 words",
  "findings": ["max 5 bullets"],
  "risks": ["max 5 bullets"],
  "actions": ["max 5 bullets"],
  "needs": ["max 5 bullets"],
  "metrics": {}
}
Rules:
- Never write essays or produce paragraphs.
- Never explain reasoning unless requested via expand endpoint.
- Keep total response compact and optimized for executive dashboards.
`.trim();
    }

    return {
        validate,
        getSystemPromptBlock,
        SCHEMA_DEFINITION
    };

})();

// Auto-register globally
if (typeof module !== "undefined" && module.exports) {
    module.exports = window.TSMEngineSchema;
}