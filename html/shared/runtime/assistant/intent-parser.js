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