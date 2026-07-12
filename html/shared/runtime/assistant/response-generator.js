// TSM Response Generator

const __tsmImpl = {

generate(data = {}) {

return {

summary:data.summary || "",
evidence:data.evidence || [],
recommendation:data.recommendation || null

};

}

};
module.exports = __tsmImpl;
if (typeof window !== 'undefined') { window.TSMAssistantResponseGenerator = __tsmImpl; }
