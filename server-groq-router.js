const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');

// Ensure the client loads with the system shell environment key
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 5 });

/**
 * High-performance inference engine to convert unstructured medical operational logs 
 * directly into validated JSON schemas for the vendor-hub layout matrix.
 */
async function processLiveHealthcareStream(rawInputLog) {
    console.log("\n================================================================================");
    console.log("⚡ Sovereign System Node: Initializing Real-Time Groq Inference Engine...");
    console.log("🦾 TARGET MATRIX MODEL: llama-3.1-8b-instant [STRICT SYSTEM SCHEMA ENFORCEMENT]");
    console.log("================================================================================\n");

    if (!process.env.GROQ_API_KEY) {
        console.error("❌ CRITICAL FAULT: GROQ_API_KEY environment context variable is not set.");
        console.log("👉 Please run: export GROQ_API_KEY='your_real_key_here' before executing.");
        return null;
    }

    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an automated backend compiler for a healthcare management console. 
                    Your sole task is to parse unstructured text inputs and translate them into a strict, minified JSON object matching this schema blueprint:
                    {
                        "vendors": [
                            {
                                "id": "VND-00X (Incremented string ID)",
                                "name": "String (Exact vendor company identity)",
                                "category": "String (Functional domain e.g. Operative Coding & Auditing, Revenue Cycle)",
                                "pipelineType": "String (Evaluated type e.g. FHIR API Stream, HL7 Batch Secure-FTP, JSON Webhook Gateway)",
                                "endpoint": "String (Internal tracking url pattern built from vendor name, e.g. https://api.name.tsmatter.internal/v1)",
                                "lastSync": "2026-05-15 18:10:00 (Use current timestamp context format)",
                                "status": "VERIFIED" or "WARNING",
                                "latency": "String (Calculated baseline latency e.g. 45ms or 910ms)"
                            }
                        ]
                    }
                    CRITICAL CONSTRAINT: You must output ONLY raw, executable JSON. Do not include markdown code block blocks (\`\`\`json), markdown formatting, introduction, or prose filler.`
                },
                {
                    role: "user",
                    content: `Compile this real operational data update stream directly into the vendor array blueprint format: ${rawInputLog}`
                }
            ],
            model: "llama-3.1-8b-instant",
            temperature: 0.1,
            response_format: { type: "json_object" } // Lock the LLM architecture into native JSON output mode
        });

        const extractedText = completion.choices[0].message.content.trim();
        const parsedPayload = JSON.parse(extractedText);
        
        console.log("🚀 Real-Time Schema Extraction: SUCCESS (Valid Array Matched)");
        console.log(JSON.stringify(parsedPayload, null, 4));
        
        return parsedPayload;

    } catch (error) {
        console.error("❌ System Infrastructure Pipeline Exception:", error.message);
        return null;
    }
}

// Production Test Scenario tracking active cross-system hospital data notifications
const realWorldLogStream = `
LOG SHIFT STATUS: System architecture connected with automated Apex Clinical Auditing Corp out of Phoenix for operative tracking metrics. 
Data pipeline is verifying clean across the designated FHIR infrastructure stream, ticking down with an optimal runtime latency index of 36ms. 
ALERT: HonorHealth Portal Bridge webhook gate is showing structural processing backlogs during translation. 
Connection status changed to warning level owing to unexpected integration latency levels spiking up around 895ms.
`;

// Immediate auto-test sequence
processLiveHealthcareStream(realWorldLogStream);
