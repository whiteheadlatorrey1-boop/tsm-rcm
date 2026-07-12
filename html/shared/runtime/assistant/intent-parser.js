// TSM Intent Parser

const __tsmImpl = {

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
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantIntentParser = __tsmImpl; }
