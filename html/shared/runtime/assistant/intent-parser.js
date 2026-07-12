// TSM Intent Parser

const __tsmExport = {

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = __tsmExport;
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.intentParser = __tsmExport;
}
