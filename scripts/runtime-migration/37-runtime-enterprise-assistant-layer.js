const fs = require("fs");
const path = require("path");

console.log(`
============================================================
TSM Runtime V2 Enterprise AI Assistant Layer Installation
============================================================
`);

const base = "html/shared/runtime/assistant";

const files = {

"assistant-engine.js": `
// TSM Enterprise Assistant Engine

module.exports = {

name: "enterprise-assistant",

process(input = {}) {

return {
query: input.query || "",
intent: input.intent || "unknown",
status: "analyzing"
};

}

};
`,

"intent-parser.js": `
// TSM Intent Parser

module.exports = {

parse(message = "") {

return {

intent:
message.includes("risk")
? "risk-analysis"
: message.includes("why")
? "explanation"
: "general-query",

message

};

}

};
`,

"conversation-memory.js": `
// TSM Conversation Memory

const memory = [];

module.exports = {

store(message){

memory.push({
message,
timestamp:new Date().toISOString()
});

},

history(){

return memory;

}

};
`,

"command-router.js": `
// TSM Command Router

module.exports = {

route(command){

return {

command,

destination:
"decision-runtime"

};

}

};
`,

"response-generator.js": `
// TSM Response Generator

module.exports = {

generate(data = {}) {

return {

summary:data.summary || "",
evidence:data.evidence || [],
recommendation:data.recommendation || null

};

}

};
`,

"context-manager.js": `
// TSM Context Manager

module.exports = {

build(context = {}) {

return {

domain:context.domain || "enterprise",

entities:context.entities || [],

session:
Date.now()

};

}

};
`,

"action-planner.js": `
// TSM Action Planner

module.exports = {

plan(decision = {}) {

return {

action:
decision.action || "review",

approvalRequired:true

};

}

};
`

};


if (!fs.existsSync(base)) {

fs.mkdirSync(base,{recursive:true});

}


for (const [file,content] of Object.entries(files)) {

const target = path.join(base,file);

if (!fs.existsSync(target)) {

fs.writeFileSync(target,content.trim());

console.log(`✓ ${target}`);

} else {

console.log(`✓ exists ${target}`);

}

}


console.log(`
Enterprise AI Assistant Layer Complete
`);
